import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  response.cookies.set('tutor_ai_token', '', {
    path: '/',
    expires: new Date(0),
  })

  return response
}