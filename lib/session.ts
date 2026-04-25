import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from './supabase-admin'

export async function getStaffSession() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: staff } = await admin
    .from('staff')
    .select('id, email, role')
    .eq('user_id', user.id)
    .single()
  if (!staff) return null
  return { user, staff: staff as { id: string; email: string; role: string } }
}
