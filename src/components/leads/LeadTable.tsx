import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import type { Database } from '@/lib/database.types'
import { LeadSourceBadge, LeadStatusBadge, ScoreBadge } from '@/components/leads/badges'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

type Lead = Database['public']['Tables']['leads']['Row']

type SortField = 'created_at' | 'lead_score'
type SortDirection = 'asc' | 'desc'

export function LeadTable({ leads, showStatus = true }: { leads: Lead[]; showStatus?: boolean }) {
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const sortedLeads = useMemo(() => {
    const factor = sortDirection === 'asc' ? 1 : -1
    return [...leads].sort((a, b) => {
      if (sortField === 'created_at') {
        return factor * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      }
      return factor * ((a.lead_score ?? -1) - (b.lead_score ?? -1))
    })
  }, [leads, sortField, sortDirection])

  if (leads.length === 0) {
    return <EmptyState title="Noch keine Leads" description="Starte den Lead Scout, um Zielkunden zu finden." />
  }

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-3 font-medium">Unternehmen</th>
            <th className="pb-3 font-medium">Branche</th>
            <th className="pb-3 font-medium">Mitarbeiter</th>
            <SortableHeader label="Score" field="lead_score" activeField={sortField} direction={sortDirection} onSort={toggleSort} />
            <th className="pb-3 font-medium">Grund</th>
            <th className="pb-3 font-medium">Quelle</th>
            <SortableHeader label="Erstellt" field="created_at" activeField={sortField} direction={sortDirection} onSort={toggleSort} />
            {showStatus && <th className="pb-3 font-medium">Status</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedLeads.map((lead) => {
            const reasonText = lead.conversation_trigger ?? lead.reasoning ?? '–'
            const isLong = reasonText.length > 80
            const isExpanded = expandedIds.has(lead.id)

            return (
              <tr key={lead.id} className="align-top">
                <td className="py-3 pr-4">
                  <Link to={`/leads/${lead.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                    {lead.company_name}
                  </Link>
                  {lead.location && <p className="text-xs text-slate-500">{lead.location}</p>}
                </td>
                <td className="py-3 pr-4 text-slate-600">{lead.industry ?? '–'}</td>
                <td className="py-3 pr-4 text-slate-600">{lead.employee_count ?? '–'}</td>
                <td className="py-3 pr-4">
                  <ScoreBadge score={lead.lead_score} />
                </td>
                <td className="py-3 pr-4 max-w-xs text-slate-600">
                  <p className={cn(!isExpanded && isLong && 'line-clamp-2')}>{reasonText}</p>
                  {isLong && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(lead.id)}
                      className="mt-1 flex items-center gap-0.5 text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      {isExpanded ? (
                        <>
                          Weniger <ChevronUp className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          Mehr <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <LeadSourceBadge source={lead.source} />
                </td>
                <td className="py-3 pr-4 whitespace-nowrap text-slate-600">{formatDateTime(lead.created_at)}</td>
                {showStatus && (
                  <td className="py-3 pr-4">
                    <LeadStatusBadge status={lead.status} />
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SortableHeader({
  label,
  field,
  activeField,
  direction,
  onSort,
}: {
  label: string
  field: SortField
  activeField: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
}) {
  const isActive = field === activeField

  return (
    <th className="pb-3 font-medium">
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          'flex items-center gap-1 uppercase tracking-wide',
          isActive ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600',
        )}
      >
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3" />
        )}
      </button>
    </th>
  )
}
