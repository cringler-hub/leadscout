import { cn } from '@/lib/utils'
import type { AgentStatus } from '@/lib/database.types'

const statusConfig: Record<AgentStatus, { label: string; dot: string; text: string }> = {
  idle: { label: 'Aktiv', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  running: { label: 'Arbeitet', dot: 'bg-brand-500 animate-pulse', text: 'text-brand-700' },
  done: { label: 'Fertig', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  error: { label: 'Fehler', dot: 'bg-red-500', text: 'text-red-700' },
}

export function StatusIndicator({ status }: { status: AgentStatus }) {
  const config = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium', config.text)}>
      <span className={cn('h-2 w-2 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
