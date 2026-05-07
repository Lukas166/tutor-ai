import jwt from 'jsonwebtoken'
import { env, isProduction } from '../config/env'
import type { AppRole } from '../types/auth'

export type SessionTokenPayload = {
  sub: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
  role: AppRole
}

export function signSessionToken(payload: SessionTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' })
}

export function verifySessionToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as SessionTokenPayload
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}
