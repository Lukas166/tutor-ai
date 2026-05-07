import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const cookieHeader = request.headers.get('cookie') ?? ''
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000'

  let session: { user: { role: 'mahasiswa' | 'dosen' | 'admin' } } | null = null

  if (cookieHeader) {
    try {
      const response = await fetch(new URL('/auth/me', backendUrl), {
        headers: { cookie: cookieHeader },
        cache: 'no-store',
      })

      if (response.ok) {
        session = (await response.json()) as { user: { role: 'mahasiswa' | 'dosen' | 'admin' } }
      }
    } catch {
      session = null
    }
  }

  const isAuthenticated = Boolean(session)
  const dashboardPath = session?.user.role === 'mahasiswa' ? '/dashboard/mahasiswa' : '/dashboard/staff'

  if (!isAuthenticated && (pathname.startsWith('/dashboard') || pathname === '/profile')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isAuthenticated && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = dashboardPath
    return NextResponse.redirect(url)
  }

  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = isAuthenticated ? dashboardPath : '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/profile',
  ],
}