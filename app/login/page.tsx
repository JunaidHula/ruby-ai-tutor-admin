'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleLogin(e: { preventDefault(): void }) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.user) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }
    const { data: staff } = await supabase
      .from('staff')
      .select('role')
      .eq('user_id', data.user.id)
      .single()
    if (!staff) {
      await supabase.auth.signOut()
      setError('You do not have admin access.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#BE1832] to-[#E8305A] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-gradient-to-b from-[#BE1832] to-[#E8305A] rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-extrabold text-xl">R</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1a2744]">Ruby Admin</h1>
          <p className="text-sm text-gray-400 mt-1">Internal Dashboard · Staff only</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors mt-2">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
