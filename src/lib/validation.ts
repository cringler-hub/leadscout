import { z } from 'zod'

// Komma-getrennte Eingabe → String-Array (leere Einträge werden entfernt).
export const csvListSchema = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )

export const registerSchema = z
  .object({
    organizationName: z.string().min(2, 'Bitte gib den Namen deines Unternehmens an.'),
    fullName: z.string().min(2, 'Bitte gib deinen Namen an.'),
    email: z.email('Bitte gib eine gültige E-Mail-Adresse an.'),
    password: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen haben.'),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Die Passwörter stimmen nicht überein.',
    path: ['passwordConfirm'],
  })

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.email('Bitte gib eine gültige E-Mail-Adresse an.'),
  password: z.string().min(1, 'Bitte gib dein Passwort ein.'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const searchProfileFormSchema = z.object({
  agentName: z.string().min(1, 'Bitte gib einen Namen an.'),
  description: z.string().optional(),
  isActive: z.boolean(),
  industries: z.string().optional(),
  regions: z.string().optional(),
  employeeMin: z.string().optional(),
  employeeMax: z.string().optional(),
  revenueMin: z.string().optional(),
  companyTraits: z.string().optional(),
  buyingSignals: z.string().optional(),
  exclusionCriteria: z.string().optional(),
  targetRoles: z.string().optional(),
  maxLeadsPerRun: z
    .string()
    .refine((value) => {
      const num = Number(value)
      return Number.isInteger(num) && num >= 1 && num <= 200
    }, 'Bitte gib einen Wert zwischen 1 und 200 an.'),
  reportEmail: z.email('Bitte gib eine gültige E-Mail-Adresse an.').optional().or(z.literal('')),
  scheduleTime: z.string().min(1),
})

export type SearchProfileFormInput = z.infer<typeof searchProfileFormSchema>

export const settingsFormSchema = z.object({
  organizationName: z.string().min(2, 'Bitte gib den Namen deines Unternehmens an.'),
  fullName: z.string().min(1, 'Bitte gib deinen Namen an.'),
  reportEmail: z.email('Bitte gib eine gültige E-Mail-Adresse an.').optional().or(z.literal('')),
  timezone: z.string().min(1),
  dailySendTime: z.string().min(1),
})

export type SettingsFormInput = z.infer<typeof settingsFormSchema>

export const leadFeedbackSchema = z.object({
  feedback: z.enum(['relevant', 'nicht_relevant']),
  comment: z.string().optional(),
})
