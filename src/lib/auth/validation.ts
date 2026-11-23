import { z } from 'zod'

/**
 * Password strength calculation:
 * Returns score 0-4 and descriptive label.
 */
export function calculatePasswordStrength(password: string): {
  score: number
  label: 'Weak' | 'Fair' | 'Good' | 'Strong'
  hints: string[]
} {
  const hints: string[] = []
  if (password.length < 10) hints.push('Use at least 10 characters')
  if (!/[A-Z]/.test(password)) hints.push('Add an uppercase letter')
  if (!/[a-z]/.test(password)) hints.push('Add a lowercase letter')
  if (!/[0-9]/.test(password)) hints.push('Add a number')
  if (!/[^A-Za-z0-9]/.test(password)) hints.push('Add a special character')

  let score = 0
  if (password.length >= 10) score++
  if (password.length >= 14) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++

  // Any password under 10 chars is always Weak
  if (password.length < 10) {
    return {
      score: Math.min(score, 1),
      label: 'Weak',
      hints,
    }
  }

  const labels: ('Weak' | 'Fair' | 'Good' | 'Strong')[] = ['Weak', 'Weak', 'Fair', 'Good', 'Strong']
  return {
    score,
    label: labels[score] ?? 'Weak',
    hints,
  }
}

export const signupSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').trim(),
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(10, 'Password must be at least 10 characters long'),
})

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(10, 'Password must be at least 10 characters long'),
  confirmPassword: z.string().min(10, 'Password confirmation must be at least 10 characters long'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const deleteAccountSchema = z.object({
  confirmationEmail: z.string().email().trim().toLowerCase(),
})

// Onboarding schemas
export const onboardingStep1Schema = z.object({
  fullName: z.string().min(1, 'Full name is required').trim(),
  countryResidence: z.string().optional(),
  nationalities: z.array(z.string()).min(1, 'Select at least one nationality'),
  dob: z.string().optional(),
})

export const onboardingStep2Schema = z.object({
  currentLevel: z.enum(['highschool', 'diploma', 'bachelor', 'master', 'phd']).optional(),
  highestCompleted: z.enum(['highschool', 'diploma', 'bachelor', 'master', 'phd'], {
    message: 'Highest completed qualification is required for eligibility matching',
  }),
  institution: z.string().optional(),
  field: z.string().min(1, 'At least one field is required for matching'),
  specialization: z.string().optional(),
  gradeValue: z.number().min(0).optional(),
  gradeScale: z.enum(['4', '5', '10', '100']).optional(),
  expectedGraduation: z.string().optional(),
})

export const onboardingStep3Schema = z.object({
  studyLevels: z.array(z.string()).default([]),
  fields: z.array(z.string()).min(1, 'Select at least one field of study'),
  countries: z.array(z.string()).default([]),
  oppTypes: z.array(z.string()).default([]),
  fundingNeed: z.enum(['full', 'partial', 'tuition_only', 'self'], {
    message: 'Funding need is required for eligibility matching',
  }),
  relocate: z.boolean().default(true),
  formats: z.array(z.string()).default([]),
})

export const onboardingStep4Schema = z.object({
  skills: z.array(z.string()).default([]),
  researchInterests: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  extracurriculars: z.array(z.string()).default([]),
})

export const onboardingStep5Schema = z.object({
  canPayFees: z.boolean().default(false),
  canPayTravel: z.boolean().default(false),
  canPayLiving: z.boolean().default(false),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
