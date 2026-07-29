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
  street?: string | null
  zip?: string | null
  city?: string | null
  email?: string | null
  phone?: string | null
  countyCode?: string | null
  isCustomer?: boolean
  isFavorite?: boolean
  isCompetitor?: boolean
  sector?: { name?: string | null } | null
}

interface SalesViewerVisit {
  url?: string
  startedAt?: string
  lastActivityAt?: string
  duration_secs?: number
  numEvents?: number
  refererSource?: string | null
  refererMedium?: string | null
  refererTerm?: string | null
}

interface SalesViewerSession {
  guid: string
  startedAt: string
  lastActivityAt?: string
  duration_secs?: number
  language?: string | null
  company?: SalesViewerCompany | null
  visits?: SalesViewerVisit[]
}

interface SalesViewerSessionsResponse {
  result: SalesViewerSession[]
}

const visitDateFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Vienna',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatVisitDate(iso: string) {
  return `${visitDateFormatter.format(new Date(iso))} Uhr`
}

// Baut aus Straße/PLZ/Stadt/Land eine möglichst vollständige Standortangabe,
// fällt auf einzelne Teile zurück, falls SalesViewer nicht alles kennt.
function formatLocation(company: SalesViewerCompany): string | null {
  const parts = [company.street, [company.zip, company.city].filter(Boolean).join(' ')].filter(
    (part): part is string => Boolean(part && part.trim()),
  )
  if (parts.length === 0) return null
  const address = parts.join(', ')
  return company.countyCode && company.countyCode !== 'DE' ? `${address} (${company.countyCode})` : address
}

function describeReferrer(visit: SalesViewerVisit): string | null {
  if (!visit.refererSource && !visit.refererMedium) return null
  const via = [visit.refererMedium, visit.refererSource].filter(Boolean).join(': ')
  return visit.refererTerm ? `${via}, Suchbegriff "${visit.refererTerm}"` : via
}

function mapSessionToLead(session: SalesViewerSession): IncomingLead | null {
  const company = session.company
  if (!company?.name || company.isCustomer || company.isCompetitor) return null

  const visits = session.visits ?? []
  const totalEvents = visits.reduce((sum, v) => sum + (v.numEvents ?? 0), 0)
  const visitedUrls = visits.map((v) => v.url).filter((u): u is string => Boolean(u))

  const firstVisit = formatVisitDate(session.startedAt)
  const lastVisit = session.lastActivityAt ? formatVisitDate(session.lastActivityAt) : null
  const visitTiming =
    lastVisit && lastVisit !== firstVisit
      ? `zwischen ${firstVisit} und ${lastVisit}`
      : `am ${firstVisit}`

  const reasoningParts = [
    `Hat die Website ${visitTiming} besucht (${visits.length || 1} Seitenaufruf(e), ${totalEvents} Interaktionen).`,
  ]

  const referrer = visits.map(describeReferrer).find((r) => r !== null)
  if (referrer) reasoningParts.push(`Gekommen über: ${referrer}.`)

  const contact = [company.email, company.phone].filter(Boolean).join(' · ')
  if (contact) reasoningParts.push(`Kontakt: ${contact}.`)

  if (company.isFavorite) reasoningParts.push('Bereits als Favorit in SalesViewer markiert.')

  return {
    companyName: company.name,
    website: company.url ?? null,
    industry: company.sector?.name ?? null,
    location: formatLocation(company) ?? company.city ?? null,
    reasoning: reasoningParts.join(' '),
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
    url.searchParams.set('from', '-10 days')
    url.searchParams.set('pageSize', '100')
    url.searchParams.set('includeCompany', 'true')
    url.searchParams.set('includeCompanySector', 'true')
    url.searchParams.set('includeVisits', 'true')

    const accountId = Deno.env.get('SALESVIEWER_ACCOUNT_ID')
    const headers: Record<string, string> = { 'X-SV-APIKEY': apiKey }
    if (accountId) headers['X-SV-ACCOUNTID'] = accountId

    const response = await fetch(url, { headers })

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      throw new Error(`SalesViewer antwortete mit Status ${response.status}: ${bodyText.slice(0, 300)}`)
    }

    const responseBody: SalesViewerSessionsResponse = await response.json()
    const sessions = responseBody.result ?? []
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
