import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useApp } from '@/context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, FieldError } from '@/components/ui/input'
import { PageLoading } from '@/components/ui/empty-state'
import { settingsFormSchema, type SettingsFormInput } from '@/lib/validation'
import { updateOwnProfile, updateOrganizationSettings } from '@/data/profile'
import { updateSearchProfile } from '@/data/searchProfiles'

const timezones = ['Europe/Vienna', 'Europe/Berlin', 'Europe/Zurich', 'UTC']

export function SettingsPage() {
  const { organization, profile, searchProfile, loading, refresh, signOut } = useApp()
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormInput>({
    resolver: zodResolver(settingsFormSchema),
    values:
      organization && profile && searchProfile
        ? {
            organizationName: organization.name,
            fullName: profile.full_name ?? '',
            reportEmail: searchProfile.report_email ?? '',
            timezone: organization.timezone,
            dailySendTime: searchProfile.schedule_time.slice(0, 5),
          }
        : undefined,
  })

  if (loading || !organization || !profile || !searchProfile) return <PageLoading />

  const onSubmit = async (values: SettingsFormInput) => {
    setSaved(false)
    await Promise.all([
      updateOrganizationSettings(organization.id, {
        name: values.organizationName,
        timezone: values.timezone,
      }),
      updateOwnProfile(values.fullName),
      updateSearchProfile(searchProfile.id, {
        industries: searchProfile.industries,
        regions: searchProfile.regions,
        employeeMin: searchProfile.employee_min,
        employeeMax: searchProfile.employee_max,
        revenueMin: searchProfile.revenue_min,
        companyTraits: searchProfile.company_traits,
        buyingSignals: searchProfile.buying_signals,
        exclusionCriteria: searchProfile.exclusion_criteria,
        targetRoles: searchProfile.target_roles,
        maxLeadsPerRun: searchProfile.max_leads_per_run,
        reportEmail: values.reportEmail || null,
        scheduleTime: values.dailySendTime,
      }),
    ])
    await refresh()
    setSaved(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Einstellungen</h1>
        <p className="mt-1 text-slate-500">Unternehmens- und Kontoeinstellungen.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Unternehmen &amp; Konto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="organizationName">Unternehmensname</Label>
                <Input id="organizationName" {...register('organizationName')} />
                <FieldError>{errors.organizationName?.message}</FieldError>
              </div>
              <div>
                <Label htmlFor="fullName">Benutzername</Label>
                <Input id="fullName" {...register('fullName')} />
                <FieldError>{errors.fullName?.message}</FieldError>
              </div>
              <div>
                <Label htmlFor="reportEmail">Report-E-Mail</Label>
                <Input id="reportEmail" type="email" {...register('reportEmail')} />
                <FieldError>{errors.reportEmail?.message}</FieldError>
              </div>
              <div>
                <Label htmlFor="timezone">Zeitzone</Label>
                <select
                  id="timezone"
                  {...register('timezone')}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="dailySendTime">Tägliche Versandzeit</Label>
                <Input id="dailySendTime" type="time" {...register('dailySendTime')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Speichert…' : 'Speichern'}
          </Button>
          {saved && <span className="text-sm text-emerald-600">Gespeichert.</span>}
        </div>
      </form>

      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="font-medium text-slate-900">Abmelden</p>
            <p className="text-sm text-slate-500">Beendet deine aktuelle Sitzung.</p>
          </div>
          <Button variant="destructive" onClick={() => void signOut()}>
            Abmelden
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
