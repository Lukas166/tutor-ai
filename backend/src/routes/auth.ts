import { type Response, Router } from 'express'
import { z } from 'zod'
import { env, isSupabaseConfigured } from '../config/env'
import {
  authenticateDemoUser,
  registerDemoUser,
} from '../lib/demo-store'
import { getSessionCookieOptions, signSessionToken } from '../lib/jwt'
import {
  buildSession,
  ensureProfile,
  getDashboardPath,
  normalizeRole,
  updateProfile,
} from '../lib/profile'
import { getAdminSupabase, getPublicSupabase } from '../lib/supabase'
import { requireAuth } from '../middleware/require-auth'
import type { AppRole } from '../types/auth'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().trim().min(2).max(120),
})

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  avatarUrl: z.union([z.string().trim().url(), z.literal('')]).optional(),
})

function createSessionResponse(profile: Awaited<ReturnType<typeof ensureProfile>>) {
  const session = buildSession(profile)
  const token = signSessionToken({
    sub: session.user.id,
    email: session.user.email,
    fullName: session.user.fullName,
    avatarUrl: session.user.avatarUrl,
    role: session.user.role,
  })

  return {
    token,
    session,
    redirectTo: getDashboardPath(session.user.role),
  }
}

function sendSessionCookie(res: Response, token: string) {
  res.cookie(env.COOKIE_NAME, token, getSessionCookieOptions())
}

function getFriendlyAuthError(errorMessage: string | undefined) {
  if (!errorMessage) {
    return 'Autentikasi gagal.'
  }

  if (errorMessage.toLowerCase().includes('invalid login credentials')) {
    return 'Email atau password salah.'
  }

  return errorMessage
}

router.post('/login', async (req, res) => {
  const parsedBody = loginSchema.safeParse(req.body)
  if (!parsedBody.success) {
    return res.status(400).json({ message: 'Email dan password wajib diisi dengan benar.' })
  }

  let profile

  if (isSupabaseConfigured) {
    const { data, error } = await getPublicSupabase().auth.signInWithPassword(parsedBody.data)

    if (error || !data.user) {
      return res.status(401).json({ message: getFriendlyAuthError(error?.message) })
    }

    profile = await ensureProfile({
      userId: data.user.id,
      email: data.user.email ?? null,
      fullName: (data.user.user_metadata?.full_name as string | undefined) ?? null,
      avatarUrl: (data.user.user_metadata?.avatar_url as string | undefined) ?? null,
      role: normalizeRole(data.user.user_metadata?.role as AppRole | undefined),
    })
  } else {
    const account = authenticateDemoUser(parsedBody.data.email, parsedBody.data.password)

    if (!account) {
      return res.status(401).json({
        message:
          'Demo mode aktif. Gunakan mahasiswa@demo.local, dosen@demo.local, atau admin@demo.local dengan password password.',
      })
    }

    profile = await ensureProfile({
      userId: account.id,
      email: account.email,
      fullName: account.fullName,
      avatarUrl: account.avatarUrl,
      role: account.role,
    })
  }

  const response = createSessionResponse(profile)
  sendSessionCookie(res, response.token)

  return res.status(200).json({
    session: response.session,
    redirectTo: response.redirectTo,
  })
})

router.post('/register', async (req, res) => {
  const parsedBody = registerSchema.safeParse(req.body)
  if (!parsedBody.success) {
    return res.status(400).json({ message: 'Nama lengkap, email, dan password wajib diisi.' })
  }

  let profile

  if (isSupabaseConfigured) {
    const { data, error } = await getAdminSupabase().auth.admin.createUser({
      email: parsedBody.data.email,
      password: parsedBody.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsedBody.data.fullName,
        role: 'mahasiswa',
      },
    })

    if (error || !data.user) {
      return res.status(400).json({ message: error?.message ?? 'Pendaftaran gagal.' })
    }

    profile = await ensureProfile({
      userId: data.user.id,
      email: data.user.email ?? null,
      fullName: parsedBody.data.fullName,
      role: 'mahasiswa',
    })
  } else {
    const demoAccount = registerDemoUser({
      email: parsedBody.data.email,
      password: parsedBody.data.password,
      fullName: parsedBody.data.fullName,
    })

    profile = await ensureProfile({
      userId: demoAccount.id,
      email: demoAccount.email,
      fullName: demoAccount.fullName,
      role: 'mahasiswa',
    })
  }

  const response = createSessionResponse(profile)
  sendSessionCookie(res, response.token)

  return res.status(201).json({
    session: response.session,
    redirectTo: response.redirectTo,
  })
})

router.get('/me', requireAuth, (req, res) => {
  return res.status(200).json(req.auth?.session)
})

router.patch('/me', requireAuth, async (req, res) => {
  const parsedBody = updateProfileSchema.safeParse(req.body)

  if (!parsedBody.success) {
    return res.status(400).json({ message: 'Nama lengkap atau avatar tidak valid.' })
  }

  const profile = await updateProfile({
    userId: req.auth!.user.id,
    fullName: parsedBody.data.fullName,
    avatarUrl:
      parsedBody.data.avatarUrl === '' ? null : parsedBody.data.avatarUrl,
  })

  const response = createSessionResponse(profile)
  sendSessionCookie(res, response.token)

  return res.status(200).json({
    session: response.session,
    redirectTo: response.redirectTo,
  })
})

router.post('/logout', (_req, res) => {
  res.clearCookie(env.COOKIE_NAME, getSessionCookieOptions())
  return res.status(200).json({ ok: true })
})

export { router as authRouter }
