import { supabase } from '@/lib/supabase'

interface SyncResult {
  scanned: number
  inserted: number
}

// Ruft die Supabase Edge Function auf, die erkannte Website-Besuche von
// SalesViewer abholt und als zusätzliche Leads (Quelle "salesviewer") anlegt.
export async function syncSalesviewerVisitors(organizationId: string): Promise<SyncResult> {
  const { data, error } = await supabase.functions.invoke<SyncResult>('sync-salesviewer-visitors', {
    body: { organizationId },
  })

  if (error) throw error
  if (!data) throw new Error('Keine Antwort erhalten.')
  return data
}
