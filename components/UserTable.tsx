'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Pencil, Check, X } from 'lucide-react'
import { updateUserPlan } from '@/app/(admin)/users/actions'

interface User {
  id: string
  email: string
  full_name: string | null
  grade: string | null
  plan: string
  trial_expires_at: string | null
  created_at: string
  subscriptions: Array<{ plan: string; status: string }> | null
  progress: Array<{ session_count: number; last_session: string }> | null
}

interface Plan { key: string; label: string; price_rands: number }

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  freebie: 'bg-gray-100 text-gray-600',
  scholar: 'bg-blue-100 text-blue-700',
  starter: 'bg-blue-100 text-blue-700',
  master: 'bg-amber-100 text-amber-700',
  pro: 'bg-purple-100 text-purple-700',
  ultimate: 'bg-purple-100 text-purple-700',
  school: 'bg-green-100 text-green-700',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  past_due: 'bg-amber-100 text-amber-700',
}

export default function UserTable({
  initialUsers, plans, totalCount, pageSize, currentPage, searchQuery, planFilter,
}: {
  initialUsers: User[]
  plans: Plan[]
  totalCount: number
  pageSize: number
  currentPage: number
  searchQuery: string
  planFilter: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState(searchQuery)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPlan, setEditPlan] = useState('')
  const [isPending, startTransition] = useTransition()
  const totalPages = Math.ceil(totalCount / pageSize)

  function applySearch() {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (planFilter) params.set('plan', planFilter)
    params.set('page', '1')
    router.push(`/users?${params}`)
  }

  function applyPlanFilter(plan: string) {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (plan) params.set('plan', plan)
    params.set('page', '1')
    router.push(`/users?${params}`)
  }

  function goToPage(p: number) {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (planFilter) params.set('plan', planFilter)
    params.set('page', String(p))
    router.push(`/users?${params}`)
  }

  function startEdit(user: User) {
    setEditingId(user.id)
    setEditPlan(user.plan)
  }

  function cancelEdit() { setEditingId(null) }

  function confirmEdit(userId: string) {
    startTransition(async () => {
      await updateUserPlan(userId, editPlan)
      setEditingId(null)
      router.refresh()
    })
  }

  const trialNow = Date.now()

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applySearch()}
            placeholder="Search name or email…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
          <button onClick={applySearch}
            className="px-3 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 transition-colors">
            <Search className="w-4 h-4" />
          </button>
        </div>
        <select value={planFilter} onChange={e => applyPlanFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All plans</option>
          {plans.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sub Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trial</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sessions</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Active</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Signed Up</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {initialUsers.map(user => {
                const sub = user.subscriptions?.[0]
                const prog = user.progress?.[0]
                const trialExpiry = user.trial_expires_at ? new Date(user.trial_expires_at) : null
                const trialDaysLeft = trialExpiry ? Math.ceil((trialExpiry.getTime() - trialNow) / 86400000) : null
                const isEditing = editingId === user.id

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[160px]">{user.full_name || '—'}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[160px]">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.grade ?? '—'}</td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <select value={editPlan} onChange={e => setEditPlan(e.target.value)}
                            className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500">
                            {plans.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                          </select>
                          <button onClick={() => confirmEdit(user.id)} disabled={isPending}
                            className="p-1 text-green-600 hover:text-green-700"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={cancelEdit}
                            className="p-1 text-red-500 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[user.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                          {user.plan}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sub ? (
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[sub.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {sub.status}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {trialDaysLeft !== null ? (
                        <span className={trialDaysLeft <= 3 ? 'text-red-500 font-semibold' : trialDaysLeft <= 7 ? 'text-amber-500 font-medium' : 'text-gray-500'}>
                          {trialDaysLeft > 0 ? `${trialDaysLeft}d left` : 'Expired'}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{prog?.session_count ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {prog?.last_session ? new Date(prog.last_session).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => startEdit(user)} title="Edit plan"
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">Page {currentPage} of {totalPages} · {totalCount} users</p>
            <div className="flex gap-1">
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">←</button>
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
