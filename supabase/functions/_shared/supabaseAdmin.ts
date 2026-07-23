import { createClient } from 'npm:@supabase/supabase-js@2'

// Service-Role-Client: läuft ausschließlich serverseitig in der Edge Function,
// umgeht RLS bewusst (organization_id wird vorher explizit verifiziert).
export function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY sind nicht gesetzt.')
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
