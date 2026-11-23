'use server'

import { createClient } from '@/lib/supabase/server'
import { normalizeGrade } from '@/lib/eligibility/engine'
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  onboardingStep5Schema,
} from '@/lib/auth/validation'

export type StepState = {
  error?: string
  success?: boolean
}

export async function saveStep1Action(data: unknown): Promise<StepState> {
  const parsed = onboardingStep1Schema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.fullName,
      country_residence: parsed.data.countryResidence || null,
      nationalities: parsed.data.nationalities,
      dob: parsed.data.dob || null,
    })
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function saveStep2Action(data: unknown): Promise<StepState> {
  const parsed = onboardingStep2Schema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Compute normalized grade if provided
  let gradeNormalized: number | undefined
  if (parsed.data.gradeValue !== undefined && parsed.data.gradeScale) {
    gradeNormalized = normalizeGrade(parsed.data.gradeValue, parsed.data.gradeScale)
  }

  // Update profile's highest completed level
  const { error: profErr } = await supabase
    .from('profiles')
    .update({
      highest_completed_level: parsed.data.highestCompleted,
    })
    .eq('user_id', user.id)

  if (profErr) return { error: profErr.message }

  // Insert or update academic background entry
  const { error: acadErr } = await supabase
    .from('academic_backgrounds')
    .insert({
      user_id: user.id,
      level: parsed.data.highestCompleted,
      institution: parsed.data.institution || null,
      field: parsed.data.field,
      specialization: parsed.data.specialization || null,
      grade_value: parsed.data.gradeValue ?? null,
      grade_scale: parsed.data.gradeScale ?? null,
      grade_normalized: gradeNormalized ?? null,
      expected_graduation: parsed.data.expectedGraduation || null,
    })

  if (acadErr) return { error: acadErr.message }
  return { success: true }
}

export async function saveStep3Action(data: unknown): Promise<StepState> {
  const parsed = onboardingStep3Schema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_preferences')
    .update({
      study_levels: parsed.data.studyLevels,
      fields: parsed.data.fields,
      countries: parsed.data.countries,
      opp_types: parsed.data.oppTypes,
      funding_needs: parsed.data.fundingNeed,
      relocate: parsed.data.relocate,
      formats: parsed.data.formats,
    })
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function saveStep4Action(data: unknown): Promise<StepState> {
  const parsed = onboardingStep4Schema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({
      skills: parsed.data.skills,
      research_interests: parsed.data.researchInterests,
      certifications: parsed.data.certifications,
      extracurriculars: parsed.data.extracurriculars,
    })
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function saveStep5Action(data: unknown): Promise<StepState> {
  const parsed = onboardingStep5Schema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_preferences')
    .update({
      can_pay_fees: parsed.data.canPayFees,
      can_pay_travel: parsed.data.canPayTravel,
    })
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function completeOnboardingAction(): Promise<StepState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Verify minimal matching requirements:
  // nationality, highest completed level, funding need, at least one field
  const { data: profile } = await supabase
    .from('profiles')
    .select('nationalities, highest_completed_level')
    .eq('user_id', user.id)
    .single()

  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('funding_needs, fields')
    .eq('user_id', user.id)
    .single()

  if (!profile?.nationalities?.length) {
    return { error: 'Nationality is required to complete onboarding.' }
  }
  if (!profile?.highest_completed_level) {
    return { error: 'Highest completed qualification level is required to complete onboarding.' }
  }
  if (!prefs?.funding_needs) {
    return { error: 'Funding need is required to complete onboarding.' }
  }
  if (!prefs?.fields?.length) {
    return { error: 'At least one field of study is required to complete onboarding.' }
  }

  // Set onboarding_completed_at
  const { error } = await supabase
    .from('profiles')
    .update({
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getFullUserProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [profileRes, prefsRes, acadRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('user_preferences').select('*').eq('user_id', user.id).single(),
    supabase.from('academic_backgrounds').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return {
    user,
    profile: profileRes.data,
    preferences: prefsRes.data,
    academic: acadRes.data || [],
  }
}
