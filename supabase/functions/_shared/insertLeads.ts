import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface IncomingLead {
  companyName: string
  website?: string | null
  industry?: string | null
  location?: string | null
  employeeCount?: number | null
  estimatedRevenue?: number | null
  leadScore?: number | null
  scoreDetails?: Record<string, number>
  reasoning?: string | null
  buyingSignals?: string[]
  recommendedRole?: string | null
  conversationTrigger?: string | null
  sourceUrls?: string[]
}

const QUALIFIED_SCORE_THRESHOLD = 70

// Fügt Leads ein und überspringt dabei möglichst Duplikate (gleiche Website
// innerhalb der Organisation). Gibt zurück, wie viele Leads tatsächlich neu
// angelegt wurden und wie viele davon als "qualifiziert" gelten.
export async function insertLeadsDeduped(
  admin: SupabaseClient,
  organizationId: string,
  agentId: string,
  searchProfileId: string | null,
  incomingLeads: IncomingLead[],
) {
  const websites = incomingLeads
    .map((lead) => lead.website?.toLowerCase())
    .filter((website): website is string => Boolean(website))

  const existingWebsites = new Set<string>()
  if (websites.length > 0) {
    const { data: existing, error } = await admin
      .from('leads')
      .select('website')
      .eq('organization_id', organizationId)
      .in('website', websites)

    if (error) throw error
    for (const row of existing ?? []) {
      if (row.website) existingWebsites.add(row.website.toLowerCase())
    }
  }

  let inserted = 0
  let qualified = 0

  for (const lead of incomingLeads) {
    const websiteKey = lead.website?.toLowerCase()
    if (websiteKey && existingWebsites.has(websiteKey)) continue

    const { error } = await admin.from('leads').insert({
      organization_id: organizationId,
      agent_id: agentId,
      search_profile_id: searchProfileId,
      company_name: lead.companyName,
      website: lead.website ?? null,
      industry: lead.industry ?? null,
      location: lead.location ?? null,
      employee_count: lead.employeeCount ?? null,
      estimated_revenue: lead.estimatedRevenue ?? null,
      lead_score: lead.leadScore ?? null,
      score_details: lead.scoreDetails ?? {},
      reasoning: lead.reasoning ?? null,
      buying_signals: lead.buyingSignals ?? [],
      recommended_role: lead.recommendedRole ?? null,
      conversation_trigger: lead.conversationTrigger ?? null,
      source_urls: lead.sourceUrls ?? [],
    })

    if (error) throw error

    inserted += 1
    if ((lead.leadScore ?? 0) >= QUALIFIED_SCORE_THRESHOLD) qualified += 1
    if (websiteKey) existingWebsites.add(websiteKey)
  }

  return { inserted, qualified }
}
