import { createAdminClient } from '@/lib/supabase-admin'
import StatCard from '@/components/StatCard'
import NeedsInstrumentation from '@/components/NeedsInstrumentation'
import { Layers, Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ModesPage() {
  const db = createAdminClient()

  const { data: attempts } = await db
    .from('skill_attempts')
    .select('subject, is_correct, created_at')
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

  const atts = attempts ?? []

  // Subject breakdown
  const subjectStats: Record<string, { correct: number; total: number }> = {}
  for (const a of atts) {
    const subj = a.subject ?? 'unknown'
    if (!subjectStats[subj]) subjectStats[subj] = { correct: 0, total: 0 }
    subjectStats[subj].total++
    if (a.is_correct) subjectStats[subj].correct++
  }
  const totalAttempts = atts.length
  const maxSubjectCount = Math.max(...Object.values(subjectStats).map(v => v.total), 1)
  const subjects = Object.entries(subjectStats).sort((a, b) => b[1].total - a[1].total)

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Mode Usage</h1>
      <p className="text-sm text-gray-400 mb-4">Last 30 days</p>

      {/* Big callout */}
      <div className="bg-amber-100 border border-amber-300 rounded-xl p-5 mb-6">
        <p className="text-sm font-bold text-amber-900 mb-1">This section requires a one-time instrumentation change.</p>
        <p className="text-sm text-amber-800">Once <code className="bg-amber-200 px-1 rounded">mode</code> is added to <code className="bg-amber-200 px-1 rounded">skill_attempts</code>, all charts will populate automatically.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard label="Total Attempts (30d)" value={totalAttempts.toLocaleString()} icon={<Activity className="w-4 h-4" />} color="rose" />
        {subjects.slice(0, 2).map(([subj, v]) => {
          const acc = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0
          return (
            <StatCard
              key={subj}
              label={`${subj.charAt(0).toUpperCase() + subj.slice(1)} accuracy`}
              value={`${acc}%`}
              icon={<Layers className="w-4 h-4" />}
              color="blue"
              sub={`${v.total.toLocaleString()} attempts`}
            />
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Subject breakdown bar chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Attempts by subject (proxy for mode split)</h2>
          <div className="space-y-3">
            {subjects.map(([subj, v]) => {
              const pct = totalAttempts > 0 ? Math.round((v.total / totalAttempts) * 100) : 0
              return (
                <div key={subj}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="capitalize font-medium">{subj}</span>
                    <span>{v.total.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(v.total / maxSubjectCount) * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Accuracy by subject */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Accuracy by subject</h2>
          <div className="space-y-3">
            {subjects.map(([subj, v]) => {
              const acc = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0
              return (
                <div key={subj}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="capitalize font-medium">{subj}</span>
                    <span>{acc}%</span>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${acc}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Needs instrumentation</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <NeedsInstrumentation
          metric="Guide vs Practice vs Socratic split"
          description="Add `mode` enum column to skill_attempts. Values: 'practice' | 'socratic' | 'guided'. Set when a question attempt is created based on the active session mode."
        />
        <NeedsInstrumentation
          metric="Mode transition patterns"
          description="Add a `mode_sessions` table: user_id, mode, started_at, ended_at. Insert a row each time user switches mode."
        />
        <NeedsInstrumentation
          metric="Session length per mode"
          description="Requires mode_sessions table above."
        />
        <NeedsInstrumentation
          metric="Outcomes by mode"
          description="Once mode column exists on skill_attempts, group accuracy and p_learned by mode."
        />
      </div>
    </div>
  )
}
