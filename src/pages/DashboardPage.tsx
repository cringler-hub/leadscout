import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { LeadScoutCard } from '@/components/dashboard/LeadScoutCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { LeadTable } from '@/components/leads/LeadTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLoading } from '@/components/ui/empty-state'
import { getDashboardStats, type DashboardStats } from '@/data/dashboardStats'
import { getRecentActivity, type ActivityItem } from '@/data/activity'
import { listLeads } from '@/data/leads'
import { triggerLeadScout } from '@/data/agentRuns'
import type { Database } from '@/lib/database.types'

type Lead = Database['public']['Tables']['leads']['Row']

export function DashboardPage() {
  const { organization, agent, searchProfile, refresh } = useApp()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!organization) return
    const [statsResult, activityResult, leads] = await Promise.all([
      getDashboardStats(organization.id),
      getRecentActivity(organization.id),
      listLeads(organization.id),
    ])
    setStats(statsResult)
    setActivity(activityResult)
    setRecentLeads(leads.slice(0, 5))
    setLoading(false)
  }, [organization])

  useEffect(() => {
    void loadData()
  }, [loadData])

  if (loading || !organization || !agent || !searchProfile || !stats) return <PageLoading />

  const handleStart = async () => {
    try {
      await triggerLeadScout({
        organizationId: organization.id,
        agentId: agent.id,
        searchProfileId: searchProfile.id,
      })
    } finally {
      await loadData()
      await refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-500">Übersicht deiner digitalen Mitarbeiter und Ergebnisse</p>
      </div>

      <LeadScoutCard agent={agent} searchProfile={searchProfile} stats={stats} onStart={handleStart} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Neue Leads heute</CardTitle>
            <Link to="/leads" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Alle Leads anzeigen
            </Link>
          </CardHeader>
          <CardContent>
            <LeadTable leads={recentLeads} showStatus={false} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Aktivitäten</CardTitle>
            <Link to="/aktivitaeten" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Alle anzeigen
            </Link>
          </CardHeader>
          <CardContent>
            <ActivityFeed items={activity} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
