import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { LeadTable } from '@/components/leads/LeadTable'
import { PageLoading } from '@/components/ui/empty-state'
import { listLeads } from '@/data/leads'
import type { Database } from '@/lib/database.types'
import type { LeadStatus } from '@/lib/database.types'
import { cn } from '@/lib/utils'

type Lead = Database['public']['Tables']['leads']['Row']

const filters: { value: LeadStatus | 'alle'; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'neu', label: 'Neu' },
  { value: 'relevant', label: 'Relevant' },
  { value: 'nicht_relevant', label: 'Nicht relevant' },
  { value: 'ins_crm', label: 'Ins CRM übertragen' },
]

export function LeadsPage() {
  const { organization } = useApp()
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [filter, setFilter] = useState<LeadStatus | 'alle'>('alle')

  useEffect(() => {
    if (!organization) return
    listLeads(organization.id).then(setLeads)
  }, [organization])

  if (!leads) return <PageLoading />

  const filtered = filter === 'alle' ? leads : leads.filter((lead) => lead.status === filter)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Leads</h1>
        <p className="mt-1 text-slate-500">Alle vom Lead Scout gefundenen Zielkunden.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              filter === item.value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <LeadTable leads={filtered} />
        </CardContent>
      </Card>
    </div>
  )
}
