'use server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getStaffSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function updateUserPlan(userId: string, newPlan: string) {
  const session = await getStaffSession()
  if (!session || session.staff.role === 'viewer') throw new Error('Unauthorized')

  const db = createAdminClient()

  await db.from('users').update({ plan: newPlan }).eq('id', userId)
  await db.from('subscriptions').upsert({
    user_id: userId,
    plan: newPlan,
    status: newPlan === 'free' ? 'cancelled' : 'active',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  await db.from('audit_logs').insert({
    staff_id: session.staff.id,
    action: 'update_plan',
    target_table: 'users',
    target_id: userId,
    new_data: { plan: newPlan },
  })

  revalidatePath('/users')
}
