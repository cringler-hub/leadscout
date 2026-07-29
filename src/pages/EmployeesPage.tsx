import { Link } from 'react-router-dom'
import { Bot, ArrowRight } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { StatusIndicator } from '@/components/ui/status-dot'
import { PageLoading } from '@/components/ui/empty-state'
import { CollapsibleText } from '@/components/ui/collapsible-text'

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
        <Card className="h-full transition-shadow hover:shadow-md">
          <CardContent className="flex h-full flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Bot className="h-6 w-6" />
              </div>
              <StatusIndicator status={agent.status} />
            </div>
            <div className="min-w-0 flex-1">
              <Link to="/lead-scout" className="font-semibold text-slate-900 hover:text-brand-600">
                {agent.name}
              </Link>
              <CollapsibleText
                className="mt-1 text-sm leading-relaxed text-slate-500"
                text={agent.description || 'Sucht regelmäßig nach passenden B2B-Zielkunden.'}
              />
            </div>
            <Link
              to="/lead-scout"
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Stellenprofil öffnen <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="flex h-full items-center justify-center border-dashed p-6 text-center text-sm text-slate-400">
          Weitere digitale Mitarbeiter folgen in Kürze.
        </Card>
      </div>
    </div>
  )
}
