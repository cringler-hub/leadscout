import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input, Label, FieldError } from '@/components/ui/input'
import { registerSchema, type RegisterInput } from '@/lib/validation'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'

export function RegisterPage() {
  const navigate = useNavigate()
  const { session, refresh } = useApp()
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmationPending, setConfirmationPending] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (values: RegisterInput) => {
    setFormError(null)

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.fullName } },
    })

    if (error) {
      setFormError(
        error.message.includes('already registered')
          ? 'Für diese E-Mail-Adresse existiert bereits ein Konto.'
          : 'Registrierung fehlgeschlagen. Bitte versuche es erneut.',
      )
      return
    }

    if (!data.session) {
      // Supabase-Projekt verlangt eine E-Mail-Bestätigung.
      setConfirmationPending(true)
      return
    }

    const { error: rpcError } = await supabase.rpc('create_organization_and_profile', {
      p_org_name: values.organizationName,
      p_full_name: values.fullName,
    })

    if (rpcError) {
      setFormError('Organisation konnte nicht angelegt werden: ' + rpcError.message)
      return
    }

    await refresh()
    navigate('/')
  }

  if (confirmationPending) {
    return (
      <AuthLayout title="Fast geschafft">
        <p className="text-sm text-slate-600">
          Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte bestätige deine Adresse und melde
          dich anschließend an – die Einrichtung deines Unternehmens holen wir direkt danach nach.
        </p>
        <Link to="/login" className="mt-6 block text-center text-sm font-medium text-brand-600">
          Zur Anmeldung
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Konto erstellen" subtitle="Richte dein Unternehmensportal ein.">
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
        <div>
          <Label htmlFor="email">E-Mail-Adresse</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="password">Passwort</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          <FieldError>{errors.password?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="passwordConfirm">Passwort bestätigen</Label>
          <Input id="passwordConfirm" type="password" autoComplete="new-password" {...register('passwordConfirm')} />
          <FieldError>{errors.passwordConfirm?.message}</FieldError>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Wird erstellt…' : 'Konto erstellen'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Bereits registriert?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Anmelden
        </Link>
      </p>
    </AuthLayout>
  )
}
