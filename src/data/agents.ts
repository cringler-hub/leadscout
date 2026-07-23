import { supabase } from '@/lib/supabase'
import type { AgentStatus } from '@/lib/database.types'

// Für den MVP gibt es genau einen Agenten pro Organisation: den Lead Scout.
export async function getLeadScoutAgent(organizationId: string) {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('agent_type', 'lead_scout')
    .single()

  if (error) throw error
  return data
}

export async function updateAgentStatus(agentId: string, status: AgentStatus) {
  const { error } = await supabase.from('agents').update({ status }).eq('id', agentId)
  if (error) throw error
}

export async function updateAgentDetails(
  agentId: string,
  values: { name: string; description: string | null; isActive: boolean },
) {
  const { error } = await supabase
    .from('agents')
    .update({
      name: values.name,
      description: values.description,
      is_active: values.isActive,
    })
    .eq('id', agentId)

  if (error) throw error
}
