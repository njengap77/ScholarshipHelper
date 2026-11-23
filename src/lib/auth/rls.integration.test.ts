import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Load environment from .env.local if not already in process.env
try {
  process.loadEnvFile?.('.env.local')
} catch {
  // Ignored if file does not exist or already loaded
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Two-User Row-Level Security (RLS) Isolation Integration Test', () => {
  let adminClient: ReturnType<typeof createClient>
  let clientA: ReturnType<typeof createClient>
  let clientB: ReturnType<typeof createClient>

  let userAId: string
  let userBId: string

  const emailA = `test-user-a-${Date.now()}@example.com`
  const emailB = `test-user-b-${Date.now()}@example.com`
  const password = 'SuperSecretTestPassword123!'

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Create User A
    const { data: userAData, error: errA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Test User A' },
    })
    if (errA || !userAData.user) throw new Error(`Failed to create User A: ${errA?.message}`)
    userAId = userAData.user.id

    // 2. Create User B
    const { data: userBData, error: errB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Test User B' },
    })
    if (errB || !userBData.user) throw new Error(`Failed to create User B: ${errB?.message}`)
    userBId = userBData.user.id

    // 3. Sign in User A client
    clientA = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: signinAErr } = await clientA.auth.signInWithPassword({
      email: emailA,
      password,
    })
    if (signinAErr) throw new Error(`User A signin failed: ${signinAErr.message}`)

    // 4. Sign in User B client
    clientB = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: signinBErr } = await clientB.auth.signInWithPassword({
      email: emailB,
      password,
    })
    if (signinBErr) throw new Error(`User B signin failed: ${signinBErr.message}`)
  }, 30000)

  afterAll(async () => {
    if (adminClient) {
      if (userAId) await adminClient.auth.admin.deleteUser(userAId)
      if (userBId) await adminClient.auth.admin.deleteUser(userBId)
    }
  }, 30000)

  it('automatically creates a profile and preferences row for new signups via trigger', async () => {
    // Verified by checking User A's profile via admin
    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('user_id, full_name')
      .eq('user_id', userAId)
      .single()

    expect(error).toBeNull()
    expect(profile).not.toBeNull()
    expect(profile?.full_name).toBe('Test User A')

    const { data: prefs, error: prefsErr } = await adminClient
      .from('user_preferences')
      .select('user_id')
      .eq('user_id', userAId)
      .single()

    expect(prefsErr).toBeNull()
    expect(prefs).not.toBeNull()
  })

  it('allows User A to insert and read their own user-owned rows', async () => {
    // Academic background insert
    const { data: acad, error: acadErr } = await clientA
      .from('academic_backgrounds')
      .insert({
        user_id: userAId,
        level: 'bachelor',
        institution: 'University of Nairobi',
        field: 'Computer Science',
      })
      .select()

    expect(acadErr).toBeNull()
    expect(acad?.length).toBe(1)

    // User A reading own academic backgrounds
    const { data: myAcad, error: myAcadErr } = await clientA
      .from('academic_backgrounds')
      .select('*')
      .eq('user_id', userAId)

    expect(myAcadErr).toBeNull()
    expect(myAcad?.length).toBe(1)
  })

  it('prevents User B from reading User A profile or records (zero rows returned)', async () => {
    // User B tries to read User A's profile
    const { data: bProfileRead, error: bProfileErr } = await clientB
      .from('profiles')
      .select('*')
      .eq('user_id', userAId)

    expect(bProfileErr).toBeNull()
    expect(bProfileRead).toEqual([])

    // User B tries to read User A's academic background
    const { data: bAcadRead, error: bAcadErr } = await clientB
      .from('academic_backgrounds')
      .select('*')
      .eq('user_id', userAId)

    expect(bAcadErr).toBeNull()
    expect(bAcadRead).toEqual([])

    // User B tries to read User A's preferences
    const { data: bPrefsRead, error: bPrefsErr } = await clientB
      .from('user_preferences')
      .select('*')
      .eq('user_id', userAId)

    expect(bPrefsErr).toBeNull()
    expect(bPrefsRead).toEqual([])
  })

  it('rejects User B inserting a row with user_id = User A (RLS violation)', async () => {
    // User B attempts to spoof User A's user_id in academic_backgrounds
    const { data, error } = await clientB
      .from('academic_backgrounds')
      .insert({
        user_id: userAId,
        level: 'master',
        field: 'Hacking',
      })
      .select()

    expect(error).not.toBeNull()
    // RLS policy check violation
    expect(error?.code).toBe('42501')
    expect(data).toBeNull()
  })

  it('rejects User B updating User A profile', async () => {
    const { data } = await clientB
      .from('profiles')
      .update({ full_name: 'Compromised Name' })
      .eq('user_id', userAId)
      .select()

    // RLS either returns an error or affects 0 rows
    expect(data === null || data.length === 0).toBe(true)

    // Verify User A profile is unchanged
    const { data: aProfile } = await clientA
      .from('profiles')
      .select('full_name')
      .eq('user_id', userAId)
      .single()

    expect(aProfile?.full_name).toBe('Test User A')
  })
})
