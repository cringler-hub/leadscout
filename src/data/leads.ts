import { supabase } from '@/lib/supabase'
import type { LeadStatus } from '@/lib/database.types'

export async function listLeads(organizationId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getLeadById(leadId: string) {
  const { data, error } = await supabase.from('leads').select('*').eq('id', leadId).single()
  if (error) throw error
  return data
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const { error } = await supabase.from('leads').update({ status }).eq('id', leadId)
  if (error) throw error
}

export function isToday(isoDate: string) {
  const date = new Date(isoDate)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}
