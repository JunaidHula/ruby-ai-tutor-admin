import { createAdminClient } from '@/lib/supabase-admin'
import StatCard from '@/components/StatCard'
import NeedsInstrumentation from '@/components/NeedsInstrumentation'
import { Activity, MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SystemPage() {
  const db = createAdminClient()

  const since7 = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: messages } = await db
    .from('chat_messages')
    .select('created_at')
    .gte('created_at', since7)
    .order('created_at')

  const msgs = messages ?? []
  const totalMessages7d = msgs.length

  // Messages per day (7d window)
  const dayMap: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    dayMap[d] = 0
  }
  for (const m of msgs) {
    const d = (m.created_at ?? '').split('T')[0]
    if (d in dayMap) dayMap[d]++
  }
  const maxDayCount = Math.max(...Object.values(dayMap), 1)
  const avgMsgsPerDay = totalMessages7d > 0 ? Math.round(totalMessages7d / 7) : 0

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">System Health</h1>
      <p className="text-sm text-gray-400 mb-6">Last 7 days — chat volume as proxy for AI request volume</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatCard label="Chat Messages (7d)" value={totalMessages7d.toLocaleString()} icon={<MessageSquare className="w-4 h-4" />} color="blue" />
        <StatCard label="Avg Messages/Day" value={avgMsgsPerDay.toLocaleString()} icon={<Activity className="w-4 h-4" />} color="rose" />
        <StatCard label="AI Logs Table" value="Not set up" sub="See instrumentation below" color="amber" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Chat messages per day (7-day window — AI request proxy)</h2>
        <div className="space-y-2">
          {Object.entries(dayMap).map(([day, count]) => (
            <div key={day} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-24 flex-shrink-0">{day}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / maxDayCount) * 100}%` }} />
              </div>
              <span className="text-xs font-semibold text-gray-700 w-10 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">Needs instrumentation</h2>
      <div className="grid grid-cols-1 gap-3">
        <NeedsInstrumentation
          metric="AI request latency & error rate"
          description="Create an `ai_logs` table: id, user_id, endpoint TEXT, model TEXT (gpt-4o|gpt-4o-mini|groq), prompt_tokens INT, completion_tokens INT, duration_ms INT, status TEXT (success|error), error_message TEXT, created_at. Insert a row after every OpenAI/Groq API call in each API route."
        />
        <NeedsInstrumentation
          metric="Time to first response"
          description="In each streaming API route, record time from request received to first token emitted. Store as first_token_ms in ai_logs."
        />
        <NeedsInstrumentation
          metric="Failed session rate"
          description="Add `error_count` to a sessions table or log uncaught API errors to a separate `error_events` table with user_id, route, error_code, created_at."
        />
        <NeedsInstrumentation
          metric="Fallback usage rate"
          description="When a primary model (GPT-4o) fails and falls back to GPT-4o-mini or Groq, set a `used_fallback: boolean` flag in ai_logs."
        />
        <NeedsInstrumentation
          metric="TTS / Translation call volume"
          description="Add `call_type` to ai_logs: chat|tts|translate|hint. Query count per type per day."
        />
      </div>
    </div>
  )
}
