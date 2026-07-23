// Wird von n8n aufgerufen, sobald ein Lauf abgeschlossen ist. Abgesichert über
// ein statisches Secret (kein Nutzer-Login), da der Aufrufer n8n selbst ist.
import { z } from 'npm:zod@3'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'
import { insertLeadsDeduped } from '../_shared/insertLeads.ts'

const leadSchema = z.object({
  companyName: z.string().min(1),
  website: z.string().url().optional().nullable(),
  industry: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  employeeCount: z.number().int().nonnegative().optional().nullable(),
  estimatedRevenue: z.number().nonnegative().optional().nullable(),
  leadScore: z.number().min(0).max(100).optional().nullable(),
  scoreDetails: z.record(z.string(), z.number()).optional(),
  reasoning: z.string().optional().nullable(),
  buyingSignals: z.array(z.string()).optional(),
  recommendedRole: z.string().optional().nullable(),
  conversationTrigger: z.string().optional().nullable(),
  sourceUrls: z.array(z.string()).optional(),
})

const callbackSchema = z.object({
  runId: z.string().uuid(),
  organizationId: z.string().uuid(),
  agentId: z.string().uuid(),
  searchProfileId: z.string().uuid().optional().nullable(),
  executionId: z.string(),
  status: z.enum(['completed', 'error']),
  errorMessage: z.string().optional(),
  leads: z.array(leadSchema).default([]),
})

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const expectedSecret = Deno.env.get('LEAD_SCOUT_CALLBACK_SECRET')
  const providedSecret = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return jsonResponse({ error: 'Ungültiges oder fehlendes Secret.' }, 401)
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body.' }, 400)
  }

  const parsed = callbackSchema.safeParse(rawBody)
  if (!parsed.success) {
    return jsonResponse({ error: 'Payload-Validierung fehlgeschlagen.', details: parsed.error.flatten() }, 400)
  }

  const payload = parsed.data
  const admin = createAdminClient()

  const { data: run, error: runError } = await admin
    .from('agent_runs')
    .select('*')
    .eq('id', payload.runId)
    .eq('organization_id', payload.organizationId)
    .eq('agent_id', payload.agentId)
    .single()

  if (runError || !run) {
    return jsonResponse({ error: 'Zugehöriger Lauf wurde nicht gefunden.' }, 404)
  }

  if (payload.status === 'error') {
    await admin
      .from('agent_runs')
      .update({
        status: 'error',
        completed_at: new Date().toISOString(),
        n8n_execution_id: payload.executionId,
        error_message: payload.errorMessage ?? 'n8n meldete einen Fehler.',
      })
      .eq('id', run.id)
    await admin.from('agents').update({ status: 'error' }).eq('id', payload.agentId)
    return jsonResponse({ ok: true })
  }

  try {
    const { inserted, qualified } = await insertLeadsDeduped(
      admin,
      payload.organizationId,
      payload.agentId,
      payload.searchProfileId ?? run.search_profile_id,
      payload.leads,
    )

    await admin
      .from('agent_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        leads_found: inserted,
        leads_qualified: qualified,
        n8n_execution_id: payload.executionId,
      })
      .eq('id', run.id)

    await admin.from('agents').update({ status: 'done' }).eq('id', payload.agentId)

    return jsonResponse({ ok: true, inserted, qualified })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler beim Speichern der Leads.'
    await admin
      .from('agent_runs')
      .update({ status: 'error', completed_at: new Date().toISOString(), error_message: message })
      .eq('id', run.id)
    await admin.from('agents').update({ status: 'error' }).eq('id', payload.agentId)
    return jsonResponse({ error: message }, 500)
  }
})
