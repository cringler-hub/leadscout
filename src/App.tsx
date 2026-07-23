import { HashRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from '@/context/AppContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { OnboardingOrganizationPage } from '@/pages/OnboardingOrganizationPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { LeadScoutConfigPage } from '@/pages/LeadScoutConfigPage'
import { LeadsPage } from '@/pages/LeadsPage'
import { LeadDetailPage } from '@/pages/LeadDetailPage'
import { ActivitiesPage } from '@/pages/ActivitiesPage'
import { SettingsPage } from '@/pages/SettingsPage'

function App() {
  return (
    <HashRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registrieren" element={<RegisterPage />} />
          <Route path="/registrieren/unternehmen" element={<OnboardingOrganizationPage />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/mitarbeiter" element={<EmployeesPage />} />
            <Route path="/lead-scout" element={<LeadScoutConfigPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/leads/:leadId" element={<LeadDetailPage />} />
            <Route path="/aktivitaeten" element={<ActivitiesPage />} />
            <Route path="/einstellungen" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AppProvider>
    </HashRouter>
  )
}

export default App
