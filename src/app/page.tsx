import { redirect } from 'next/navigation'
import { getDashboardPath } from '@/lib/auth-types'
import { getServerSession } from '@/lib/session'

export default async function Home() {
  const session = await getServerSession()

  if (session) {
    redirect(getDashboardPath(session.user.role))
  }

  redirect('/login')
}