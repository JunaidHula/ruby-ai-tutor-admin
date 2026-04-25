import { createAdminClient } from '@/lib/supabase-admin'
import StatCard from '@/components/StatCard'
import NeedsInstrumentation from '@/components/NeedsInstrumentation'
import { Target, BookOpen, TrendingUp, List } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PlacementPage() {
  const db = createAdminClient()

  const [
    { data: diagnostics },
    { data: profiles },
    { data: users },
  ] = await Promise.all([
    db.from('diagnostic_results').select('student_id, subject, entry_level, entry_skill_id, completed_at, created_at').order('created_at', { ascending: false }),
    db.from('student_profiles').select('id, subject, grade, auth_user_id').neq('auth_user_id', null),
    db.from('users').select('id, grade').not('grade', 'is', null),
  ])

  const diags = diagnostics ?? []
  const profs = profiles ?? []
  const usrs = users ?? []

  // Total diagnostics
  const totalDiagnostics = diags.length

  // By subject
  const bySubject: Record<string, number> = {}
  for (const d of diags) {
    const subj = d.subject ?? 'unknown'
    bySubject[subj] = (bySubject[subj] ?? 0) + 1
  }

  // Entry level distribution
  const entryLevelDist: Record<string, number> = {}
  for (const d of diags) {
    const lvl = String(d.entry_level ?? 'unknown')
    entryLevelDist[lvl] = (entryLevelDist[lvl] ?? 0) + 1
  }
  const maxEntryCount = Math.max(...Object.values(entryLevelDist), 1)

  // Placement vs user grade
  const userGradeMap = Object.fromEntries(usrs.map(u => [u.id, Number(u.grade)]))
  // profiles map: auth_user_id -> profile
  const profileByAuth: Record<string, typeof profs[0]> = {}
  for (const p of profs) {
    if (p.auth_user_id) profileByAuth[p.auth_user_id] = p
  }

  let belowGrade = 0, atGrade = 0, aboveGrade = 0, noMatch = 0
  for (const d of diags) {
    // find profile for this student
    const profile = profs.find(p => p.id === d.student_id)
    if (!profile?.auth_user_id) { noMatch++; continue }
    const userGrade = userGradeMap[profile.auth_user_id]
    if (userGrade === undefined) { noMatch++; continue }
    const entryLevel = Number(d.entry_level)
    if (isNaN(entryLevel)) { noMatch++; continue }
    if (entryLevel < userGrade) belowGrade++
    else if (entryLevel === userGrade) atGrade++
    else aboveGrade++
  }
  const placementTotal = belowGrade + atGrade + aboveGrade || 1

  // Diagnostics per day last 30 days
  const dayMap: Record<string, number> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    dayMap[d] = 0
  }
  for (const d of diags) {
    const day = (d.created_at ?? '').split('T')[0]
    if (day in dayMap) dayMap[day]++
  }
  const maxDayCount = Math.max(...Object.values(dayMap), 1)

  // Top 10 most common entry_skill_ids
  const skillIdCount: Record<string, number> = {}
  for (const d of diags) {
    if (d.entry_skill_id) {
      skillIdCount[d.entry_skill_id] = (skillIdCount[d.entry_skill_id] ?? 0) + 1
    }
  }
  const top10Skills = Object.entries(skillIdCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  const maxSkillCount = top10Skills[0]?.[1] ?? 1

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Discovery & Placement Quality</h1>
      <p className="text-sm text-gray-400 mb-6">All time — diagnostic results</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Diagnostics" value={totalDiagnostics.toLocaleString()} icon={<Target className="w-4 h-4" />} color="rose" />
        <StatCard label="Maths Diagnostics" value={(bySubject['maths'] ?? 0).toLocaleString()} icon={<TrendingUp className="w-4 h-4" />} color="blue" />
        <StatCard label="Reading Diagnostics" value={(bySubject['reading'] ?? 0).toLocaleString()} icon={<BookOpen className="w-4 h-4" />} color="green" />
        <StatCard label="Skills Mapped" value={Object.keys(skillIdCount).length.toLocaleString()} icon={<List className="w-4 h-4" />} color="amber" />
      </div>

      {/* 2-col grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

        {/* Entry level distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Entry level distribution</h2>
          <div className="space-y-1.5">
            {Object.entries(entryLevelDist).sort(([a], [b]) => Number(a) - Number(b)).map(([lvl, count]) => (
              <div key={lvl} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16 flex-shrink-0">Level {lvl}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${(count / maxEntryCount) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-10 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Placement vs user grade */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Placement vs user grade</h2>
          <p className="text-xs text-gray-400 mb-3">Based on {belowGrade + atGrade + aboveGrade} matched diagnostics</p>
          {[
            { label: 'Below grade', value: belowGrade, color: 'bg-amber-400' },
            { label: 'At grade', value: atGrade, color: 'bg-green-500' },
            { label: 'Above grade', value: aboveGrade, color: 'bg-blue-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-3 mb-2">
              <span className="text-xs text-gray-500 w-24 flex-shrink-0">{label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className={`${color} h-2 rounded-full`} style={{ width: `${(value / placementTotal) * 100}%` }} />
              </div>
              <span className="text-xs font-semibold text-gray-700 w-16 text-right">
                {value} ({Math.round((value / placementTotal) * 100)}%)
              </span>
            </div>
          ))}
          {noMatch > 0 && <p className="text-xs text-gray-400 mt-2">{noMatch} diagnostics could not be matched to a user grade</p>}
        </div>

        {/* Diagnostics per day — last 30 days */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Diagnostics per day — last 30 days</h2>
          <div className="space-y-1">
            {Object.entries(dayMap).map(([day, count]) => (
              <div key={day} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24 flex-shrink-0">{day}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(count / maxDayCount) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 entry skill IDs */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Top 10 entry skill IDs</h2>
          <div className="space-y-1.5">
            {top10Skills.map(([skillId, count]) => (
              <div key={skillId} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-32 flex-shrink-0 truncate" title={skillId}>{skillId}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(count / maxSkillCount) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Needs instrumentation */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Needs instrumentation</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <NeedsInstrumentation
          metric="Diagnostic drop-off"
          description="Add a `diagnostic_sessions` table with columns: `user_id`, `subject`, `status` (started|abandoned|completed), `started_at`, `completed_at`. Insert 'started' when diagnostic begins, update to 'completed' or 'abandoned'."
        />
        <NeedsInstrumentation
          metric="Re-adjustment rate"
          description="Add `adjusted_entry_level` and `adjusted_at` to `diagnostic_results` when a teacher or AI overrides placement."
        />
        <NeedsInstrumentation
          metric="Placement confidence score"
          description="Store a `confidence` float (0–1) in `diagnostic_results` from the BKT engine at completion time."
        />
        <NeedsInstrumentation
          metric="Time to correct placement"
          description="Requires the diagnostic_sessions table above plus a teacher-correction event log."
        />
      </div>
    </div>
  )
}
