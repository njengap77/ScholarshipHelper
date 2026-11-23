'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  deleteAccountSchema,
} from './validation'

export type ActionState = {
  error?: string
  success?: boolean
  message?: string
}

export async function signUpAction(prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const raw = {
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const headerList = await headers()
  const origin = headerList.get('origin') ?? process.env.APP_URL ?? 'http://localhost:3000'

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // If email confirmation is required and user is not immediately authenticated
  if (data.user && !data.session) {
    return {
      success: true,
      message: 'Please check your email to confirm your account and complete registration.',
    }
  }

  redirect('/onboarding')
}

export async function loginAction(prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Non-negotiable: Never reveal which part was wrong
    return { error: 'Invalid email or password.' }
  }

  // Check if onboarding is completed
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed_at')
      .eq('user_id', user.id)
      .single()

    if (!profile?.onboarding_completed_at) {
      redirect('/onboarding')
    }
  }

  redirect('/dashboard')
}

export async function googleSignInAction(): Promise<{ url?: string; error?: string }> {
  const headerList = await headers()
  const origin = headerList.get('origin') ?? process.env.APP_URL ?? 'http://localhost:3000'

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { url: data.url }
}

export async function forgotPasswordAction(prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const raw = {
    email: formData.get('email'),
  }

  const parsed = forgotPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const headerList = await headers()
  const origin = headerList.get('origin') ?? process.env.APP_URL ?? 'http://localhost:3000'

  const supabase = await createClient()
  // Generic response to prevent email enumeration
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/reset-password`,
  })

  return {
    success: true,
    message: 'If an account exists with that email, a password reset link has been sent.',
  }
}

export async function resetPasswordAction(prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const raw = {
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  }

  const parsed = resetPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    message: 'Your password has been successfully reset. You can now log in.',
  }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function deleteAccountAction(prevState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const raw = {
    confirmationEmail: formData.get('confirmationEmail'),
  }

  const parsed = deleteAccountSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: 'Please enter a valid confirmation email.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return { error: 'You must be logged in to delete your account.' }
  }

  if (user.email.toLowerCase() !== parsed.data.confirmationEmail) {
    return { error: 'Confirmation email does not match your account email.' }
  }

  // Use service role admin client to delete the user in Supabase auth
  // Cascades through all tables with on delete cascade
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) {
    return { error: `Failed to delete account: ${error.message}` }
  }

  // Sign out locally
  await supabase.auth.signOut()
  redirect('/login?deleted=true')
}
