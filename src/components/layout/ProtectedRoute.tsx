import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useApp } from '@/context/AppContext'
import { PageLoading } from '@/components/ui/empty-state'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useApp()

  if (loading) return <PageLoading />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/registrieren/unternehmen" replace />

  return <>{children}</>
}
