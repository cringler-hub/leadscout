// Wird ausschließlich serverseitig vom Portal aufgerufen (supabase.functions.invoke
// mit der Session des eingeloggten Nutzers). Legt einen agent_run an und startet
// entweder den echten n8n-Webhook (Secret verlässt nie den Browser) oder – falls
// kein n8n konfiguriert ist – erzeugt realistische Beispiel-Leads direkt hier.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'
import { generateStubLeads } from '../_shared/stubLeads.ts'
import { insertLeadsDeduped } from '../_shared/insertLeads.ts'

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Nicht angemeldet.' }, 401)
  }

  let body: { organizationId?: string; agentId?: string; searchProfileId?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body.' }, 400)
  }

  if (!body.organizationId || !body.agentId || !body.searchProfileId) {
    return jsonResponse({ error: 'organizationId, agentId und searchProfileId sind erforderlich.' }, 400)
  }

  // Client mit dem JWT des aufrufenden Nutzers, um die Identität zu prüfen.
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userResult, error: userError } = await userClient.auth.getUser()
  if (userError || !userResult.user) {
    return jsonResponse({ error: 'Nicht angemeldet.' }, 401)
  }

  const admin = createAdminClient()

  // organization_id wird serverseitig aus dem Profil abgeleitet, nicht aus dem
  // Client-Payload übernommen – verhindert Mandanten-Spoofing.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('user_id', userResult.user.id)
    .single()

  if (profileError || !profile || profile.organization_id !== body.organizationId) {
    return jsonResponse({ error: 'Kein Zugriff auf diese Organisation.' }, 403)
  }

  const organizationId = profile.organization_id

  const { data: agent, error: agentError } = await admin
    .from('agents')
    .select('*')
    .eq('id', body.agentId)
    .eq('organization_id', organizationId)
    .single()

  if (agentError || !agent) {
    return jsonResponse({ error: 'Agent nicht gefunden.' }, 404)
  }

  const { data: searchProfile, error: spError } = await admin
    .from('search_profiles')
    .select('*')
    .eq('id', body.searchProfileId)
    .eq('organization_id', organizationId)
    .single()

  if (spError || !searchProfile) {
    return jsonResponse({ error: 'Stellenprofil nicht gefunden.' }, 404)
  }

  const { data: run, error: runError } = await admin
    .from('agent_runs')
    .insert({
      organization_id: organizationId,
      agent_id: agent.id,
      search_profile_id: searchProfile.id,
      status: 'running',
    })
    .select('*')
    .single()

  if (runError || !run) {
    return jsonResponse({ error: 'Lauf konnte nicht angelegt werden.' }, 500)
  }

  await admin.from('agents').update({ status: 'running' }).eq('id', agent.id)

  const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL')
  const n8nWebhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET')

  if (n8nWebhookUrl) {
    try {
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${n8nWebhookSecret ?? ''}`,
        },
        body: JSON.stringify({
          organizationId,
          agentId: agent.id,
          searchProfileId: searchProfile.id,
          runId: run.id,
          profile: {
            industries: searchProfile.industries,
            regions: searchProfile.regions,
            employeeMin: searchProfile.employee_min,
            employeeMax: searchProfile.employee_max,
            revenueMin: searchProfile.revenue_min,
            buyingSignals: searchProfile.buying_signals,
            exclusionCriteria: searchProfile.exclusion_criteria,
            targetRoles: searchProfile.target_roles,
            maxLeadsPerRun: searchProfile.max_leads_per_run,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`n8n antwortete mit Status ${response.status}`)
      }

      return jsonResponse({ runId: run.id, status: 'running' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler beim Aufruf von n8n.'
      await admin
        .from('agent_runs')
        .update({ status: 'error', completed_at: new Date().toISOString(), error_message: message })
        .eq('id', run.id)
      await admin.from('agents').update({ status: 'error' }).eq('id', agent.id)
      return jsonResponse({ error: message }, 502)
    }
  }

  // Kein n8n konfiguriert: realistische Beispiel-Leads direkt erzeugen, damit
  // das Portal von Anfang an end-to-end funktioniert.
  try {
    const stubLeads = generateStubLeads({
      industries: searchProfile.industries,
      regions: searchProfile.regions,
      targetRoles: searchProfile.target_roles,
      buyingSignals: searchProfile.buying_signals,
      maxLeadsPerRun: searchProfile.max_leads_per_run,
    })

    const { inserted, qualified } = await insertLeadsDeduped(
      admin,
      organizationId,
      agent.id,
      searchProfile.id,
      stubLeads,
    )

    await admin
      .from('agent_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        leads_found: inserted,
        leads_qualified: qualified,
        n8n_execution_id: `stub-${run.id}`,
      })
      .eq('id', run.id)

    await admin.from('agents').update({ status: 'done' }).eq('id', agent.id)

    return jsonResponse({ runId: run.id, status: 'completed' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler.'
    await admin
      .from('agent_runs')
      .update({ status: 'error', completed_at: new Date().toISOString(), error_message: message })
      .eq('id', run.id)
    await admin.from('agents').update({ status: 'error' }).eq('id', agent.id)
    return jsonResponse({ error: message }, 500)
  }
})
