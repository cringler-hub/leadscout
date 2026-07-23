import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useApp } from '@/context/AppContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea, FieldError } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { PageLoading } from '@/components/ui/empty-state'
import { searchProfileFormSchema, type SearchProfileFormInput } from '@/lib/validation'
import { updateAgentDetails } from '@/data/agents'
import { updateSearchProfile } from '@/data/searchProfiles'

function toCsv(values: string[]) {
  return values.join(', ')
}

export function LeadScoutConfigPage() {
  const { agent, searchProfile, loading, refresh } = useApp()
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SearchProfileFormInput>({
    resolver: zodResolver(searchProfileFormSchema),
    values: agent && searchProfile
      ? {
          agentName: agent.name,
          description: agent.description ?? '',
          isActive: agent.is_active,
          industries: toCsv(searchProfile.industries),
          regions: toCsv(searchProfile.regions),
          employeeMin: searchProfile.employee_min?.toString() ?? '',
          employeeMax: searchProfile.employee_max?.toString() ?? '',
          revenueMin: searchProfile.revenue_min?.toString() ?? '',
          companyTraits: toCsv(searchProfile.company_traits),
          buyingSignals: toCsv(searchProfile.buying_signals),
          exclusionCriteria: toCsv(searchProfile.exclusion_criteria),
          targetRoles: toCsv(searchProfile.target_roles),
          maxLeadsPerRun: searchProfile.max_leads_per_run.toString(),
          reportEmail: searchProfile.report_email ?? '',
          scheduleTime: searchProfile.schedule_time.slice(0, 5),
        }
      : undefined,
  })

  if (loading || !agent || !searchProfile) return <PageLoading />

  const isActive = watch('isActive')

  const onSubmit = async (values: SearchProfileFormInput) => {
    setSaved(false)
    await updateAgentDetails(agent.id, {
      name: values.agentName,
      description: values.description || null,
      isActive: values.isActive,
    })

    const csv = (value?: string) =>
      (value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

    await updateSearchProfile(searchProfile.id, {
      industries: csv(values.industries),
      regions: csv(values.regions),
      employeeMin: values.employeeMin ? Number(values.employeeMin) : null,
      employeeMax: values.employeeMax ? Number(values.employeeMax) : null,
      revenueMin: values.revenueMin ? Number(values.revenueMin) : null,
      companyTraits: csv(values.companyTraits),
      buyingSignals: csv(values.buyingSignals),
      exclusionCriteria: csv(values.exclusionCriteria),
      targetRoles: csv(values.targetRoles),
      maxLeadsPerRun: Number(values.maxLeadsPerRun),
      reportEmail: values.reportEmail || null,
      scheduleTime: values.scheduleTime,
    })

    await refresh()
    setSaved(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Stellenprofil</h1>
        <p className="mt-1 text-slate-500">Definiere, wonach dein Lead Scout suchen soll.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Grunddaten</CardTitle>
            <CardDescription>Name und Status des digitalen Mitarbeiters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="agentName">Name des Agenten</Label>
                <Input id="agentName" {...register('agentName')} />
                <FieldError>{errors.agentName?.message}</FieldError>
              </div>
              <div className="flex items-end justify-between rounded-lg border border-slate-200 px-3 py-2">
                <Label htmlFor="isActive" className="mb-0">
                  Agent aktiv
                </Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked) => setValue('isActive', checked)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea id="description" rows={2} {...register('description')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zielprofil</CardTitle>
            <CardDescription>Branchen, Regionen und Unternehmensgröße der Wunschkunden.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="industries">Zielbranchen</Label>
                <Input id="industries" placeholder="z. B. Maschinenbau, Automatisierung" {...register('industries')} />
              </div>
              <div>
                <Label htmlFor="regions">Zielregionen</Label>
                <Input id="regions" placeholder="z. B. Bayern, Baden-Württemberg" {...register('regions')} />
              </div>
              <div>
                <Label htmlFor="employeeMin">Minimale Mitarbeiterzahl</Label>
                <Input id="employeeMin" type="number" {...register('employeeMin')} />
              </div>
              <div>
                <Label htmlFor="employeeMax">Maximale Mitarbeiterzahl</Label>
                <Input id="employeeMax" type="number" {...register('employeeMax')} />
              </div>
              <div>
                <Label htmlFor="revenueMin">Minimale Umsatzgröße (€)</Label>
                <Input id="revenueMin" type="number" {...register('revenueMin')} />
              </div>
              <div>
                <Label htmlFor="targetRoles">Gewünschte Ansprechpartnerrolle</Label>
                <Input id="targetRoles" placeholder="z. B. Head of Sales, Geschäftsführung" {...register('targetRoles')} />
              </div>
            </div>
            <div>
              <Label htmlFor="companyTraits">Gewünschte Unternehmensmerkmale</Label>
              <Input id="companyTraits" placeholder="z. B. Internationale Expansion" {...register('companyTraits')} />
            </div>
            <div>
              <Label htmlFor="buyingSignals">Kaufsignale</Label>
              <Input id="buyingSignals" placeholder="z. B. Neue Niederlassung, offene Vertriebsstellen" {...register('buyingSignals')} />
            </div>
            <div>
              <Label htmlFor="exclusionCriteria">Ausschlusskriterien</Label>
              <Input id="exclusionCriteria" placeholder="z. B. Wettbewerber, Konzerngröße" {...register('exclusionCriteria')} />
            </div>
            <p className="text-xs text-slate-400">Mehrere Werte jeweils mit Komma trennen.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ausführung &amp; Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="maxLeadsPerRun">Max. Leads pro Lauf</Label>
                <Input id="maxLeadsPerRun" type="number" {...register('maxLeadsPerRun')} />
                <FieldError>{errors.maxLeadsPerRun?.message}</FieldError>
              </div>
              <div>
                <Label htmlFor="scheduleTime">Täglicher Lauf um</Label>
                <Input id="scheduleTime" type="time" {...register('scheduleTime')} />
              </div>
              <div>
                <Label htmlFor="reportEmail">Empfänger-E-Mail</Label>
                <Input id="reportEmail" type="email" {...register('reportEmail')} />
                <FieldError>{errors.reportEmail?.message}</FieldError>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Speichert…' : 'Stellenprofil speichern'}
          </Button>
          {saved && <span className="text-sm text-emerald-600">Gespeichert.</span>}
        </div>
      </form>
    </div>
  )
}
