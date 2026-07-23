import { CheckCircle2, PlayCircle, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateTime } from '@/lib/format'
import type { ActivityItem } from '@/data/activity'

const iconByKind = {
  run_started: <PlayCircle className="h-5 w-5 text-brand-600" />,
  run_completed: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  run_error: <XCircle className="h-5 w-5 text-red-600" />,
  feedback: null,
}

function icon(item: ActivityItem) {
  if (item.kind === 'feedback') {
    return item.title.includes('nicht relevant') ? (
      <ThumbsDown className="h-5 w-5 text-slate-400" />
    ) : (
      <ThumbsUp className="h-5 w-5 text-emerald-600" />
    )
  }
  return iconByKind[item.kind]
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <EmptyState title="Noch keine Aktivitäten" description="Starte den Lead Scout, um loszulegen." />
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-3">
          <div className="mt-0.5">{icon(item)}</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">{item.title}</p>
            <p className="text-xs text-slate-500">{formatDateTime(item.timestamp)}</p>
          </div>
          <p className="max-w-[45%] text-right text-xs text-slate-500">{item.detail}</p>
        </li>
      ))}
    </ul>
  )
}
