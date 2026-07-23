import { supabase } from '@/lib/supabase'

export async function getSearchProfileByAgent(agentId: string) {
  const { data, error } = await supabase
    .from('search_profiles')
    .select('*')
    .eq('agent_id', agentId)
    .single()

  if (error) throw error
  return data
}

export interface SearchProfileUpdateValues {
  industries: string[]
  regions: string[]
  employeeMin: number | null
  employeeMax: number | null
  revenueMin: number | null
  companyTraits: string[]
  buyingSignals: string[]
  exclusionCriteria: string[]
  targetRoles: string[]
  maxLeadsPerRun: number
  reportEmail: string | null
  scheduleTime: string
}

export async function updateSearchProfile(
  searchProfileId: string,
  values: SearchProfileUpdateValues,
) {
  const { error } = await supabase
    .from('search_profiles')
    .update({
      industries: values.industries,
      regions: values.regions,
      employee_min: values.employeeMin,
      employee_max: values.employeeMax,
      revenue_min: values.revenueMin,
      company_traits: values.companyTraits,
      buying_signals: values.buyingSignals,
      exclusion_criteria: values.exclusionCriteria,
      target_roles: values.targetRoles,
      max_leads_per_run: values.maxLeadsPerRun,
      report_email: values.reportEmail,
      schedule_time: values.scheduleTime,
    })
    .eq('id', searchProfileId)

  if (error) throw error
}
