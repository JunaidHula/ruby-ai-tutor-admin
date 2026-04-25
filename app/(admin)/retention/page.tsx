import { createAdminClient } from '@/lib/supabase-admin'
import StatCard from '@/components/StatCard'
import NeedsInstrumentation from '@/components/NeedsInstrumentation'
import { TrendingUp, Flame, Users, Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RetentionPage() {
  const db = createAdminClient()

  const [
    { data: streaks },
    { data: progress },
    { data: recentUsers },
    { data: allUsers },
  ] = await Promise.all([
    db.from('user_streaks').select('user_id, current_streak, best_streak, last_active_date'),
    db.from('progress').select('user_id, session_count, last_session, lessons_completed'),
    db.from('users').select('id, created_at').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    db.from('users').select('id, created_at, plan'),
  ])

  const streakData = streaks ?? []
  const progressData = progress ?? []
  const recentUsersData = recentUsers ?? []
  const allUsersData = allUsers ?? []

  // Streak stats
  const activeStreakCount = streakData.filter(s => (s.current_streak ?? 0) > 0).length
  const streak7Plus = streakData.filter(s => (s.current_streak ?? 0) >= 7).length
  const avgCurrentStreak = streakData.length > 0
    ? (streakData.reduce((s, u) => s + (u.current_streak ?? 0), 0) / streakData.length).toFixed(1)
    : '0'
  const bestStreak = streakData.reduce((max, u) => Math.max(max, u.best_streak ?? 0), 0)

  // Streak distribution buckets
  const buckets = { '0': 0, '1-3': 0, '4-7': 0, '8-14': 0, '15+': 0 }
  for (const s of streakData) {
    const cs = s.current_streak ?? 0
    if (cs === 0) buckets['0']++
    else if (cs <= 3) buckets['1-3']++
    else if (cs <= 7) buckets['4-7']++
    else if (cs <= 14) buckets['8-14']++
    else buckets['15+']++
  }
  const maxBucket = Math.max(...Object.values(buckets), 1)

  // Return rate
  const usersWithProgress = progressData.length
  const returningUsers = progressData.filter(p => (p.session_count ?? 0) > 1).length
  const returnRate = usersWithProgress > 0 ? Math.round((returningUsers / usersWithProgress) * 100) : 0

  // Sessions per user distribution
  const sessionBuckets = { '1': 0, '2-5': 0, '6-20': 0, '21-50': 0, '50+': 0 }
  for (const p of progressData) {
    const sc = p.session_count ?? 0
    if (sc === 1) sessionBuckets['1']++
    else if (sc <= 5) sessionBuckets['2-5']++
    else if (sc <= 20) sessionBuckets['6-20']++
    else if (sc <= 50) sessionBuckets['21-50']++
    else sessionBuckets['50+']++
  }
  const maxSessionBucket = Math.max(...Object.values(sessionBuckets), 1)

  // Avg lessons completed
  const avgLessons = progressData.length > 0
    ? (progressData.reduce((s, p) => s + (p.lessons_completed ?? 0), 0) / progressData.length).toFixed(1)
    : '0'

  // Users with 0 sessions
  const allUserIds = new Set(allUsersData.map(u => u.id))
  const progressUserIds = new Set(progressData.map(p => p.user_id))
  const neverStartedCount = [...allUserIds].filter(id => !progressUserIds.has(id)).length

  // DAU proxy: last_active_date = today
  const today = new Date().toISOString().split('T')[0]
  const dauProxy = streakData.filter(s => s.last_active_date === today).length

  // New users last 30d
  const newUsersLast30 = recentUsersData.length

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Retention Drivers</h1>
      <p className="text-sm text-gray-400 mb-6">All time unless noted</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active Streaks" value={activeStreakCount.toLocaleString()} icon={<Flame className="w-4 h-4" />} color="rose" sub="streak > 0" />
        <StatCard label="Streaks ≥7 days" value={streak7Plus.toLocaleString()} icon={<TrendingUp className="w-4 h-4" />} color="green" />
        <StatCard label="Avg Current Streak" value={avgCurrentStreak} icon={<Activity className="w-4 h-4" />} color="blue" sub={`Best ever: ${bestStreak}`} />
        <StatCard label="Return Rate" value={`${returnRate}%`} icon={<Users className="w-4 h-4" />} color="amber" sub="session_count > 1" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Avg Lessons Completed" value={avgLessons} />
        <StatCard label="Never Started" value={neverStartedCount.toLocaleString()} sub="Signed up but 0 sessions" />
        <StatCard label="DAU Proxy" value={dauProxy.toLocaleString()} sub="Active today (user_streaks)" />
        <StatCard label="New Users (30d)" value={newUsersLast30.toLocaleString()} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Streak distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Streak distribution</h2>
          <div className="space-y-2">
            {Object.entries(buckets).map(([bucket, count]) => (
              <div key={bucket} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-12 flex-shrink-0">{bucket} days</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${(count / maxBucket) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-10 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sessions per user */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Sessions per user distribution</h2>
          <div className="space-y-2">
            {Object.entries(sessionBuckets).map(([bucket, count]) => (
              <div key={bucket} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 flex-shrink-0">{bucket}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / maxSessionBucket) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-10 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Needs instrumentation</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <NeedsInstrumentation
          metric="First session actions vs retention"
          description="Add a `first_session_events` JSONB column to progress, recording which features were used in session 1."
        />
        <NeedsInstrumentation
          metric="Time to first success event"
          description="Define success events (first correct answer, first completed skill, first report generated). Log these to a `milestone_events` table with user_id, event_type, occurred_at."
        />
        <NeedsInstrumentation
          metric="Feature adoption funnel"
          description="Track distinct feature_keys used per user in a `feature_usage` table. Keys: chat, maths_engine, reading_engine, matric, reports."
        />
        <NeedsInstrumentation
          metric="Early engagement depth"
          description="Requires session_id and event counts per session. Use session_id on skill_attempts and chat_messages."
        />
      </div>
    </div>
  )
}
