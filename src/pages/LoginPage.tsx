import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input, Label, FieldError } from '@/components/ui/input'
import { loginSchema, type LoginInput } from '@/lib/validation'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/context/AppContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { session } = useApp()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (values: LoginInput) => {
    setFormError(null)
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      setFormError('E-Mail oder Passwort ist falsch.')
      return
    }
    navigate('/')
  }

  return (
    <AuthLayout title="Willkommen zurück" subtitle="Melde dich in deinem Portal an.">
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label htmlFor="email">E-Mail-Adresse</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div>
          <Label htmlFor="password">Passwort</Label>
          <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
          <FieldError>{errors.password?.message}</FieldError>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Anmelden…' : 'Anmelden'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Noch kein Konto?{' '}
        <Link to="/registrieren" className="font-medium text-brand-600 hover:text-brand-700">
          Jetzt registrieren
        </Link>
      </p>
    </AuthLayout>
  )
}
