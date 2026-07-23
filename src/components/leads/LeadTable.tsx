import { Link } from 'react-router-dom'
import type { Database } from '@/lib/database.types'
import { LeadStatusBadge, ScoreBadge } from '@/components/leads/badges'
import { EmptyState } from '@/components/ui/empty-state'

type Lead = Database['public']['Tables']['leads']['Row']

export function LeadTable({ leads, showStatus = true }: { leads: Lead[]; showStatus?: boolean }) {
  if (leads.length === 0) {
    return <EmptyState title="Noch keine Leads" description="Starte den Lead Scout, um Zielkunden zu finden." />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-3 font-medium">Unternehmen</th>
            <th className="pb-3 font-medium">Branche</th>
            <th className="pb-3 font-medium">Mitarbeiter</th>
            <th className="pb-3 font-medium">Score</th>
            <th className="pb-3 font-medium">Grund</th>
            {showStatus && <th className="pb-3 font-medium">Status</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((lead) => (
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
              <td className="py-3 pr-4 max-w-xs text-slate-600">{lead.conversation_trigger ?? lead.reasoning ?? '–'}</td>
              {showStatus && (
                <td className="py-3 pr-4">
                  <LeadStatusBadge status={lead.status} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
