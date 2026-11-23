import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

try {
  process.loadEnvFile?.('.env.local')
} catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Account Deletion Cascade Integration Test', () => {
  let adminClient: ReturnType<typeof createClient>
  let userClient: ReturnType<typeof createClient>
  let testUserId: string
  const email = `delete-test-${Date.now()}@example.com`
  const password = 'TestDeletionPassword123!'

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Create a user
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Deletion Candidate' },
    })
    if (error || !data.user) throw new Error(`User creation failed: ${error?.message}`)
    testUserId = data.user.id

    // 2. Sign in user
    userClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await userClient.auth.signInWithPassword({ email, password })

    // 3. Insert academic background and update preferences
    await userClient.from('academic_backgrounds').insert({
      user_id: testUserId,
      level: 'master',
      institution: 'Test University',
      field: 'Physics',
    })

    await userClient.from('user_preferences').update({
      funding_needs: 'full',
      fields: ['Physics'],
    }).eq('user_id', testUserId)
  }, 30000)

  it('cascades deletion and leaves zero rows across all user-owned tables', async () => {
    // Verify rows exist before deletion
    const { data: profBefore } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', testUserId)
    expect(profBefore?.length).toBe(1)

    const { data: acadBefore } = await adminClient
      .from('academic_backgrounds')
      .select('id')
      .eq('user_id', testUserId)
    expect(acadBefore?.length).toBe(1)

    const { data: prefsBefore } = await adminClient
      .from('user_preferences')
      .select('user_id')
      .eq('user_id', testUserId)
    expect(prefsBefore?.length).toBe(1)

    // Execute account deletion via admin client
    const { error: delErr } = await adminClient.auth.admin.deleteUser(testUserId)
    expect(delErr).toBeNull()

    // Assert that profiles row is gone
    const { data: profAfter } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('user_id', testUserId)
    expect(profAfter).toEqual([])

    // Assert that academic_backgrounds row is gone
    const { data: acadAfter } = await adminClient
      .from('academic_backgrounds')
      .select('id')
      .eq('user_id', testUserId)
    expect(acadAfter).toEqual([])

    // Assert that user_preferences row is gone
    const { data: prefsAfter } = await adminClient
      .from('user_preferences')
      .select('user_id')
      .eq('user_id', testUserId)
    expect(prefsAfter).toEqual([])
  }, 30000)
})
