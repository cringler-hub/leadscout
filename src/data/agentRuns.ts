import { supabase } from '@/lib/supabase'

export async function listAgentRuns(organizationId: string) {
  const { data, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('started_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getLatestAgentRun(agentId: string) {
  const { data, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('agent_id', agentId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

interface TriggerResult {
  runId: string
  status: string
}

// Ruft die Supabase Edge Function auf, die den Lauf serverseitig startet
// (entweder über den echten n8n-Webhook oder – falls kein n8n konfiguriert
// ist – über realistische Beispiel-Leads). Das Secret verlässt nie den Server.
export async function triggerLeadScout(params: {
  organizationId: string
  agentId: string
  searchProfileId: string
}): Promise<TriggerResult> {
  const { data, error } = await supabase.functions.invoke<TriggerResult>('trigger-lead-scout', {
    body: {
      organizationId: params.organizationId,
      agentId: params.agentId,
      searchProfileId: params.searchProfileId,
    },
  })

  if (error) throw error
  if (!data) throw new Error('Keine Antwort vom Lead Scout erhalten.')
  return data
}
