// Holt erkannte Website-Besucher von SalesViewer (sessions.json) und legt sie
// als zusätzliche Leads an (Quelle "salesviewer"), neben den vom Lead Scout
// recherchierten Leads. Wird vom eingeloggten Nutzer aus dem Portal
// aufgerufen (JWT-Prüfung bleibt aktiv, im Unterschied zum n8n-Callback).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCorsPreflight, jsonResponse } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'
import { insertLeadsDeduped, type IncomingLead } from '../_shared/insertLeads.ts'

interface SalesViewerCompany {
  name?: string | null
  url?: string | null
  city?: string | null
  email?: string | null
  phone?: string | null
  isCustomer?: boolean
  isCompetitor?: boolean
  sector?: { name?: string | null } | null
}

interface SalesViewerVisit {
  url?: string
  duration_secs?: number
  numEvents?: number
}

interface SalesViewerSession {
  guid: string
  startedAt: string
  duration_secs?: number
  company?: SalesViewerCompany | null
  visits?: SalesViewerVisit[]
}

function mapSessionToLead(session: SalesViewerSession): IncomingLead | null {
  const company = session.company
  if (!company?.name || company.isCustomer) return null

  const totalEvents = (session.visits ?? []).reduce((sum, v) => sum + (v.numEvents ?? 0), 0)
  const visitedUrls = (session.visits ?? []).map((v) => v.url).filter((u): u is string => Boolean(u))

  return {
    companyName: company.name,
    website: company.url ?? null,
    industry: company.sector?.name ?? null,
    location: company.city ?? null,
    reasoning: `Hat die Website besucht (${session.visits?.length ?? 1} Seitenaufruf(e), ${totalEvents} Interaktionen).`,
    buyingSignals: ['Website-Besuch'],
    sourceUrls: visitedUrls,
  }
}

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

  let body: { organizationId?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Ungültiger Request-Body.' }, 400)
  }

  if (!body.organizationId) {
    return jsonResponse({ error: 'organizationId ist erforderlich.' }, 400)
  }

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userResult, error: userError } = await userClient.auth.getUser()
  if (userError || !userResult.user) {
    return jsonResponse({ error: 'Nicht angemeldet.' }, 401)
  }

  const admin = createAdminClient()

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('user_id', userResult.user.id)
    .single()

  if (profileError || !profile || profile.organization_id !== body.organizationId) {
    return jsonResponse({ error: 'Kein Zugriff auf diese Organisation.' }, 403)
  }

  const apiKey = Deno.env.get('SALESVIEWER_API_KEY')
  if (!apiKey) {
    return jsonResponse({ error: 'SALESVIEWER_API_KEY ist nicht gesetzt.' }, 500)
  }

  try {
    const url = new URL('https://api.salesviewer.com/sessions.json')
    url.searchParams.set('from', '-7 days')
    url.searchParams.set('pageSize', '100')

    const response = await fetch(url, {
      headers: { 'X-SV-APIKEY': apiKey },
    })

    if (!response.ok) {
      throw new Error(`SalesViewer antwortete mit Status ${response.status}`)
    }

    const sessions: SalesViewerSession[] = await response.json()
    const leads = sessions
      .map(mapSessionToLead)
      .filter((lead): lead is IncomingLead => lead !== null)

    const { inserted } = await insertLeadsDeduped(
      admin,
      profile.organization_id,
      null,
      null,
      leads,
      'salesviewer',
    )

    return jsonResponse({ scanned: sessions.length, inserted })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler beim Abruf von SalesViewer.'
    return jsonResponse({ error: message }, 502)
  }
})
