import { createAdminClient } from '@/lib/supabase-admin'
import VoucherManager from '@/components/VoucherManager'

export const dynamic = 'force-dynamic'

export default async function ContentPage() {
  const db = createAdminClient()

  const [
    { data: vouchers },
    { data: trialExpiring },
    { data: plans },
  ] = await Promise.all([
    db.from('vouchers').select('*').order('created_at', { ascending: false }),
    db.from('users').select('id, email, full_name, trial_expires_at, plan')
      .lte('trial_expires_at', new Date(Date.now() + 7 * 86400000).toISOString())
      .gte('trial_expires_at', new Date().toISOString())
      .order('trial_expires_at'),
    db.from('plans').select('key, label').eq('is_active', true).order('sort_order'),
  ])

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-bold text-gray-900 mb-5">Content & Ops</h1>

      {/* Trial expiring soon */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Trials expiring within 7 days</h2>
          <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">{trialExpiring?.length ?? 0} users</span>
        </div>
        {!trialExpiring?.length ? (
          <p className="text-sm text-gray-400">No trials expiring soon.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Expires</th>
                <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Days left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {trialExpiring.map(u => {
                const daysLeft = Math.ceil((new Date(u.trial_expires_at!).getTime() - Date.now()) / 86400000)
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-2.5">
                      <p className="font-medium text-gray-900">{u.full_name || '—'}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="py-2.5 capitalize text-gray-600">{u.plan}</td>
                    <td className="py-2.5 text-xs text-gray-500">{new Date(u.trial_expires_at!).toLocaleDateString('en-ZA')}</td>
                    <td className="py-2.5">
                      <span className={`text-xs font-semibold ${daysLeft <= 2 ? 'text-red-600' : 'text-amber-600'}`}>{daysLeft}d</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Voucher manager */}
      <VoucherManager initialVouchers={vouchers ?? []} plans={plans ?? []} />
    </div>
  )
}
