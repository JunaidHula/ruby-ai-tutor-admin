'use server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getStaffSession } from '@/lib/session'
import { revalidatePath } from 'next/cache'

export async function createVoucher(data: {
  code: string; discount_type: 'percentage' | 'fixed'; discount_value: number
  applicable_plans: string[]; max_uses: number | null; expires_at: string | null
}) {
  const session = await getStaffSession()
  if (!session || session.staff.role === 'viewer') throw new Error('Unauthorized')
  const db = createAdminClient()
  const { error } = await db.from('vouchers').insert({ ...data, is_active: true, used_count: 0 })
  if (error) throw new Error(error.message)
  await db.from('audit_logs').insert({
    staff_id: session.staff.id, action: 'create_voucher',
    target_table: 'vouchers', target_id: data.code, new_data: data,
  })
  revalidatePath('/content')
}

export async function toggleVoucher(code: string, isActive: boolean) {
  const session = await getStaffSession()
  if (!session || session.staff.role === 'viewer') throw new Error('Unauthorized')
  const db = createAdminClient()
  await db.from('vouchers').update({ is_active: isActive }).eq('code', code)
  await db.from('audit_logs').insert({
    staff_id: session.staff.id, action: isActive ? 'activate_voucher' : 'deactivate_voucher',
    target_table: 'vouchers', target_id: code, new_data: { is_active: isActive },
  })
  revalidatePath('/content')
}
