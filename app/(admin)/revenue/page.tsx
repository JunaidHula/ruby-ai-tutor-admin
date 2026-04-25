import { createAdminClient } from '@/lib/supabase-admin'
import StatCard from '@/components/StatCard'
import { DollarSign, TrendingDown, Tag, CreditCard } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RevenuePage() {
  const db = createAdminClient()

  const [
    { data: payments },
    { data: activeSubs },
    { data: plans },
    { data: vouchers },
    { data: redemptions },
    { data: subStatuses },
  ] = await Promise.all([
    db.from('payments').select('amount, plan, status, paid_at').order('paid_at', { ascending: false }),
    db.from('subscriptions').select('plan, status').eq('status', 'active'),
    db.from('plans').select('key, label, price_rands'),
    db.from('vouchers').select('code, discount_type, discount_value, used_count, is_active, applicable_plans'),
    db.from('voucher_redemptions').select('voucher_code, plan, redeemed_at'),
    db.from('subscriptions').select('status'),
  ])

  const planPriceMap = Object.fromEntries((plans ?? []).map(p => [p.key, Number(p.price_rands)]))
  const planLabelMap = Object.fromEntries((plans ?? []).map(p => [p.key, p.label]))

  const totalRevenue = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const mrr = (activeSubs ?? []).reduce((s, sub) => s + (planPriceMap[sub.plan] ?? 0), 0)
  const arr = mrr * 12

  // Revenue by plan
  const revenueByPlan: Record<string, number> = {}
  for (const p of payments ?? []) {
    revenueByPlan[p.plan] = (revenueByPlan[p.plan] ?? 0) + Number(p.amount)
  }

  // Sub status breakdown
  const statusCount: Record<string, number> = {}
  for (const s of subStatuses ?? []) statusCount[s.status] = (statusCount[s.status] ?? 0) + 1

  // Monthly revenue (last 6 months)
  const monthlyRevenue: Record<string, number> = {}
  for (const p of payments ?? []) {
    const m = p.paid_at.slice(0, 7)
    monthlyRevenue[m] = (monthlyRevenue[m] ?? 0) + Number(p.amount)
  }
  const months = Object.entries(monthlyRevenue).sort(([a], [b]) => a.localeCompare(b)).slice(-6)

  // Voucher discount given
  const discountGiven = (redemptions ?? []).reduce((sum, r) => {
    const v = vouchers?.find(x => x.code === r.voucher_code)
    if (!v) return sum
    const base = planPriceMap[r.plan] ?? 0
    const d = v.discount_type === 'percentage' ? base * v.discount_value / 100 : v.discount_value
    return sum + d
  }, 0)

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-bold text-gray-900 mb-5">Revenue</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="MRR" value={`R${mrr.toLocaleString()}`} icon={<DollarSign className="w-4 h-4" />} color="green" />
        <StatCard label="ARR" value={`R${arr.toLocaleString()}`} icon={<TrendingDown className="w-4 h-4" />} color="blue" />
        <StatCard label="Total Revenue" value={`R${Math.round(totalRevenue).toLocaleString()}`} icon={<CreditCard className="w-4 h-4" />} />
        <StatCard label="Voucher Discount Given" value={`R${Math.round(discountGiven).toLocaleString()}`} icon={<Tag className="w-4 h-4" />} color="amber" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Monthly revenue */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Monthly revenue</h2>
          <div className="space-y-2">
            {months.map(([month, amount]) => {
              const max = Math.max(...months.map(([, a]) => a))
              return (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-16 flex-shrink-0">{month}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${(amount / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-20 text-right">R{Math.round(amount).toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sub status breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Subscription status</h2>
          {Object.entries(statusCount).map(([status, count]) => (
            <div key={status} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm capitalize text-gray-600">{status.replace('_', ' ')}</span>
              <span className="text-sm font-semibold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue by plan */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Revenue by plan</h2>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(revenueByPlan).sort((a, b) => b[1] - a[1]).map(([plan, amount]) => (
            <div key={plan} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 capitalize">{planLabelMap[plan] ?? plan}</p>
              <p className="text-lg font-extrabold text-gray-900 mt-1">R{Math.round(amount).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vouchers */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Vouchers</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Code</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Discount</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Plans</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Uses</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(vouchers ?? []).map(v => (
              <tr key={v.code} className="hover:bg-gray-50">
                <td className="py-2.5 font-mono text-sm font-semibold text-gray-900">{v.code}</td>
                <td className="py-2.5 text-gray-700">{v.discount_type === 'percentage' ? `${v.discount_value}%` : `R${v.discount_value}`}</td>
                <td className="py-2.5 text-gray-500 text-xs">{v.applicable_plans?.length ? v.applicable_plans.join(', ') : 'All'}</td>
                <td className="py-2.5 text-gray-700">{v.used_count}</td>
                <td className="py-2.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {v.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
