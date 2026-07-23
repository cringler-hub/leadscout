import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoading } from '@/components/ui/empty-state'
import { LeadStatusBadge, ScoreBadge } from '@/components/leads/badges'
import { getLeadById, updateLeadStatus } from '@/data/leads'
import { submitLeadFeedback } from '@/data/leadFeedback'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format'
import type { Database } from '@/lib/database.types'

type Lead = Database['public']['Tables']['leads']['Row']

const scoreLabels: Record<string, string> = {
  industryFit: 'Branchen-Fit',
  companySizeFit: 'Unternehmensgröße',
  regionFit: 'Region',
  buyingSignalFit: 'Kaufsignale',
  needFit: 'Bedarfs-Fit',
  contactability: 'Erreichbarkeit',
}

export function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const navigate = useNavigate()
  const { organization } = useApp()
  const [lead, setLead] = useState<Lead | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!leadId) return
    getLeadById(leadId).then(setLead)
  }, [leadId])

  if (!lead || !organization) return <PageLoading />

  const handleFeedback = async (feedback: 'relevant' | 'nicht_relevant') => {
    setSubmitting(true)
    try {
      await submitLeadFeedback({ organizationId: organization.id, leadId: lead.id, feedback })
      setLead({ ...lead, status: feedback })
    } finally {
      setSubmitting(false)
    }
  }

  const handleTransferToCrm = async () => {
    setSubmitting(true)
    try {
      await updateLeadStatus(lead.id, 'ins_crm')
      setLead({ ...lead, status: 'ins_crm' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/leads')}
        className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück zu den Leads
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{lead.company_name}</h1>
            <LeadStatusBadge status={lead.status} />
          </div>
          <p className="mt-1 text-slate-500">
            {[lead.industry, lead.location].filter(Boolean).join(' · ') || '—'}
          </p>
          {lead.website && (
            <a
              href={lead.website}
              target="_blank"
              rel="noreferrer"
              className="mt-1 flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
            >
              {lead.website} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={submitting} onClick={() => void handleFeedback('nicht_relevant')}>
            Nicht relevant
          </Button>
          <Button disabled={submitting} onClick={() => void handleFeedback('relevant')}>
            Relevant
          </Button>
          <Button variant="secondary" disabled={submitting} onClick={() => void handleTransferToCrm()}>
            Ins CRM übertragen
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Begründung des Lead Scout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-700">{lead.reasoning ?? 'Keine Begründung hinterlegt.'}</p>
              {lead.conversation_trigger && (
                <div>
                  <p className="text-sm font-medium text-slate-900">Empfohlener Gesprächsanlass</p>
                  <p className="text-sm text-slate-600">{lead.conversation_trigger}</p>
                </div>
              )}
              {lead.buying_signals.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-900">Erkannte Kaufsignale</p>
                  <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
                    {lead.buying_signals.map((signal) => (
                      <li key={signal}>{signal}</li>
                    ))}
                  </ul>
                </div>
              )}
              {lead.recommended_role && (
                <div>
                  <p className="text-sm font-medium text-slate-900">Empfohlene Ansprechpartnerrolle</p>
                  <p className="text-sm text-slate-600">{lead.recommended_role}</p>
                </div>
              )}
              {lead.source_urls.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-900">Quellen</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {lead.source_urls.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-700">
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Gesamt</span>
                <ScoreBadge score={lead.lead_score} />
              </div>
              {Object.entries(lead.score_details).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{scoreLabels[key] ?? key}</span>
                    <span>{value}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-brand-500"
                      style={{ width: `${Math.min(100, ((value as number) / 25) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unternehmensinformationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <InfoRow label="Mitarbeiterzahl" value={formatNumber(lead.employee_count)} />
              <InfoRow label="Geschätzter Umsatz" value={formatCurrency(lead.estimated_revenue)} />
              <InfoRow label="Gefunden am" value={formatDateTime(lead.created_at)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  )
}
