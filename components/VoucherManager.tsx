'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, PowerOff } from 'lucide-react'
import { createVoucher, toggleVoucher } from '@/app/(admin)/content/actions'

interface Voucher {
  code: string; discount_type: string; discount_value: number
  applicable_plans: string[]; max_uses: number | null; used_count: number
  expires_at: string | null; is_active: boolean; created_at: string
}
interface Plan { key: string; label: string }

export default function VoucherManager({ initialVouchers, plans }: { initialVouchers: Voucher[]; plans: Plan[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    code: '', discount_type: 'percentage', discount_value: '20',
    applicable_plans: [] as string[], max_uses: '', expires_at: '',
  })
  const [error, setError] = useState<string | null>(null)

  function togglePlan(key: string) {
    setForm(f => ({
      ...f,
      applicable_plans: f.applicable_plans.includes(key)
        ? f.applicable_plans.filter(p => p !== key)
        : [...f.applicable_plans, key],
    }))
  }

  function handleCreate(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createVoucher({
          code: form.code.toUpperCase(),
          discount_type: form.discount_type as 'percentage' | 'fixed',
          discount_value: parseFloat(form.discount_value),
          applicable_plans: form.applicable_plans,
          max_uses: form.max_uses ? parseInt(form.max_uses) : null,
          expires_at: form.expires_at || null,
        })
        setShowForm(false)
        setForm({ code: '', discount_type: 'percentage', discount_value: '20', applicable_plans: [], max_uses: '', expires_at: '' })
        router.refresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Vouchers</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-semibold transition-colors">
          <Plus className="w-3.5 h-3.5" /> New voucher
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Code</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required
                placeholder="RUBY20" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
              <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (R)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Value</label>
              <input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} required min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Max uses (blank = unlimited)</label>
              <input type="number" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} min="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Expires at (blank = never)</label>
              <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Applicable plans (none = all)</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {plans.map(p => (
                  <button key={p.key} type="button" onClick={() => togglePlan(p.key)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      form.applicable_plans.includes(p.key) ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>{p.label}</button>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={isPending}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
              {isPending ? 'Creating…' : 'Create voucher'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">Cancel</button>
          </div>
        </form>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Code</th>
            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Discount</th>
            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Plans</th>
            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Uses</th>
            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Expires</th>
            <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {initialVouchers.map(v => (
            <tr key={v.code} className="hover:bg-gray-50">
              <td className="py-2.5 font-mono font-semibold text-gray-900">{v.code}</td>
              <td className="py-2.5 text-gray-700">{v.discount_type === 'percentage' ? `${v.discount_value}%` : `R${v.discount_value}`}</td>
              <td className="py-2.5 text-xs text-gray-500">{v.applicable_plans?.length ? v.applicable_plans.join(', ') : 'All'}</td>
              <td className="py-2.5 text-gray-700">{v.used_count}{v.max_uses ? ` / ${v.max_uses}` : ''}</td>
              <td className="py-2.5 text-xs text-gray-400">{v.expires_at ? new Date(v.expires_at).toLocaleDateString('en-ZA') : '—'}</td>
              <td className="py-2.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {v.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-2.5">
                <button onClick={() => { startTransition(async () => { await toggleVoucher(v.code, !v.is_active); router.refresh() }) }}
                  title={v.is_active ? 'Deactivate' : 'Activate'}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                  <PowerOff className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
