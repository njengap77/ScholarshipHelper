import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const isOnboardingComplete = !!profile?.onboarding_completed_at

  // Calculate profile completeness score
  let completeness = 20 // baseline signup
  if (profile?.full_name) completeness += 20
  if (profile?.nationalities?.length) completeness += 20
  if (profile?.highest_completed_level) completeness += 20
  if (profile?.onboarding_completed_at) completeness = 100

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Top Navigation */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-lg">
            Opportunity Platform
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <Link href="/dashboard" className="text-zinc-900 dark:text-zinc-100">
              Dashboard
            </Link>
            <Link href="/settings" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Settings & Profile
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 hidden sm:inline">
            {user.email}
          </span>
          <form action={signOutAction}>
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Onboarding Banner if incomplete */}
        {!isOnboardingComplete && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                  Profile Incomplete ({completeness}%)
                </span>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                  Action required
                </Badge>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Complete your profile and preferences to unlock tailored scholarship recommendations and eligibility assessments.
              </p>
            </div>
            <Link href="/onboarding">
              <Button size="sm" className="whitespace-nowrap">
                Resume Onboarding
              </Button>
            </Link>
          </div>
        )}

        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Welcome, {profile?.full_name || 'Scholar'}</CardTitle>
                <CardDescription>
                  Your central hub for scholarship discovery, tracking, and eligibility verification.
                </CardDescription>
              </div>
              <Badge variant={isOnboardingComplete ? 'default' : 'secondary'}>
                {isOnboardingComplete ? 'Profile Complete' : 'Onboarding Pending'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-md border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-xs text-zinc-500 font-medium uppercase">Residency & Nationality</span>
              <p className="font-semibold text-sm">
                {profile?.nationalities?.join(', ') || 'Not specified'}
              </p>
              <p className="text-xs text-zinc-400">
                Residence: {profile?.country_residence || 'Not specified'}
              </p>
            </div>

            <div className="p-4 rounded-md border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-xs text-zinc-500 font-medium uppercase">Highest Qualification</span>
              <p className="font-semibold text-sm capitalize">
                {profile?.highest_completed_level || 'Not set'}
              </p>
              <p className="text-xs text-zinc-400">Used for degree level match</p>
            </div>

            <div className="p-4 rounded-md border border-zinc-200 dark:border-zinc-800 space-y-1">
              <span className="text-xs text-zinc-500 font-medium uppercase">Quick Actions</span>
              <div className="flex flex-col gap-1.5 pt-1">
                <Link href="/settings" className="text-xs text-zinc-600 dark:text-zinc-300 hover:underline">
                  → Edit Profile & Preferences
                </Link>
                {!isOnboardingComplete && (
                  <Link href="/onboarding" className="text-xs text-zinc-600 dark:text-zinc-300 hover:underline">
                    → Review Onboarding Steps
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
