import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  SearchCheck,
  ListChecks,
  Activity,
  Settings,
  Bot,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/context/AppContext'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/mitarbeiter', label: 'Digitale Mitarbeiter', icon: Users },
  { to: '/lead-scout', label: 'Lead Scout', icon: SearchCheck },
  { to: '/leads', label: 'Leads', icon: ListChecks },
  { to: '/aktivitaeten', label: 'Aktivitäten', icon: Activity },
  { to: '/einstellungen', label: 'Einstellungen', icon: Settings },
]

export function Sidebar() {
  const { organization, profile, signOut } = useApp()

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Bot className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold text-slate-900">LeadScout</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="truncate px-3 text-sm font-medium text-slate-900">
          {profile?.full_name || profile?.email}
        </p>
        <p className="truncate px-3 text-xs text-slate-500">{organization?.name}</p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>
    </aside>
  )
}
