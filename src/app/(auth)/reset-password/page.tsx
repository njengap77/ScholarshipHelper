'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { resetPasswordAction, type ActionState } from '@/lib/auth/actions'
import { calculatePasswordStrength } from '@/lib/auth/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [state, setState] = useState<ActionState | undefined>()
  const [pending, setPending] = useState(false)

  const strength = calculatePasswordStrength(password)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setState(undefined)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await resetPasswordAction(undefined, formData)
      setState(res)
    } finally {
      setPending(false)
    }
  }

  if (state?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-50 dark:bg-black">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Password Updated</CardTitle>
            <CardDescription className="pt-2">
              {state.message}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link href="/login" className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:underline">
              Log in with new password
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-50 dark:bg-black">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
          <CardDescription>
            Enter your new password below. It must be at least 10 characters long.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {state?.error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {state.error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
              />
              {password.length > 0 && (
                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Strength:</span>
                    <span
                      className={
                        strength.label === 'Strong'
                          ? 'font-medium text-green-600'
                          : strength.label === 'Good'
                          ? 'font-medium text-blue-600'
                          : strength.label === 'Fair'
                          ? 'font-medium text-amber-600'
                          : 'font-medium text-red-600'
                      }
                    >
                      {strength.label}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={pending}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={pending || password.length < 10 || password !== confirmPassword}
            >
              {pending ? 'Updating password...' : 'Update password'}
            </Button>
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/login" className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline">
                Back to log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
