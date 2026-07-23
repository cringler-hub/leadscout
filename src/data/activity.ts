import { supabase } from '@/lib/supabase'

export type ActivityKind = 'run_started' | 'run_completed' | 'run_error' | 'feedback'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  title: string
  detail: string
  timestamp: string
}

export async function getRecentActivity(organizationId: string, limit = 5): Promise<ActivityItem[]> {
  const [{ data: runs, error: runsError }, { data: feedback, error: feedbackError }] =
    await Promise.all([
      supabase
        .from('agent_runs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('started_at', { ascending: false })
        .limit(limit),
      supabase
        .from('lead_feedback')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ])

  if (runsError) throw runsError
  if (feedbackError) throw feedbackError

  const leadIds = [...new Set((feedback ?? []).map((f) => f.lead_id))]
  const leadNameById = new Map<string, string>()
  if (leadIds.length > 0) {
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, company_name')
      .in('id', leadIds)
    if (leadsError) throw leadsError
    for (const lead of leads ?? []) leadNameById.set(lead.id, lead.company_name)
  }

  const items: ActivityItem[] = []

  for (const run of runs ?? []) {
    items.push({
      id: `${run.id}-started`,
      kind: 'run_started',
      title: 'Lauf gestartet',
      detail: `${run.leads_found} Leads gefunden, ${run.leads_qualified} qualifiziert`,
      timestamp: run.started_at,
    })
    if (run.status === 'completed' && run.completed_at) {
      items.push({
        id: `${run.id}-completed`,
        kind: 'run_completed',
        title: 'Lauf abgeschlossen',
        detail: `${run.leads_found} Leads gefunden, ${run.leads_qualified} qualifiziert`,
        timestamp: run.completed_at,
      })
    }
    if (run.status === 'error' && run.completed_at) {
      items.push({
        id: `${run.id}-error`,
        kind: 'run_error',
        title: 'Lauf fehlgeschlagen',
        detail: run.error_message ?? 'Unbekannter Fehler',
        timestamp: run.completed_at,
      })
    }
  }

  for (const entry of feedback ?? []) {
    items.push({
      id: entry.id,
      kind: 'feedback',
      title:
        entry.feedback === 'relevant'
          ? 'Lead als relevant markiert'
          : 'Lead als nicht relevant markiert',
      detail: leadNameById.get(entry.lead_id) ?? 'Unbekannter Lead',
      timestamp: entry.created_at,
    })
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}
