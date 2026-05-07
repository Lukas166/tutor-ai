import { cookies } from 'next/headers'
import { backendUrl } from './backend'
import type { AppSession } from './auth-types'

function serializeCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join('; ')
}

export async function getServerSession(): Promise<AppSession | null> {
  try {
    const cookieStore = await cookies()
    const cookieHeader = serializeCookies(cookieStore)

    const response = await fetch(new URL('/auth/me', backendUrl), {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as AppSession
  } catch {
    return null
  }
}
