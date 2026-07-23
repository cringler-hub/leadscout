import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Calendar, Clock, Play, Pencil, Square } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { StatusIndicator } from '@/components/ui/status-dot'
import type { Database } from '@/lib/database.types'
import { formatDateTime, nextRunLabel } from '@/lib/format'
import type { DashboardStats } from '@/data/dashboardStats'

type Agent = Database['public']['Tables']['agents']['Row']
type SearchProfile = Database['public']['Tables']['search_profiles']['Row']

export function LeadScoutCard({
  agent,
  searchProfile,
  stats,
  onStart,
  onCancel,
}: {
  agent: Agent
  searchProfile: SearchProfile
  stats: DashboardStats
  onStart: () => Promise<void>
  onCancel: () => Promise<void>
}) {
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const isRunning = agent.status === 'running'

  const handleStart = async () => {
    setStarting(true)
    try {
      await onStart()
    } finally {
      setStarting(false)
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await onCancel()
    } finally {
      setCancelling(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Bot className="h-8 w-8" />
            </div>
            <div>
              <StatusIndicator status={agent.status} />
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">{agent.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {agent.description || 'Dein digitaler Mitarbeiter für die Suche nach passenden Zielkunden.'}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void handleStart()} disabled={starting || isRunning}>
              <Play className="h-4 w-4" />
              {isRunning ? 'Arbeitet gerade…' : starting ? 'Wird gestartet…' : 'Jetzt arbeiten lassen'}
            </Button>
            {isRunning && (
              <Button variant="destructive" onClick={() => void handleCancel()} disabled={cancelling}>
                <Square className="h-4 w-4" />
                {cancelling ? 'Wird abgebrochen…' : 'Lauf abbrechen'}
              </Button>
            )}
            <Link to="/lead-scout" className={buttonVariants({ variant: 'secondary' })}>
              <Pencil className="h-4 w-4" />
              Stellenprofil bearbeiten
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-slate-100 pt-5 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
          <StatBlock label="Heute gefundene Leads" value={stats.todayFound} deltaPct={stats.foundDeltaPct} />
          <StatBlock label="Qualifizierte Leads" value={stats.todayQualified} deltaPct={stats.qualifiedDeltaPct} />
        </div>

        <div className="flex flex-col gap-5 border-t border-slate-100 pt-5 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
          <InfoBlock
            icon={<Calendar className="h-4 w-4" />}
            label="Letzter Lauf"
            value={stats.lastRun ? formatDateTime(stats.lastRun.started_at) : 'Noch kein Lauf'}
          />
          <InfoBlock
            icon={<Clock className="h-4 w-4" />}
            label="Nächster Lauf"
            value={agent.is_active ? nextRunLabel(searchProfile.schedule_time) : 'Agent inaktiv'}
          />
        </div>
      </div>
    </Card>
  )
}

function StatBlock({ label, value, deltaPct }: { label: string; value: number; deltaPct: number | null }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      {deltaPct !== null && (
        <p className={deltaPct >= 0 ? 'text-sm text-emerald-600' : 'text-sm text-red-600'}>
          {deltaPct >= 0 ? '+' : ''}
          {deltaPct}% zu gestern
        </p>
      )}
    </div>
  )
}

function InfoBlock({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
}
