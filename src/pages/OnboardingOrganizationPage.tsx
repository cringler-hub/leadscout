import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input, Label, FieldError } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'

const schema = z.object({
  organizationName: z.string().min(2, 'Bitte gib den Namen deines Unternehmens an.'),
  fullName: z.string().min(2, 'Bitte gib deinen Namen an.'),
})

type FormValues = z.infer<typeof schema>

export function OnboardingOrganizationPage() {
  const navigate = useNavigate()
  const { session, profile, loading, refresh } = useApp()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: session?.user.user_metadata.full_name ?? '' },
  })

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  if (profile) return <Navigate to="/" replace />

  const onSubmit = async (values: FormValues) => {
    setFormError(null)
    const { error } = await supabase.rpc('create_organization_and_profile', {
      p_org_name: values.organizationName,
      p_full_name: values.fullName,
    })

    if (error) {
      setFormError('Organisation konnte nicht angelegt werden: ' + error.message)
      return
    }

    await refresh()
    navigate('/')
  }

  return (
    <AuthLayout title="Unternehmen einrichten" subtitle="Letzter Schritt, bevor es losgeht.">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label htmlFor="organizationName">Unternehmen</Label>
          <Input id="organizationName" {...register('organizationName')} />
          <FieldError>{errors.organizationName?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="fullName">Dein Name</Label>
          <Input id="fullName" {...register('fullName')} />
          <FieldError>{errors.fullName?.message}</FieldError>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Wird eingerichtet…' : 'Portal einrichten'}
        </Button>
      </form>
    </AuthLayout>
  )
}
