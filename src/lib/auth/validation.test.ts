import { describe, it, expect } from 'vitest'
import {
  calculatePasswordStrength,
  signupSchema,
  resetPasswordSchema,
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
} from './validation'

describe('Password strength & validation', () => {
  it('identifies weak passwords under 10 chars', () => {
    const res = calculatePasswordStrength('Short1!')
    expect(res.label).toBe('Weak')
    expect(res.hints).toContain('Use at least 10 characters')
  })

  it('rejects passwords under 10 chars in signupSchema', () => {
    const res = signupSchema.safeParse({
      fullName: 'Test User',
      email: 'user@example.com',
      password: 'short',
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.issues[0].message).toContain('at least 10 characters')
    }
  })

  it('accepts valid 10+ character passwords', () => {
    const res = signupSchema.safeParse({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'SecurePassword123!',
    })
    expect(res.success).toBe(true)
  })

  it('validates password matching on resetPasswordSchema', () => {
    const mismatch = resetPasswordSchema.safeParse({
      password: 'ValidPassword123!',
      confirmPassword: 'DifferentPassword123!',
    })
    expect(mismatch.success).toBe(false)

    const match = resetPasswordSchema.safeParse({
      password: 'ValidPassword123!',
      confirmPassword: 'ValidPassword123!',
    })
    expect(match.success).toBe(true)
  })
})

describe('Onboarding validation criteria', () => {
  it('requires nationality in step 1', () => {
    const invalid = onboardingStep1Schema.safeParse({
      fullName: 'Alice',
      nationalities: [],
    })
    expect(invalid.success).toBe(false)

    const valid = onboardingStep1Schema.safeParse({
      fullName: 'Alice',
      nationalities: ['KE'],
    })
    expect(valid.success).toBe(true)
  })

  it('requires highest completed qualification and field in step 2', () => {
    const missingDegree = onboardingStep2Schema.safeParse({
      field: 'Computer Science',
    })
    expect(missingDegree.success).toBe(false)

    const valid = onboardingStep2Schema.safeParse({
      highestCompleted: 'bachelor',
      field: 'Computer Science',
    })
    expect(valid.success).toBe(true)
  })

  it('requires funding need and at least one field in step 3', () => {
    const missingFunding = onboardingStep3Schema.safeParse({
      fields: ['Engineering'],
    })
    expect(missingFunding.success).toBe(false)

    const valid = onboardingStep3Schema.safeParse({
      fields: ['Engineering'],
      fundingNeed: 'full',
    })
    expect(valid.success).toBe(true)
  })
})
