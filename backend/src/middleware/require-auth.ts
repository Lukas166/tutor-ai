import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env'
import { getSessionCookieOptions, verifySessionToken } from '../lib/jwt'
import { buildSession, ensureProfile } from '../lib/profile'
import type { AuthContext } from '../types/auth'

function extractToken(req: Request) {
  const authorizationHeader = req.header('authorization')
  if (authorizationHeader?.startsWith('Bearer ')) {
    return authorizationHeader.slice(7).trim()
  }

  return req.cookies?.[env.COOKIE_NAME] ?? null
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req)

  if (!token) {
    return res.status(401).json({ message: 'Sesi login tidak ditemukan.' })
  }

  try {
    const payload = verifySessionToken(token)
    const profile = await ensureProfile({
      userId: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      avatarUrl: payload.avatarUrl,
      role: payload.role,
    })

    const session = buildSession(profile)
    const authContext: AuthContext = {
      token,
      user: session.user,
      profile: session.profile,
      session,
    }

    req.auth = authContext
    return next()
  } catch {
    res.clearCookie(env.COOKIE_NAME, getSessionCookieOptions())
    return res.status(401).json({ message: 'Sesi tidak valid atau sudah kedaluwarsa.' })
  }
}
