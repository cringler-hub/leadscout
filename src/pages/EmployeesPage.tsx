import { Link } from 'react-router-dom'
import { Bot, ArrowRight } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { StatusIndicator } from '@/components/ui/status-dot'
import { PageLoading } from '@/components/ui/empty-state'

export function EmployeesPage() {
  const { agent, loading } = useApp()

  if (loading || !agent) return <PageLoading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Digitale Mitarbeiter</h1>
        <p className="mt-1 text-slate-500">Alle digitalen Mitarbeiter in deinem Unternehmen.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/lead-scout">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Bot className="h-6 w-6" />
                </div>
                <StatusIndicator status={agent.status} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {agent.description || 'Sucht regelmäßig nach passenden B2B-Zielkunden.'}
                </p>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-brand-600">
                Stellenprofil öffnen <ArrowRight className="h-4 w-4" />
              </span>
            </CardContent>
          </Card>
        </Link>

        <Card className="flex h-full items-center justify-center border-dashed p-6 text-center text-sm text-slate-400">
          Weitere digitale Mitarbeiter folgen in Kürze.
        </Card>
      </div>
    </div>
  )
}
