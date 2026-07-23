import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getOwnProfile } from '@/data/profile'
import { getLeadScoutAgent } from '@/data/agents'
import { getSearchProfileByAgent } from '@/data/searchProfiles'
import type { Database } from '@/lib/database.types'

type Organization = Database['public']['Tables']['organizations']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']
type Agent = Database['public']['Tables']['agents']['Row']
type SearchProfile = Database['public']['Tables']['search_profiles']['Row']

interface AppContextValue {
  session: Session | null
  profile: Profile | null
  organization: Organization | null
  agent: Agent | null
  searchProfile: SearchProfile | null
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [agent, setAgent] = useState<Agent | null>(null)
  const [searchProfile, setSearchProfile] = useState<SearchProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadTenantData = useCallback(async () => {
    try {
      const { profile: p, organization: org } = await getOwnProfile()
      setProfile(p)
      setOrganization(org)

      const agentRow = await getLeadScoutAgent(org.id)
      setAgent(agentRow)

      const searchProfileRow = await getSearchProfileByAgent(agentRow.id)
      setSearchProfile(searchProfileRow)
    } catch {
      // Kein Profil vorhanden (z.B. direkt nach signUp, bevor die Organisation
      // angelegt wurde) – RegisterPage kümmert sich in diesem Fall darum.
      setProfile(null)
      setOrganization(null)
      setAgent(null)
      setSearchProfile(null)
    }
  }, [])

  // Prüft die Supabase-Session direkt (nicht den React-State), damit refresh()
  // auch unmittelbar nach signUp()/RPC-Aufrufen zuverlässig funktioniert, bevor
  // der onAuthStateChange-Listener den lokalen State aktualisiert hat.
  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      await loadTenantData()
    }
  }, [loadTenantData])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) {
        await loadTenantData()
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        await loadTenantData()
      } else {
        setProfile(null)
        setOrganization(null)
        setAgent(null)
        setSearchProfile(null)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadTenantData])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({ session, profile, organization, agent, searchProfile, loading, refresh, signOut }),
    [session, profile, organization, agent, searchProfile, loading, refresh, signOut],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp muss innerhalb von AppProvider verwendet werden.')
  return ctx
}
