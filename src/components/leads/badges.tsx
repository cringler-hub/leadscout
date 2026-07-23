import { Badge } from '@/components/ui/badge'
import type { LeadStatus } from '@/lib/database.types'

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
