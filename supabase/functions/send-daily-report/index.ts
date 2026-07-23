// Verschickt den täglichen Lead-Scout-Report per Resend. Für den MVP manuell
// oder per API-Aufruf auslösbar (siehe README) – ein Supabase Cron Job kann
// diese Function später automatisch täglich aufrufen.
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'

interface LeadRow {
  company_name: string
  lead_score: number | null
  reasoning: string | null
}

function renderEmailHtml(params: {
  fullName: string | null
  leadsCount: number
  topLeads: LeadRow[]
  appUrl: string
}) {
  const greeting = params.fullName ? `Hallo ${params.fullName},` : 'Hallo,'
  const topLeadsHtml = params.topLeads
    .map(
      (lead) => `
        <li style="margin-bottom:12px;">
          <strong>${lead.company_name}</strong> — Score ${lead.lead_score ?? '–'}<br />
          <span style="color:#6b7280;font-size:14px;">${lead.reasoning ?? ''}</span>
        </li>`,
    )
    .join('')

  return `
    <div style="font-family:system-ui,sans-serif;color:#111827;max-width:560px;margin:0 auto;">
      <p>${greeting}</p>
      <p>dein Lead Scout hat heute <strong>${params.leadsCount} neue Zielkunden</strong> gefunden.</p>
      <p style="font-weight:600;margin-bottom:8px;">Top-Leads:</p>
      <ul style="padding-left:20px;">${topLeadsHtml}</ul>
      <p>
        <a href="${params.appUrl}" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#5a37f5;color:#fff;border-radius:8px;text-decoration:none;">
          Ergebnisse im Portal ansehen
        </a>
      </p>
    </div>
  `
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const expectedSecret = Deno.env.get('REPORT_TRIGGER_SECRET')
  const providedSecret = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return jsonResponse({ error: 'Ungültiges oder fehlendes Secret.' }, 401)
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const reportFromAddress = Deno.env.get('REPORT_FROM_ADDRESS') ?? 'LeadScout <onboarding@resend.dev>'
  const appUrl = Deno.env.get('APP_URL') ?? 'https://www.ringler-online.com/leadscout'

  if (!resendApiKey) {
    return jsonResponse({ error: 'RESEND_API_KEY ist nicht gesetzt.' }, 500)
  }

  const admin = createAdminClient()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const { data: searchProfiles, error: spError } = await admin
    .from('search_profiles')
    .select('organization_id, report_email')
    .not('report_email', 'is', null)

  if (spError) {
    return jsonResponse({ error: spError.message }, 500)
  }

  const results: { organizationId: string; sent: boolean; reason?: string }[] = []

  for (const sp of searchProfiles ?? []) {
    if (!sp.report_email) continue

    const { data: leads, error: leadsError } = await admin
      .from('leads')
      .select('company_name, lead_score, reasoning')
      .eq('organization_id', sp.organization_id)
      .gte('created_at', startOfToday.toISOString())
      .order('lead_score', { ascending: false })

    if (leadsError || !leads || leads.length === 0) {
      results.push({ organizationId: sp.organization_id, sent: false, reason: 'Keine neuen Leads heute.' })
      continue
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('organization_id', sp.organization_id)
      .limit(1)
      .maybeSingle()

    const html = renderEmailHtml({
      fullName: profile?.full_name ?? null,
      leadsCount: leads.length,
      topLeads: leads.slice(0, 3),
      appUrl,
    })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: reportFromAddress,
        to: [sp.report_email],
        subject: 'Lead Scout hat heute neue Zielkunden gefunden',
        html,
      }),
    })

    results.push({ organizationId: sp.organization_id, sent: response.ok, reason: response.ok ? undefined : await response.text() })
  }

  return jsonResponse({ results })
})
