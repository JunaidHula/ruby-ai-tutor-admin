import { createAdminClient } from '@/lib/supabase-admin'
import StatCard from '@/components/StatCard'
import SignupsChart from '@/components/SignupsChart'
import { Users, DollarSign, TrendingUp, Activity, CreditCard } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const db = createAdminClient()

  const [
    { count: totalUsers },
    { count: activeSubCount },
    { data: revenueData },
    { data: signups30 },
    { data: activeSubs },
    { data: plans },
    { data: trialExpiring },
  ] = await Promise.all([
    db.from('users').select('*', { count: 'exact', head: true }),
    db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('payments').select('amount'),
    db.from('users').select('created_at').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()).order('created_at'),
    db.from('subscriptions').select('plan').eq('status', 'active'),
    db.from('plans').select('key, price_rands'),
    db.from('users').select('id').lte('trial_expires_at', new Date(Date.now() + 7 * 86400000).toISOString()).gte('trial_expires_at', new Date().toISOString()),
  ])

  const totalRevenue = (revenueData ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const planPriceMap = Object.fromEntries((plans ?? []).map(p => [p.key, Number(p.price_rands)]))
  const mrr = (activeSubs ?? []).reduce((s, sub) => s + (planPriceMap[sub.plan] ?? 0), 0)

  // Build 30-day chart data
  const signupByDay: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    signupByDay[d] = 0
  }
  for (const u of signups30 ?? []) {
    const d = u.created_at.split('T')[0]
    if (d in signupByDay) signupByDay[d]++
  }
  const chartData = Object.entries(signupByDay).map(([date, count]) => ({ date, count }))

  const todaySignups = signupByDay[new Date().toISOString().split('T')[0]] ?? 0

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-gray-900 mb-5">Overview</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total Users" value={(totalUsers ?? 0).toLocaleString()} icon={<Users className="w-4 h-4" />} />
        <StatCard label="Active Subs" value={(activeSubCount ?? 0).toLocaleString()} icon={<Activity className="w-4 h-4" />} color="rose" />
        <StatCard label="MRR" value={`R${mrr.toLocaleString()}`} icon={<DollarSign className="w-4 h-4" />} color="green" />
        <StatCard label="Total Revenue" value={`R${Math.round(totalRevenue).toLocaleString()}`} icon={<CreditCard className="w-4 h-4" />} color="blue" />
        <StatCard label="Signups Today" value={todaySignups} icon={<TrendingUp className="w-4 h-4" />} color="amber"
          sub={`Trial expiring ≤7d: ${trialExpiring?.length ?? 0}`} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">New signups — last 30 days</h2>
        <SignupsChart data={chartData} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Subscriptions by plan</h3>
          {(() => {
            const byPlan: Record<string, number> = {}
            for (const s of activeSubs ?? []) byPlan[s.plan] = (byPlan[s.plan] ?? 0) + 1
            return Object.entries(byPlan).sort((a, b) => b[1] - a[1]).map(([plan, count]) => (
              <div key={plan} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700 capitalize">{plan}</span>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
            ))
          })()}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent signups (7 days)</h3>
          {chartData.slice(-7).reverse().map(({ date, count }) => (
            <div key={date} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-500">{new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
              <span className="text-sm font-semibold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
