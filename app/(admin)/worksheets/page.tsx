import { createAdminClient } from '@/lib/supabase-admin'
import StatCard from '@/components/StatCard'
import NeedsInstrumentation from '@/components/NeedsInstrumentation'
import { FileText, CheckCircle, HelpCircle, Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function WorksheetsPage() {
  const db = createAdminClient()

  const since30 = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data: attempts } = await db
    .from('skill_attempts')
    .select('skill_id, subject, is_correct, scaffolded, error_type, student_id, created_at')
    .gte('created_at', since30)

  const atts = attempts ?? []

  // Total attempts, correct, accuracy
  const totalAttempts = atts.length
  const totalCorrect = atts.filter(a => a.is_correct).length
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  // Hint usage rate
  const scaffoldedCount = atts.filter(a => a.scaffolded === true).length
  const hintRate = totalAttempts > 0 ? Math.round((scaffoldedCount / totalAttempts) * 100) : 0

  // Accuracy by subject
  const subjectStats: Record<string, { correct: number; total: number }> = {}
  for (const a of atts) {
    const subj = a.subject ?? 'unknown'
    if (!subjectStats[subj]) subjectStats[subj] = { correct: 0, total: 0 }
    subjectStats[subj].total++
    if (a.is_correct) subjectStats[subj].correct++
  }

  // Error type breakdown
  const errorTypeCounts: Record<string, number> = {}
  for (const a of atts) {
    if (a.error_type) {
      errorTypeCounts[a.error_type] = (errorTypeCounts[a.error_type] ?? 0) + 1
    }
  }
  const sortedErrors = Object.entries(errorTypeCounts).sort((a, b) => b[1] - a[1])
  const maxErrorCount = sortedErrors[0]?.[1] ?? 1

  // First-attempt correctness per (student, skill) per day
  const firstAttemptMap: Record<string, { correct: number; total: number }> = {}
  for (const a of atts) {
    if (!a.student_id || !a.skill_id) continue
    const day = (a.created_at ?? '').split('T')[0]
    const key = `${a.student_id}__${a.skill_id}__${day}`
    if (!firstAttemptMap[key]) {
      firstAttemptMap[key] = { correct: a.is_correct ? 1 : 0, total: 1 }
    }
    // already recorded first attempt
  }
  const firstAttempts = Object.values(firstAttemptMap)
  const firstAttemptCorrect = firstAttempts.filter(v => v.correct > 0).length
  const firstAttemptAccuracy = firstAttempts.length > 0 ? Math.round((firstAttemptCorrect / firstAttempts.length) * 100) : 0

  // Retry rate
  const pairCountByDay: Record<string, number> = {}
  for (const a of atts) {
    if (!a.student_id || !a.skill_id) continue
    const day = (a.created_at ?? '').split('T')[0]
    const key = `${a.student_id}__${a.skill_id}__${day}`
    pairCountByDay[key] = (pairCountByDay[key] ?? 0) + 1
  }
  const totalPairs = Object.keys(pairCountByDay).length
  const retryPairs = Object.values(pairCountByDay).filter(c => c > 1).length
  const retryRate = totalPairs > 0 ? Math.round((retryPairs / totalPairs) * 100) : 0

  // Daily accuracy trend last 30 days
  const dayMap: Record<string, { correct: number; total: number }> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    dayMap[d] = { correct: 0, total: 0 }
  }
  for (const a of atts) {
    const day = (a.created_at ?? '').split('T')[0]
    if (day in dayMap) {
      dayMap[day].total++
      if (a.is_correct) dayMap[day].correct++
    }
  }

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Worksheet & Practice Effectiveness</h1>
      <p className="text-sm text-gray-400 mb-6">Last 30 days</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Attempts" value={totalAttempts.toLocaleString()} icon={<FileText className="w-4 h-4" />} color="rose" />
        <StatCard label="Overall Accuracy" value={`${overallAccuracy}%`} icon={<CheckCircle className="w-4 h-4" />} color="green" />
        <StatCard label="Hint Usage Rate" value={`${hintRate}%`} icon={<HelpCircle className="w-4 h-4" />} color="amber" sub={`${scaffoldedCount} scaffolded`} />
        <StatCard label="Retry Rate" value={`${retryRate}%`} icon={<Activity className="w-4 h-4" />} color="blue" sub="same skill, same day" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 mb-6">
        <StatCard label="First-Attempt Accuracy" value={`${firstAttemptAccuracy}%`} sub="First attempt per (student, skill, day)" />
        <StatCard label="Unique (student, skill) pairs" value={totalPairs.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Accuracy by subject */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Accuracy by subject</h2>
          {Object.entries(subjectStats).sort((a, b) => b[1].total - a[1].total).map(([subj, v]) => {
            const acc = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0
            return (
              <div key={subj} className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span className="capitalize font-medium">{subj}</span>
                  <span>{acc}% ({v.total} attempts)</span>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${acc}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Error type breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Error type breakdown</h2>
          {sortedErrors.length === 0 ? (
            <p className="text-xs text-gray-400">No error type data recorded</p>
          ) : (
            <div className="space-y-1.5">
              {sortedErrors.map(([errType, count]) => (
                <div key={errType} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-32 flex-shrink-0 truncate">{errType}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-red-400 h-2 rounded-full" style={{ width: `${(count / maxErrorCount) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-10 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily accuracy trend */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Daily accuracy trend — last 30 days</h2>
          <div className="space-y-1">
            {Object.entries(dayMap).map(([day, v]) => {
              const acc = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-24 flex-shrink-0">{day}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${acc}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-20 text-right">{v.total > 0 ? `${acc}% (${v.total})` : '—'}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Needs instrumentation</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <NeedsInstrumentation
          metric="Time per question"
          description="Add `duration_ms` to skill_attempts. Record timestamp when question is shown and when answer is submitted."
        />
        <NeedsInstrumentation
          metric="Worksheet completion rate"
          description="Add a `worksheet_id` column to skill_attempts grouping questions into named sets. Track start+completion events."
        />
        <NeedsInstrumentation
          metric="Drop-off per question index"
          description="Add `question_index` to skill_attempts (position within a worksheet). Abandonment = no further attempts after index N."
        />
        <NeedsInstrumentation
          metric="Language selection"
          description="Add `language` column to skill_attempts (inherit from user session language at time of attempt)."
        />
      </div>
    </div>
  )
}
