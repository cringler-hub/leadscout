import { Badge } from '@/components/ui/badge'
import type { LeadSource, LeadStatus } from '@/lib/database.types'

const sourceLabels: Record<LeadSource, string> = {
  lead_scout: 'Lead Scout',
  salesviewer: 'Website-Besuch',
}

export function LeadSourceBadge({ source }: { source: LeadSource }) {
  return <Badge variant={source === 'salesviewer' ? 'neutral' : 'brand'}>{sourceLabels[source]}</Badge>
}

const statusLabels: Record<LeadStatus, { label: string; variant: 'neutral' | 'success' | 'danger' | 'brand' }> = {
  neu: { label: 'Neu', variant: 'neutral' },
  relevant: { label: 'Relevant', variant: 'success' },
  nicht_relevant: { label: 'Nicht relevant', variant: 'danger' },
  ins_crm: { label: 'Ins CRM übertragen', variant: 'brand' },
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const config = statusLabels[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-400">–</span>
  const variant = score >= 80 ? 'success' : score >= 60 ? 'brand' : 'neutral'
  return <Badge variant={variant}>{score}</Badge>
}
