import { supabase } from '@/lib/supabase'

export async function getOwnProfile() {
  const { data: userResult } = await supabase.auth.getUser()
  const userId = userResult.user?.id
  if (!userId) throw new Error('Nicht angemeldet.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (profileError) throw profileError

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .single()

  if (orgError) throw orgError

  return { profile, organization }
}

export async function updateOwnProfile(fullName: string) {
  const { data: userResult } = await supabase.auth.getUser()
  const userId = userResult.user?.id
  if (!userId) throw new Error('Nicht angemeldet.')

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('user_id', userId)

  if (error) throw error
}

export async function updateOrganizationSettings(
  organizationId: string,
  values: { name: string; timezone: string },
) {
  const { error } = await supabase
    .from('organizations')
    .update({ name: values.name, timezone: values.timezone })
    .eq('id', organizationId)

  if (error) throw error
}
