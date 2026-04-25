import { createAdminClient } from '@/lib/supabase-admin'
import StatCard from '@/components/StatCard'
import NeedsInstrumentation from '@/components/NeedsInstrumentation'
import { CreditCard, Users, TrendingUp, DollarSign } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MonetisationPage() {
  const db = createAdminClient()

  const [
    { data: users },
    { data: payments },
    { data: subs },
    { data: progress },
    { data: redemptions },
  ] = await Promise.all([
    db.from('users').select('id, created_at, plan, trial_expires_at'),
    db.from('payments').select('user_id, amount, plan, paid_at').order('paid_at'),
    db.from('subscriptions').select('user_id, plan, status, created_at, updated_at'),
    db.from('progress').select('user_id, session_count'),
    db.from('voucher_redemptions').select('user_id, plan, redeemed_at'),
  ])

  const usrs = users ?? []
  const pmts = payments ?? []
  const subsData = subs ?? []
  const prog = progress ?? []
  const redemptionsData = redemptions ?? []

  // Paying vs free users
  const activePaidSubs = subsData.filter(s => s.status === 'active' && s.plan !== 'free')
  const totalPayingUsers = new Set(activePaidSubs.map(s => s.user_id)).size
  const totalUsers = usrs.length
  const freeUsers = usrs.filter(u => !u.plan || u.plan === 'free' || u.plan === 'trial').length
  const conversionRate = totalUsers > 0 ? ((totalPayingUsers / totalUsers) * 100).toFixed(1) : '0'

  // Time from signup to first payment
  const userCreatedAt = Object.fromEntries(usrs.map(u => [u.id, u.created_at]))
  const timeToPayment: number[] = []
  const firstPaymentByUser: Record<string, string> = {}
  for (const p of pmts) {
    if (!firstPaymentByUser[p.user_id]) {
      firstPaymentByUser[p.user_id] = p.paid_at
    }
  }
  for (const [userId, firstPaidAt] of Object.entries(firstPaymentByUser)) {
    const createdAt = userCreatedAt[userId]
    if (!createdAt || !firstPaidAt) continue
    const diffDays = (new Date(firstPaidAt).getTime() - new Date(createdAt).getTime()) / 86400000
    if (diffDays >= 0) timeToPayment.push(diffDays)
  }
  timeToPayment.sort((a, b) => a - b)
  const medianTTP = timeToPayment.length > 0 ? Math.round(timeToPayment[Math.floor(timeToPayment.length / 2)]) : null
  const avgTTP = timeToPayment.length > 0 ? Math.round(timeToPayment.reduce((s, v) => s + v, 0) / timeToPayment.length) : null

  // Revenue per plan
  const revenueByPlan: Record<string, number> = {}
  for (const p of pmts) {
    const plan = p.plan ?? 'unknown'
    revenueByPlan[plan] = (revenueByPlan[plan] ?? 0) + Number(p.amount)
  }
  const maxPlanRevenue = Math.max(...Object.values(revenueByPlan), 1)

  // Plan distribution
  const planDist: Record<string, number> = {}
  for (const u of usrs) {
    const plan = u.plan ?? 'unknown'
    planDist[plan] = (planDist[plan] ?? 0) + 1
  }
  const maxPlanCount = Math.max(...Object.values(planDist), 1)

  // Trial users who converted
  const usersWithTrial = new Set(usrs.filter(u => u.trial_expires_at).map(u => u.id))
  const payingUserIds = new Set(Object.keys(firstPaymentByUser))
  const trialConverted = [...usersWithTrial].filter(id => payingUserIds.has(id)).length
  const trialConversionRate = usersWithTrial.size > 0 ? Math.round((trialConverted / usersWithTrial.size) * 100) : 0

  // Churn by month (status = cancelled)
  const cancelledSubs = subsData.filter(s => s.status === 'cancelled' && s.updated_at)
  const churnByMonth: Record<string, number> = {}
  for (const s of cancelledSubs) {
    const month = (s.updated_at ?? '').slice(0, 7)
    if (month) churnByMonth[month] = (churnByMonth[month] ?? 0) + 1
  }
  const sortedChurnMonths = Object.entries(churnByMonth).sort(([a], [b]) => b.localeCompare(a)).slice(0, 12)
  const maxChurnCount = sortedChurnMonths[0]?.[1] ?? 1

  // Session count distribution by plan
  const progressByUserId = Object.fromEntries(prog.map(p => [p.user_id, p.session_count ?? 0]))
  const userPlanMap = Object.fromEntries(usrs.map(u => [u.id, u.plan ?? 'free']))
  const sessionBuckets = ['0', '1-5', '6-20', '21-50', '50+']
  const freeSessionDist: Record<string, number> = Object.fromEntries(sessionBuckets.map(b => [b, 0]))
  const paidSessionDist: Record<string, number> = Object.fromEntries(sessionBuckets.map(b => [b, 0]))

  function getSessionBucket(sc: number): string {
    if (sc === 0) return '0'
    if (sc <= 5) return '1-5'
    if (sc <= 20) return '6-20'
    if (sc <= 50) return '21-50'
    return '50+'
  }

  for (const u of usrs) {
    const sc = progressByUserId[u.id] ?? 0
    const bucket = getSessionBucket(sc)
    const plan = userPlanMap[u.id]
    const isPaid = plan && plan !== 'free' && plan !== 'trial'
    if (isPaid) paidSessionDist[bucket]++
    else freeSessionDist[bucket]++
  }

  // Voucher cohort
  const voucherUserIds = new Set(redemptionsData.map(r => r.user_id))
  const voucherUsersWhoConverted = [...voucherUserIds].filter(id => payingUserIds.has(id)).length
  const voucherConversionRate = voucherUserIds.size > 0 ? Math.round((voucherUsersWhoConverted / voucherUserIds.size) * 100) : 0

  const totalRevenue = pmts.reduce((s, p) => s + Number(p.amount), 0)
  const maxSessionDistCount = Math.max(
    ...Object.values(freeSessionDist),
    ...Object.values(paidSessionDist),
    1
  )

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Monetisation Behaviour</h1>
      <p className="text-sm text-gray-400 mb-6">All time</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Paying Users" value={totalPayingUsers.toLocaleString()} icon={<CreditCard className="w-4 h-4" />} color="green" />
        <StatCard label="Free Users" value={freeUsers.toLocaleString()} icon={<Users className="w-4 h-4" />} color="blue" />
        <StatCard label="Conversion Rate" value={`${conversionRate}%`} icon={<TrendingUp className="w-4 h-4" />} color="rose" />
        <StatCard label="Total Revenue" value={`R${Math.round(totalRevenue).toLocaleString()}`} icon={<DollarSign className="w-4 h-4" />} color="amber" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Median Days to Pay" value={medianTTP != null ? `${medianTTP}d` : '—'} sub="Signup → first payment" />
        <StatCard label="Avg Days to Pay" value={avgTTP != null ? `${avgTTP}d` : '—'} />
        <StatCard label="Trial → Paid Rate" value={`${trialConversionRate}%`} sub={`${trialConverted} of ${usersWithTrial.size} trial users`} />
        <StatCard label="Voucher Conversion" value={`${voucherConversionRate}%`} sub={`${voucherUserIds.size} voucher users`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Revenue by plan */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Revenue by plan</h2>
          <div className="space-y-1.5">
            {Object.entries(revenueByPlan).sort((a, b) => b[1] - a[1]).map(([plan, rev]) => (
              <div key={plan} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0 capitalize">{plan}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(rev / maxPlanRevenue) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-24 text-right">R{Math.round(rev).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">User plan distribution</h2>
          <div className="space-y-1.5">
            {Object.entries(planDist).sort((a, b) => b[1] - a[1]).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0 capitalize">{plan}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / maxPlanCount) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-10 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Churn by month */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Cancellations by month</h2>
          {sortedChurnMonths.length === 0 ? (
            <p className="text-xs text-gray-400">No cancellations recorded</p>
          ) : (
            <div className="space-y-1.5">
              {sortedChurnMonths.map(([month, count]) => (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 flex-shrink-0">{month}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-red-400 h-2 rounded-full" style={{ width: `${(count / maxChurnCount) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session dist by plan */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Session count: Free vs Paid</h2>
          <div className="space-y-3">
            {sessionBuckets.map(bucket => (
              <div key={bucket}>
                <p className="text-xs text-gray-500 mb-1">{bucket} sessions</p>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-blue-500 w-8">Free</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${(freeSessionDist[bucket] / maxSessionDistCount) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-600 w-8 text-right">{freeSessionDist[bucket]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-500 w-8">Paid</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${(paidSessionDist[bucket] / maxSessionDistCount) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-600 w-8 text-right">{paidSessionDist[bucket]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Needs instrumentation</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <NeedsInstrumentation
          metric="Trial usage intensity vs conversion"
          description="Add a `trial_sessions` counter or use progress.session_count filtered to users where created_at is within trial period."
        />
        <NeedsInstrumentation
          metric="Churn predictors"
          description="Add a `last_active_at` column to users (updated on every session). Flag users with active subs but no activity in 14+ days."
        />
        <NeedsInstrumentation
          metric="Feature usage by plan type"
          description="Requires the feature_usage table mentioned in Retention page."
        />
      </div>
    </div>
  )
}
