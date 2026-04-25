import { createAdminClient } from '@/lib/supabase-admin'
import StatCard from '@/components/StatCard'
import { BookOpen, Target, Zap, BarChart2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EngagementPage() {
  const db = createAdminClient()

  const [
    { data: attempts7d },
    { data: diagnostics },
    { data: reports },
    { data: streaks },
    { data: skillFailures },
  ] = await Promise.all([
    db.from('skill_attempts').select('subject, is_correct, p_learned, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    db.from('diagnostic_results').select('subject, completed_at'),
    db.from('student_reports').select('subject, generated_at'),
    db.from('user_streaks').select('current_streak, best_streak').order('current_streak', { ascending: false }).limit(100),
    db.from('skill_attempts').select('skill_id, is_correct').eq('is_correct', false)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
  ])

  const totalAttempts = attempts7d?.length ?? 0
  const correctAttempts = (attempts7d ?? []).filter(a => a.is_correct).length
  const accuracyRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0

  const avgPLearned = (() => {
    const withP = (attempts7d ?? []).filter(a => a.p_learned != null)
    if (!withP.length) return 0
    return (withP.reduce((s, a) => s + (a.p_learned ?? 0), 0) / withP.length * 100).toFixed(1)
  })()

  // Attempts by subject
  const bySubject: Record<string, { total: number; correct: number }> = {}
  for (const a of attempts7d ?? []) {
    if (!bySubject[a.subject]) bySubject[a.subject] = { total: 0, correct: 0 }
    bySubject[a.subject].total++
    if (a.is_correct) bySubject[a.subject].correct++
  }

  // Most failed skills (last 30 days)
  const failCounts: Record<string, number> = {}
  for (const a of skillFailures ?? []) failCounts[a.skill_id] = (failCounts[a.skill_id] ?? 0) + 1
  const topFails = Object.entries(failCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Streak distribution
  const streakBuckets: Record<string, number> = { '0': 0, '1-3': 0, '4-7': 0, '8-14': 0, '15+': 0 }
  for (const s of streaks ?? []) {
    const cs = s.current_streak
    if (cs === 0) streakBuckets['0']++
    else if (cs <= 3) streakBuckets['1-3']++
    else if (cs <= 7) streakBuckets['4-7']++
    else if (cs <= 14) streakBuckets['8-14']++
    else streakBuckets['15+']++
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-bold text-gray-900 mb-5">Learning Engagement</h1>
      <p className="text-sm text-gray-400 -mt-3 mb-5">Last 7 days unless noted</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Attempts (7d)" value={totalAttempts.toLocaleString()} icon={<Target className="w-4 h-4" />} />
        <StatCard label="Accuracy Rate" value={`${accuracyRate}%`} icon={<Zap className="w-4 h-4" />} color="green" />
        <StatCard label="Avg P(Learned)" value={`${avgPLearned}%`} icon={<BarChart2 className="w-4 h-4" />} color="blue" sub="BKT signal" />
        <StatCard label="Reports Generated" value={reports?.length ?? 0} icon={<BookOpen className="w-4 h-4" />} color="amber" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* By subject */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Attempts by subject</h2>
          {Object.entries(bySubject).map(([subject, { total, correct }]) => (
            <div key={subject} className="py-2 border-b border-gray-50 last:border-0">
              <div className="flex justify-between mb-1">
                <span className="text-sm capitalize text-gray-700">{subject}</span>
                <span className="text-xs text-gray-500">{total} ({Math.round(correct / total * 100)}% correct)</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${(correct / total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Streak distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Streak distribution</h2>
          {Object.entries(streakBuckets).map(([bucket, count]) => (
            <div key={bucket} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-600">{bucket} days</span>
              <span className="text-sm font-semibold text-gray-900">{count}</span>
            </div>
          ))}
        </div>

        {/* Diagnostics */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Diagnostics completed</h2>
          {(() => {
            const bySubj: Record<string, number> = {}
            for (const d of diagnostics ?? []) bySubj[d.subject] = (bySubj[d.subject] ?? 0) + 1
            return Object.entries(bySubj).map(([s, c]) => (
              <div key={s} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm capitalize text-gray-700">{s}</span>
                <span className="text-sm font-semibold text-gray-900">{c}</span>
              </div>
            ))
          })()}
        </div>
      </div>

      {/* Most failed skills */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Most failed skills — last 30 days</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Skill ID</th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Failed Attempts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {topFails.map(([skill, count]) => (
              <tr key={skill} className="hover:bg-gray-50">
                <td className="py-2 font-mono text-xs text-gray-700">{skill}</td>
                <td className="py-2 font-semibold text-red-600">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
