import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { LeadTable } from '@/components/leads/LeadTable'
import { PageLoading } from '@/components/ui/empty-state'
import { listLeads } from '@/data/leads'
import { syncSalesviewerVisitors } from '@/data/salesviewer'
import type { Database } from '@/lib/database.types'
import type { LeadSource, LeadStatus } from '@/lib/database.types'
import { cn } from '@/lib/utils'

type Lead = Database['public']['Tables']['leads']['Row']

const statusFilters: { value: LeadStatus | 'alle'; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'neu', label: 'Neu' },
  { value: 'relevant', label: 'Relevant' },
  { value: 'nicht_relevant', label: 'Nicht relevant' },
  { value: 'ins_crm', label: 'Ins CRM übertragen' },
]

const sourceFilters: { value: LeadSource | 'alle'; label: string }[] = [
  { value: 'alle', label: 'Alle Quellen' },
  { value: 'lead_scout', label: 'Automatisch generiert (Lead Scout)' },
  { value: 'salesviewer', label: 'Website-Besuche' },
]

export function LeadsPage() {
  const { organization } = useApp()
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'alle'>('alle')
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'alle'>('alle')
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const loadLeads = async () => {
    if (!organization) return
    const result = await listLeads(organization.id)
    setLeads(result)
  }

  useEffect(() => {
    void loadLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization])

  if (!leads) return <PageLoading />

  const filtered = leads
    .filter((lead) => statusFilter === 'alle' || lead.status === statusFilter)
    .filter((lead) => sourceFilter === 'alle' || lead.source === sourceFilter)

  const handleSyncSalesviewer = async () => {
    if (!organization) return
    setSyncing(true)
    setSyncMessage(null)
    try {
      const result = await syncSalesviewerVisitors(organization.id)
      setSyncMessage(`${result.inserted} neue Leads aus ${result.scanned} Website-Besuchen.`)
      await loadLeads()
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Abruf fehlgeschlagen.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Leads</h1>
          <p className="mt-1 text-slate-500">Alle gefundenen Zielkunden – vom Lead Scout und aus Website-Besuchen.</p>
        </div>
        <div className="text-right">
          <Button variant="secondary" onClick={() => void handleSyncSalesviewer()} disabled={syncing}>
            <RefreshCw className="h-4 w-4" />
            {syncing ? 'Wird abgerufen…' : 'Website-Besuche abrufen'}
          </Button>
          {syncMessage && <p className="mt-1 text-xs text-slate-500">{syncMessage}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Status:</span>
          {statusFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatusFilter(item.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                statusFilter === item.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Quelle:</span>
          {sourceFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSourceFilter(item.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                sourceFilter === item.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <LeadTable leads={filtered} />
        </CardContent>
      </Card>
    </div>
  )
}
