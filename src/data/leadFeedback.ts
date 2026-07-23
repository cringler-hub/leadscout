import { supabase } from '@/lib/supabase'
import type { FeedbackValue } from '@/lib/database.types'
import { updateLeadStatus } from '@/data/leads'

export async function submitLeadFeedback(params: {
  organizationId: string
  leadId: string
  feedback: FeedbackValue
  comment?: string
}) {
  const { data: userResult } = await supabase.auth.getUser()
  const userId = userResult.user?.id
  if (!userId) throw new Error('Nicht angemeldet.')

  const { error } = await supabase.from('lead_feedback').insert({
    organization_id: params.organizationId,
    lead_id: params.leadId,
    user_id: userId,
    feedback: params.feedback,
    comment: params.comment,
  })

  if (error) throw error

  await updateLeadStatus(params.leadId, params.feedback)
}
