import { createAdminClient } from '@/lib/supabase-admin'
import StatCard from '@/components/StatCard'
import NeedsInstrumentation from '@/components/NeedsInstrumentation'
import { MessageSquare, Users, Clock, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  const db = createAdminClient()

  const since30 = new Date(Date.now() - 30 * 86400000).toISOString()
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString()

  const [
    { data: messages30 },
    { data: messages7 },
  ] = await Promise.all([
    db.from('chat_messages').select('user_id, role, created_at').gte('created_at', since30).order('created_at'),
    db.from('chat_messages').select('user_id, role, created_at').gte('created_at', since7),
  ])

  const msgs30 = messages30 ?? []
  const msgs7 = messages7 ?? []

  // Total messages
  const totalMessages30 = msgs30.length
  const totalMessages7 = msgs7.length

  // User vs AI messages
  const userMessages30 = msgs30.filter(m => m.role === 'user').length
  const aiMessages30 = msgs30.filter(m => m.role === 'assistant' || m.role === 'ai').length
  const userAiRatio = aiMessages30 > 0 ? (userMessages30 / aiMessages30).toFixed(2) : '—'

  // Unique users last 7d
  const uniqueUsers7 = new Set(msgs7.map(m => m.user_id).filter(Boolean)).size

  // Avg messages per user per day last 7d
  const avgMsgsPerUserPerDay = uniqueUsers7 > 0 ? (totalMessages7 / uniqueUsers7 / 7).toFixed(1) : '—'

  // Messages per day last 30d
  const dayMap: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    dayMap[d] = 0
  }
  for (const m of msgs30) {
    const d = (m.created_at ?? '').split('T')[0]
    if (d in dayMap) dayMap[d]++
  }
  const maxDayCount = Math.max(...Object.values(dayMap), 1)

  // Most active hours (0–23)
  const hourCounts: Record<number, number> = {}
  for (let h = 0; h < 24; h++) hourCounts[h] = 0
  for (const m of msgs30) {
    if (!m.created_at) continue
    const hour = new Date(m.created_at).getUTCHours()
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1
  }
  const maxHourCount = Math.max(...Object.values(hourCounts), 1)

  // Median gap between consecutive messages per user (same session = within 30 min)
  const byUser: Record<string, string[]> = {}
  for (const m of msgs30) {
    if (!m.user_id || !m.created_at) continue
    if (!byUser[m.user_id]) byUser[m.user_id] = []
    byUser[m.user_id].push(m.created_at)
  }
  const gaps: number[] = []
  for (const timestamps of Object.values(byUser)) {
    const sorted = timestamps.sort()
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 1000
      if (diff <= 1800) gaps.push(diff) // within 30 min = same session
    }
  }
  gaps.sort((a, b) => a - b)
  const medianGap = gaps.length > 0 ? Math.round(gaps[Math.floor(gaps.length / 2)]) : null

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Chat & Interaction Layer</h1>
      <p className="text-sm text-gray-400 mb-6">Last 30 days</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Messages (30d)" value={totalMessages30.toLocaleString()} icon={<MessageSquare className="w-4 h-4" />} color="rose" />
        <StatCard label="Messages (7d)" value={totalMessages7.toLocaleString()} icon={<TrendingUp className="w-4 h-4" />} color="blue" />
        <StatCard label="Unique Users (7d)" value={uniqueUsers7.toLocaleString()} icon={<Users className="w-4 h-4" />} color="green" />
        <StatCard label="Avg Msgs/User/Day" value={avgMsgsPerUserPerDay} icon={<Clock className="w-4 h-4" />} color="amber" sub="last 7 days" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard label="User Messages (30d)" value={userMessages30.toLocaleString()} sub="role = user" />
        <StatCard label="AI Messages (30d)" value={aiMessages30.toLocaleString()} sub="role = assistant" />
        <StatCard
          label="Median Session Gap"
          value={medianGap != null ? `${medianGap}s` : '—'}
          sub="Between consecutive msgs ≤30min apart"
        />
      </div>
      <div className="mb-3 text-xs text-gray-500">
        User : AI ratio = <span className="font-semibold text-gray-800">{userAiRatio}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Messages per day */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Messages per day — last 30 days</h2>
          <div className="space-y-1">
            {Object.entries(dayMap).map(([day, count]) => (
              <div key={day} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24 flex-shrink-0">{day}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(count / maxDayCount) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-10 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most active hours */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Most active hours (UTC)</h2>
          <div className="space-y-1">
            {Array.from({ length: 24 }, (_, h) => h).map(h => (
              <div key={h} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-10 flex-shrink-0">{String(h).padStart(2, '0')}:00</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${(hourCounts[h] / maxHourCount) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-10 text-right">{hourCounts[h]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Needs instrumentation</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <NeedsInstrumentation
          metric="Session boundaries"
          description="Add a `session_id` UUID to chat_messages. Generate a new session_id when gap between messages exceeds 30 minutes."
        />
        <NeedsInstrumentation
          metric="Hint usage in chat"
          description="Add `is_hint_request: boolean` to chat_messages, set true when user message matches hint-request patterns."
        />
        <NeedsInstrumentation
          metric="Image uploads"
          description="Add `has_image: boolean` and `image_count: int` to chat_messages."
        />
        <NeedsInstrumentation
          metric="Regeneration rate"
          description="Add `is_regeneration: boolean` to chat_messages for AI messages that were requested again."
        />
        <NeedsInstrumentation
          metric="Session abandonment after AI response"
          description="Requires session_id above. Flag sessions where last message is an AI message with no user follow-up within 10 minutes."
        />
      </div>
    </div>
  )
}
