'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { signUpAction, type ActionState } from '@/lib/auth/actions'
import { calculatePasswordStrength } from '@/lib/auth/validation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

export default function SignupPage() {
  const [password, setPassword] = useState('')
  const [state, setState] = useState<ActionState | undefined>()
  const [pending, setPending] = useState(false)

  const strength = calculatePasswordStrength(password)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setState(undefined)
    const formData = new FormData(e.currentTarget)
    try {
      const res = await signUpAction(undefined, formData)
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
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription className="pt-2">
              {state.message}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link href="/login" className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:underline">
              Return to Log in
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
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Enter your details to register for Opportunity Platform
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
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Jane Doe"
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="jane@example.com"
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (min 10 characters)</Label>
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
                  {strength.hints.length > 0 && (
                    <ul className="list-disc pl-4 text-zinc-500 space-y-0.5">
                      {strength.hints.map((hint) => (
                        <li key={hint}>{hint}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={pending || password.length < 10}>
              {pending ? 'Creating account...' : 'Sign up'}
            </Button>
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
