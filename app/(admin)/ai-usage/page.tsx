import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export default async function AIUsagePage() {
  const db = createAdminClient()
  const { data: chatMessages } = await db
    .from('chat_messages')
    .select('created_at')
    .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

  const byDay: Record<string, number> = {}
  for (const m of chatMessages ?? []) {
    const d = m.created_at.split('T')[0]
    byDay[d] = (byDay[d] ?? 0) + 1
  }
  const totalMessages30d = chatMessages?.length ?? 0

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold text-gray-900 mb-2">AI Usage</h1>
      <p className="text-sm text-gray-400 mb-6">Last 30 days</p>

      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <p className="text-sm font-medium text-gray-700">Total chat messages: <span className="font-extrabold text-gray-900">{totalMessages30d.toLocaleString()}</span></p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Messages per day</h2>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {Object.entries(byDay).sort(([a], [b]) => b.localeCompare(a)).map(([date, count]) => {
            const max = Math.max(...Object.values(byDay))
            return (
              <div key={date} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0">{date}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-12 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">To enable full AI cost tracking</h3>
        <p className="text-sm text-amber-700">Create an <code className="bg-amber-100 px-1 rounded">ai_logs</code> table in Supabase to record endpoint, model, prompt_tokens, completion_tokens, and cost per API call. Insert a row from each API route after each OpenAI/Groq call.</p>
      </div>
    </div>
  )
}
