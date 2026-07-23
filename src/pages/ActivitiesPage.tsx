import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoading, EmptyState } from '@/components/ui/empty-state'
import { listAgentRuns } from '@/data/agentRuns'
import { formatDateTime } from '@/lib/format'
import type { Database } from '@/lib/database.types'

type AgentRun = Database['public']['Tables']['agent_runs']['Row']

const statusVariant = {
  running: 'brand',
  completed: 'success',
  error: 'danger',
} as const

const statusLabel = {
  running: 'Läuft',
  completed: 'Abgeschlossen',
  error: 'Fehler',
} as const

export function ActivitiesPage() {
  const { organization } = useApp()
  const [runs, setRuns] = useState<AgentRun[] | null>(null)

  useEffect(() => {
    if (!organization) return
    listAgentRuns(organization.id).then(setRuns)
  }, [organization])

  if (!runs) return <PageLoading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Aktivitäten</h1>
        <p className="mt-1 text-slate-500">Verlauf aller Läufe deines Lead Scouts.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {runs.length === 0 ? (
            <EmptyState title="Noch keine Läufe" description="Starte den Lead Scout im Dashboard." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-3 font-medium">Start</th>
                    <th className="pb-3 font-medium">Ende</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Gefunden</th>
                    <th className="pb-3 font-medium">Qualifiziert</th>
                    <th className="pb-3 font-medium">n8n Execution ID</th>
                    <th className="pb-3 font-medium">Fehler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td className="py-3 pr-4 text-slate-600">{formatDateTime(run.started_at)}</td>
                      <td className="py-3 pr-4 text-slate-600">
                        {run.completed_at ? formatDateTime(run.completed_at) : '–'}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusVariant[run.status]}>{statusLabel[run.status]}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{run.leads_found}</td>
                      <td className="py-3 pr-4 text-slate-600">{run.leads_qualified}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-500">
                        {run.n8n_execution_id ?? '–'}
                      </td>
                      <td className="py-3 pr-4 text-red-600">{run.error_message ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
