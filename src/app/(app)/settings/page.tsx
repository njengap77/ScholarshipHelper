'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { getFullUserProfile, saveStep1Action } from '@/lib/onboarding/actions'
import { deleteAccountAction, signOutAction } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Profile Fields
  const [fullName, setFullName] = useState('')
  const [countryResidence, setCountryResidence] = useState('')
  const [nationalities, setNationalities] = useState<string[]>([])
  const [dob, setDob] = useState('')

  // Notifications
  const [inAppNotif, setInAppNotif] = useState(true)
  const [emailNotif, setEmailNotif] = useState(true)

  // Account Deletion Dialog State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmEmailInput, setConfirmEmailInput] = useState('')
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getFullUserProfile()
        if (data?.user?.email) setUserEmail(data.user.email)
        if (data?.profile) {
          if (data.profile.full_name) setFullName(data.profile.full_name)
          if (data.profile.country_residence) setCountryResidence(data.profile.country_residence)
          if (data.profile.nationalities) setNationalities(data.profile.nationalities)
          if (data.profile.dob) setDob(data.profile.dob)
        }
        if (data?.preferences?.notif_prefs) {
          const prefs = data.preferences.notif_prefs as { in_app?: boolean; email?: boolean }
          if (prefs.in_app !== undefined) setInAppNotif(prefs.in_app)
          if (prefs.email !== undefined) setEmailNotif(prefs.email)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMessage(null)
    try {
      const res = await saveStep1Action({
        fullName,
        countryResidence,
        nationalities,
        dob,
      })
      if (res.error) {
        setSaveMessage(`Error: ${res.error}`)
      } else {
        setSaveMessage('Profile changes saved successfully!')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setDeletePending(true)
    setDeleteError(null)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await deleteAccountAction(undefined, formData)
      if (res?.error) {
        setDeleteError(res.error)
      }
    } finally {
      setDeletePending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-sm text-zinc-500">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Top Navigation */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-lg">
            Opportunity Platform
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Dashboard
            </Link>
            <Link href="/settings" className="text-zinc-900 dark:text-zinc-100">
              Settings & Profile
            </Link>
          </nav>
        </div>

        <form action={signOutAction}>
          <Button variant="outline" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Account & Profile Settings</h1>
          <p className="text-sm text-zinc-500">
            Manage your personal profile, notification preferences, and account security.
          </p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Profile</CardTitle>
            <CardDescription>Update your personal information and residency status.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSaveProfile}>
            <CardContent className="space-y-4">
              {saveMessage && (
                <div
                  className={`rounded-md p-3 text-sm ${
                    saveMessage.startsWith('Error')
                      ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                      : 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                  }`}
                >
                  {saveMessage}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Account Email</Label>
                  <Input id="email" value={userEmail} disabled className="bg-zinc-100 dark:bg-zinc-900" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="countryResidence">Country of Residence</Label>
                  <Input
                    id="countryResidence"
                    value={countryResidence}
                    onChange={(e) => setCountryResidence(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nationalities</Label>
                <p className="text-xs text-zinc-500">
                  Current: {nationalities.join(', ') || 'None selected'}
                </p>
                <Link href="/onboarding" className="text-xs text-zinc-900 dark:text-zinc-100 font-medium underline">
                  Update nationalities in Onboarding Wizard →
                </Link>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Preferences</CardTitle>
            <CardDescription>Choose how you receive opportunity deadline alerts and match notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-md border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="text-sm font-medium">In-App Notifications</div>
                <div className="text-xs text-zinc-500">Show alerts inside the Opportunity Platform dashboard.</div>
              </div>
              <input
                type="checkbox"
                checked={inAppNotif}
                onChange={(e) => setInAppNotif(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="text-sm font-medium">Email Alerts</div>
                <div className="text-xs text-zinc-500">Receive weekly digests and upcoming deadline reminders via email.</div>
              </div>
              <input
                type="checkbox"
                checked={emailNotif}
                onChange={(e) => setEmailNotif(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md border-zinc-200 dark:border-zinc-800 opacity-60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Telegram Bot Alerts</span>
                  <Badge variant="outline" className="text-[10px]">
                    Phase 3
                  </Badge>
                </div>
                <div className="text-xs text-zinc-500">Instant notification push via Telegram bot. (Coming in Phase 3).</div>
              </div>
              <input type="checkbox" disabled checked={false} className="h-4 w-4 rounded cursor-not-allowed" />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone: Account Deletion */}
        <Card className="border-red-200 dark:border-red-950">
          <CardHeader>
            <CardTitle className="text-lg text-red-600 dark:text-red-400">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated personal records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Once you delete your account, there is no going back. All profile records, academic data, preferences,
              and application tracking records will be permanently removed.
            </p>
          </CardContent>
          <CardFooter>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete Account
            </Button>
          </CardFooter>
        </Card>
      </main>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md border-red-300 dark:border-red-900 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl text-red-600 dark:text-red-400">Confirm Account Deletion</CardTitle>
              <CardDescription>
                This action is non-reversible. Please type your email <strong>{userEmail}</strong> below to confirm.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleDeleteAccount}>
              <CardContent className="space-y-4">
                {deleteError && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                    {deleteError}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="confirmationEmail">Your account email</Label>
                  <Input
                    id="confirmationEmail"
                    name="confirmationEmail"
                    type="email"
                    value={confirmEmailInput}
                    onChange={(e) => setConfirmEmailInput(e.target.value)}
                    placeholder={userEmail}
                    required
                    disabled={deletePending}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800 p-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setConfirmEmailInput('')
                    setDeleteError(null)
                  }}
                  disabled={deletePending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={deletePending || confirmEmailInput.toLowerCase() !== userEmail.toLowerCase()}
                >
                  {deletePending ? 'Deleting...' : 'Permanently Delete'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
