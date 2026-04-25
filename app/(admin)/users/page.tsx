import { createAdminClient } from '@/lib/supabase-admin'
import UserTable from '@/components/UserTable'

export const dynamic = 'force-dynamic'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; page?: string }>
}) {
  const sp = await searchParams
  const q = sp.q ?? ''
  const planFilter = sp.plan ?? ''
  const page = Math.max(1, parseInt(sp.page ?? '1'))
  const pageSize = 50
  const db = createAdminClient()

  let query = db
    .from('users')
    .select(`id, email, full_name, grade, plan, trial_expires_at, created_at, subscriptions(plan,status), progress(session_count,last_session)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
  if (planFilter) query = query.eq('plan', planFilter)

  const { data: users, count } = await query
  const { data: plans } = await db.from('plans').select('key, label, price_rands').eq('is_active', true).order('sort_order')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">{count ?? 0} total accounts</p>
        </div>
      </div>
      <UserTable
        initialUsers={(users ?? []) as any}
        plans={plans ?? []}
        totalCount={count ?? 0}
        pageSize={pageSize}
        currentPage={page}
        searchQuery={q}
        planFilter={planFilter}
      />
    </div>
  )
}
