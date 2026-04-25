'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, DollarSign, BookOpen, Cpu, Settings, LogOut,
  Target, Brain, FileText, MessageSquare, GraduationCap, Layers, TrendingUp,
  CreditCard, Activity,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/users', label: 'Users', icon: Users },
    ],
  },
  {
    label: 'Learning',
    items: [
      { href: '/placement', label: 'Placement', icon: Target },
      { href: '/skills', label: 'Skills', icon: Brain },
      { href: '/worksheets', label: 'Worksheets', icon: FileText },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { href: '/chat', label: 'Chat', icon: MessageSquare },
      { href: '/matric', label: 'Matric', icon: GraduationCap },
      { href: '/modes', label: 'Modes', icon: Layers },
      { href: '/retention', label: 'Retention', icon: TrendingUp },
    ],
  },
  {
    label: 'Business',
    items: [
      { href: '/revenue', label: 'Revenue', icon: DollarSign },
      { href: '/monetisation', label: 'Monetisation', icon: CreditCard },
      { href: '/content', label: 'Content & Ops', icon: Settings },
    ],
  },
  {
    label: 'Technical',
    items: [
      { href: '/ai-usage', label: 'AI Usage', icon: Cpu },
      { href: '/system', label: 'System Health', icon: Activity },
    ],
  },
]

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-primary-500/20 text-primary-100',
  admin: 'bg-blue-500/20 text-blue-300',
  viewer: 'bg-gray-500/20 text-gray-300',
}

interface Staff { id: string; email: string; role: string }

export default function AdminShell({ staff, children }: { staff: Staff; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="w-56 bg-gradient-to-b from-[#BE1832] to-[#E8305A] flex flex-col flex-shrink-0">
        <div className="px-5 py-4 border-b border-white/20">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-extrabold text-sm">R</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Ruby Admin</p>
              <p className="text-white/50 text-xs mt-0.5">Analytics</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-3">
              <p className="px-3 mb-1 text-[10px] font-semibold text-white/30 uppercase tracking-widest">{group.label}</p>
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link key={href} href={href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active ? 'bg-white/25 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-white/20">
          <div className="px-3 py-2 mb-1">
            <p className="text-white/90 text-xs font-medium truncate">{staff.email}</p>
            <span className={`inline-block text-xs px-1.5 py-0.5 rounded mt-0.5 ${ROLE_COLORS[staff.role] ?? ROLE_COLORS.viewer}`}>
              {staff.role.replace('_', ' ')}
            </span>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  )
}
