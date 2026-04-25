import { redirect } from 'next/navigation'
import { getStaffSession } from '@/lib/session'
import AdminShell from '@/components/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession()
  if (!session) redirect('/login')
  return <AdminShell staff={session.staff}>{children}</AdminShell>
}
