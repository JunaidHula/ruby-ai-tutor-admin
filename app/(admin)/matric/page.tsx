import { createAdminClient } from '@/lib/supabase-admin'
import StatCard from '@/components/StatCard'
import NeedsInstrumentation from '@/components/NeedsInstrumentation'
import { GraduationCap, BookOpen, CheckCircle, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MatricPage() {
  const db = createAdminClient()

  const [
    { data: paperProgress },
    { data: matricAttempts },
  ] = await Promise.all([
    db.from('matric_paper_progress').select('user_id, paper_id, status, pct, updated_at'),
    db.from('skill_attempts').select('subject, skill_id, is_correct, student_id, created_at').eq('subject', 'matric').limit(5000),
  ])

  const progress = paperProgress ?? []
  const matAtts = matricAttempts ?? []

  // Users with any matric activity
  const uniqueUsers = new Set(progress.map(p => p.user_id).filter(Boolean)).size

  // Papers started / completed
  const papersStarted = progress.filter(p => p.status === 'in_progress' || p.status === 'completed').length
  const papersCompleted = progress.filter(p => p.status === 'completed').length
  const completionRate = papersStarted > 0 ? Math.round((papersCompleted / papersStarted) * 100) : 0

  // Avg pct for in-progress
  const inProgressPcts = progress.filter(p => p.status === 'in_progress' && p.pct != null).map(p => p.pct ?? 0)
  const avgPct = inProgressPcts.length > 0
    ? Math.round(inProgressPcts.reduce((s, v) => s + v, 0) / inProgressPcts.length)
    : 0

  // Status breakdown
  const statusBreakdown: Record<string, number> = {}
  for (const p of progress) {
    const s = p.status ?? 'unknown'
    statusBreakdown[s] = (statusBreakdown[s] ?? 0) + 1
  }

  // Top 10 most attempted papers
  const paperUserCount: Record<string, Set<string>> = {}
  for (const p of progress) {
    if (!p.paper_id) continue
    if (!paperUserCount[p.paper_id]) paperUserCount[p.paper_id] = new Set()
    if (p.user_id) paperUserCount[p.paper_id].add(p.user_id)
  }
  const top10Papers = Object.entries(paperUserCount)
    .map(([paperId, users]) => ({ paperId, count: users.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  const maxPaperCount = top10Papers[0]?.count ?? 1

  // Avg pct per paper (min 3 users)
  const paperPct: Record<string, number[]> = {}
  for (const p of progress) {
    if (!p.paper_id || p.pct == null) continue
    if (!paperPct[p.paper_id]) paperPct[p.paper_id] = []
    paperPct[p.paper_id].push(p.pct)
  }
  const avgPctPerPaper = Object.entries(paperPct)
    .filter(([, vals]) => vals.length >= 3)
    .map(([paperId, vals]) => ({
      paperId,
      avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10)

  // Subject prefix from paper_id
  const subjectDist: Record<string, number> = {}
  for (const p of progress) {
    if (!p.paper_id) continue
    const subject = p.paper_id.split('_')[0]
    subjectDist[subject] = (subjectDist[subject] ?? 0) + 1
  }
  const maxSubjectCount = Math.max(...Object.values(subjectDist), 1)

  // Skill attempts for matric
  const matricAttemptCount = matAtts.length
  const matricCorrect = matAtts.filter(a => a.is_correct).length
  const matricAccuracy = matricAttemptCount > 0 ? Math.round((matricCorrect / matricAttemptCount) * 100) : 0

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Matric Behaviour</h1>
      <p className="text-sm text-gray-400 mb-6">All matric paper progress</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Matric Users" value={uniqueUsers.toLocaleString()} icon={<GraduationCap className="w-4 h-4" />} color="rose" />
        <StatCard label="Papers Started" value={papersStarted.toLocaleString()} icon={<BookOpen className="w-4 h-4" />} color="blue" />
        <StatCard label="Papers Completed" value={papersCompleted.toLocaleString()} icon={<CheckCircle className="w-4 h-4" />} color="green" />
        <StatCard label="Completion Rate" value={`${completionRate}%`} icon={<TrendingUp className="w-4 h-4" />} color="amber" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard label="Avg % (in-progress)" value={`${avgPct}%`} sub="Average pct for in-progress papers" />
        <StatCard label="Matric Skill Attempts" value={matricAttemptCount.toLocaleString()} sub="Last 5000 attempts" />
        <StatCard label="Matric Accuracy" value={`${matricAccuracy}%`} sub="Skill attempts correct %" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Status breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Status breakdown</h2>
          {Object.entries(statusBreakdown).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
            const total = progress.length || 1
            return (
              <div key={status} className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-500 w-28 flex-shrink-0 capitalize">{status.replace('_', ' ')}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-20 text-right">{count} ({Math.round((count / total) * 100)}%)</span>
              </div>
            )
          })}
        </div>

        {/* Subject distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Subject distribution (from paper_id prefix)</h2>
          <div className="space-y-1.5">
            {Object.entries(subjectDist).sort((a, b) => b[1] - a[1]).map(([subj, count]) => (
              <div key={subj} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0 uppercase">{subj}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(count / maxSubjectCount) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-10 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 papers */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Top 10 most attempted papers</h2>
          <div className="space-y-1.5">
            {top10Papers.map(({ paperId, count }) => (
              <div key={paperId} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-36 flex-shrink-0 truncate" title={paperId}>{paperId}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / maxPaperCount) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-10 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Avg pct per paper */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Avg % per paper (min 3 users)</h2>
          {avgPctPerPaper.length === 0 ? (
            <p className="text-xs text-gray-400">Not enough data</p>
          ) : (
            <div className="space-y-1.5">
              {avgPctPerPaper.map(({ paperId, avg }) => (
                <div key={paperId} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-36 flex-shrink-0 truncate" title={paperId}>{paperId}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${avg}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-10 text-right">{avg}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Needs instrumentation</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <NeedsInstrumentation
          metric="Subject combination patterns"
          description="Add a `matric_subjects` column (text[]) to users table, set during onboarding subject selection."
        />
        <NeedsInstrumentation
          metric="Mode usage per subject"
          description="Add `mode` column (guide|practice|socratic) to matric_paper_progress or a new matric_sessions table."
        />
        <NeedsInstrumentation
          metric="Time spent per subject"
          description="Add `total_time_ms` to matric_paper_progress, updated on each session."
        />
        <NeedsInstrumentation
          metric="Language distribution"
          description="Add `language` to matric_paper_progress (language active when paper was attempted)."
        />
        <NeedsInstrumentation
          metric="Syllabus coverage %"
          description="Requires a syllabus_skills reference table mapping subject → required skill_ids, to compare against skill_attempts."
        />
      </div>
    </div>
  )
}
