import { createAdminClient } from '@/lib/supabase-admin'
import StatCard from '@/components/StatCard'
import NeedsInstrumentation from '@/components/NeedsInstrumentation'
import { Brain, TrendingUp, Activity, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SkillsPage() {
  const db = createAdminClient()

  const since30 = new Date(Date.now() - 30 * 86400000).toISOString()
  const [
    { data: attempts },
    { data: recentAttempts },
  ] = await Promise.all([
    db.from('skill_attempts').select('skill_id, subject, is_correct, p_learned, student_id, created_at').gte('created_at', since30),
    db.from('skill_attempts').select('skill_id, student_id, is_correct, p_learned, created_at').order('created_at'),
  ])

  const atts = attempts ?? []
  const allAtts = recentAttempts ?? []

  // Total attempts last 30d
  const totalAttempts = atts.length

  // Unique skills attempted
  const uniqueSkills = new Set(atts.map(a => a.skill_id).filter(Boolean)).size

  // Overall mastery rate
  const withPLearned = atts.filter(a => a.p_learned != null)
  const masteredCount = withPLearned.filter(a => (a.p_learned ?? 0) >= 0.8).length
  const masteryRate = withPLearned.length > 0 ? Math.round((masteredCount / withPLearned.length) * 100) : 0

  // Avg p_learned
  const avgPLearned = withPLearned.length > 0
    ? (withPLearned.reduce((s, a) => s + (a.p_learned ?? 0), 0) / withPLearned.length).toFixed(3)
    : '—'

  // Top 15 most attempted skills
  const skillAttemptCount: Record<string, number> = {}
  for (const a of atts) {
    if (a.skill_id) skillAttemptCount[a.skill_id] = (skillAttemptCount[a.skill_id] ?? 0) + 1
  }
  const top15Attempted = Object.entries(skillAttemptCount).sort((a, b) => b[1] - a[1]).slice(0, 15)
  const maxAttempted = top15Attempted[0]?.[1] ?? 1

  // Top 15 most failed (lowest correct rate, min 10 attempts)
  const skillCorrect: Record<string, { correct: number; total: number }> = {}
  for (const a of atts) {
    if (!a.skill_id) continue
    if (!skillCorrect[a.skill_id]) skillCorrect[a.skill_id] = { correct: 0, total: 0 }
    skillCorrect[a.skill_id].total++
    if (a.is_correct) skillCorrect[a.skill_id].correct++
  }
  const top15Failed = Object.entries(skillCorrect)
    .filter(([, v]) => v.total >= 10)
    .map(([id, v]) => ({ id, rate: v.correct / v.total, total: v.total }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 15)

  // Skills with highest mastery (top 10 by avg p_learned)
  const skillPLearned: Record<string, number[]> = {}
  for (const a of atts) {
    if (a.skill_id && a.p_learned != null) {
      if (!skillPLearned[a.skill_id]) skillPLearned[a.skill_id] = []
      skillPLearned[a.skill_id].push(a.p_learned)
    }
  }
  const top10Mastery = Object.entries(skillPLearned)
    .map(([id, vals]) => ({ id, avg: vals.reduce((s, v) => s + v, 0) / vals.length }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10)

  // Failure clustering: >60% wrong
  const failureClusters = Object.entries(skillCorrect)
    .filter(([, v]) => v.total >= 5 && (1 - v.correct / v.total) > 0.6)
    .sort((a, b) => (1 - b[1].correct / b[1].total) - (1 - a[1].correct / a[1].total))

  // Skill decay: p_learned >= 0.8 then dropped below 0.6
  const skillStudentPLearned: Record<string, number[]> = {}
  for (const a of allAtts) {
    if (!a.skill_id || !a.student_id || a.p_learned == null) continue
    const key = `${a.student_id}__${a.skill_id}`
    if (!skillStudentPLearned[key]) skillStudentPLearned[key] = []
    skillStudentPLearned[key].push(a.p_learned)
  }
  let decayEvents = 0
  for (const vals of Object.values(skillStudentPLearned)) {
    let peaked = false
    for (const v of vals) {
      if (v >= 0.8) peaked = true
      if (peaked && v < 0.6) { decayEvents++; break }
    }
  }

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Skill-Level Intelligence</h1>
      <p className="text-sm text-gray-400 mb-6">Last 30 days</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Attempts" value={totalAttempts.toLocaleString()} icon={<Activity className="w-4 h-4" />} color="rose" />
        <StatCard label="Unique Skills" value={uniqueSkills.toLocaleString()} icon={<Brain className="w-4 h-4" />} color="blue" />
        <StatCard label="Mastery Rate" value={`${masteryRate}%`} icon={<TrendingUp className="w-4 h-4" />} color="green" sub="p_learned ≥ 0.8" />
        <StatCard label="Avg p_learned" value={avgPLearned} icon={<Activity className="w-4 h-4" />} color="amber" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 mb-6">
        <StatCard label="Skill Decay Events" value={decayEvents.toLocaleString()} sub="p_learned ≥0.8 then <0.6" />
        <StatCard label="Failure Clusters" value={failureClusters.length.toLocaleString()} sub="Skills >60% wrong (≥5 attempts)" color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Top 15 attempted */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Top 15 most attempted skills</h2>
          <div className="space-y-1.5">
            {top15Attempted.map(([skillId, count]) => (
              <div key={skillId} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-32 flex-shrink-0 truncate" title={skillId}>{skillId}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / maxAttempted) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-10 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 15 failed */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Top 15 most failed skills (min 10 attempts)</h2>
          <div className="space-y-1.5">
            {top15Failed.map(({ id, rate, total }) => (
              <div key={id} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-32 flex-shrink-0 truncate" title={id}>{id}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-red-400 h-2 rounded-full" style={{ width: `${(1 - rate) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-20 text-right">{Math.round((1 - rate) * 100)}% fail ({total})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 by mastery */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Top 10 skills by mastery (avg p_learned)</h2>
          <div className="space-y-1.5">
            {top10Mastery.map(({ id, avg }) => (
              <div key={id} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-32 flex-shrink-0 truncate" title={id}>{id}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${avg * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-12 text-right">{(avg * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Failure clusters */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Failure clusters (&gt;60% wrong, ≥5 attempts)</h2>
          {failureClusters.length === 0 ? (
            <p className="text-xs text-gray-400">No failure clusters found</p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {failureClusters.map(([id, v]) => (
                <div key={id} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-700 truncate flex-1" title={id}>{id}</span>
                  <span className="text-xs font-semibold text-red-600 ml-2 flex-shrink-0">
                    {Math.round((1 - v.correct / v.total) * 100)}% wrong ({v.total})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Needs instrumentation</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <NeedsInstrumentation
          metric="Skill revisit rate"
          description="Requires session-level tagging on skill_attempts to identify intentional revisits vs continuation."
        />
        <NeedsInstrumentation
          metric="Content effectiveness score"
          description="Add a `content_version` column to skill_attempts to A/B test different question sets per skill."
        />
        <NeedsInstrumentation
          metric="Attempts to reach mastery (per user)"
          description="Requires linking student_id in skill_attempts to auth_user_id — currently student_id is a local profile ID, not auth UUID."
        />
      </div>
    </div>
  )
}
