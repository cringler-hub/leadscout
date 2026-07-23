import { isToday, isYesterday } from 'date-fns'
import { listAgentRuns } from '@/data/agentRuns'
import type { Database } from '@/lib/database.types'

type AgentRun = Database['public']['Tables']['agent_runs']['Row']

export interface DashboardStats {
  todayFound: number
  todayQualified: number
  foundDeltaPct: number | null
  qualifiedDeltaPct: number | null
  lastRun: AgentRun | null
  runs: AgentRun[]
}

function sum(runs: AgentRun[], key: 'leads_found' | 'leads_qualified') {
  return runs.reduce((total, run) => total + run[key], 0)
}

function deltaPct(today: number, yesterday: number): number | null {
  if (yesterday === 0) return null
  return Math.round(((today - yesterday) / yesterday) * 100)
}

export async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  const runs = await listAgentRuns(organizationId)

  const todayRuns = runs.filter((run) => isToday(new Date(run.started_at)))
  const yesterdayRuns = runs.filter((run) => isYesterday(new Date(run.started_at)))

  const todayFound = sum(todayRuns, 'leads_found')
  const todayQualified = sum(todayRuns, 'leads_qualified')
  const yesterdayFound = sum(yesterdayRuns, 'leads_found')
  const yesterdayQualified = sum(yesterdayRuns, 'leads_qualified')

  const lastRun = runs.find((run) => run.status !== 'running') ?? null

  return {
    todayFound,
    todayQualified,
    foundDeltaPct: deltaPct(todayFound, yesterdayFound),
    qualifiedDeltaPct: deltaPct(todayQualified, yesterdayQualified),
    lastRun,
    runs,
  }
}
