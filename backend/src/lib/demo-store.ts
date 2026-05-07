import { randomUUID } from 'node:crypto'
import type { AppRole, ProfileRow } from '../types/auth'

type DemoAccount = {
  id: string
  email: string
  password: string
  fullName: string | null
  avatarUrl: string | null
  role: AppRole
  createdAt: string
  updatedAt: string
}

type DemoRegistration = {
  email: string
  password: string
  fullName: string
}

const demoAccounts = new Map<string, DemoAccount>()
const demoProfiles = new Map<string, ProfileRow>()

function getRoleGroup(role: AppRole) {
  return role === 'mahasiswa' ? 'mahasiswa' : 'staff'
}

function getFallbackName(email: string) {
  return email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function toProfile(account: DemoAccount): ProfileRow {
  return {
    id: account.id,
    full_name: account.fullName,
    avatar_url: account.avatarUrl,
    email: account.email,
    role: account.role,
    created_at: account.createdAt,
    updated_at: account.updatedAt,
  }
}

function createAccount(input: {
  email: string
  password: string
  fullName: string | null
  avatarUrl: string | null
  role: AppRole
}) {
  const now = new Date().toISOString()
  const account: DemoAccount = {
    id: randomUUID(),
    email: input.email.toLowerCase(),
    password: input.password,
    fullName: input.fullName || getFallbackName(input.email),
    avatarUrl: input.avatarUrl,
    role: input.role,
    createdAt: now,
    updatedAt: now,
  }

  demoAccounts.set(account.email, account)
  demoProfiles.set(account.id, toProfile(account))

  return account
}

function seedAccount(email: string, password: string, role: AppRole, fullName: string) {
  if (demoAccounts.has(email.toLowerCase())) {
    return
  }

  createAccount({
    email,
    password,
    fullName,
    avatarUrl: null,
    role,
  })
}

seedAccount('mahasiswa@demo.local', 'password', 'mahasiswa', 'Mahasiswa Demo')
seedAccount('dosen@demo.local', 'password', 'dosen', 'Dosen Demo')
seedAccount('admin@demo.local', 'password', 'admin', 'Admin Demo')

export function authenticateDemoUser(email: string, password: string) {
  const account = demoAccounts.get(email.toLowerCase())

  if (!account || account.password !== password) {
    return null
  }

  return account
}

export function registerDemoUser(input: DemoRegistration) {
  if (demoAccounts.has(input.email.toLowerCase())) {
    throw new Error('Email sudah terdaftar pada demo mode.')
  }

  return createAccount({
    email: input.email,
    password: input.password,
    fullName: input.fullName,
    avatarUrl: null,
    role: 'mahasiswa',
  })
}

export function getDemoProfileById(userId: string) {
  return demoProfiles.get(userId) ?? null
}

export function ensureDemoProfile(input: {
  userId: string
  email: string | null
  fullName?: string | null
  avatarUrl?: string | null
  role?: AppRole
}) {
  const existingProfile = demoProfiles.get(input.userId)

  if (existingProfile) {
    const nextProfile: ProfileRow = {
      ...existingProfile,
      email: input.email ?? existingProfile.email,
      full_name: input.fullName?.trim() || existingProfile.full_name || existingProfile.email,
      avatar_url:
        input.avatarUrl == null
          ? existingProfile.avatar_url
          : input.avatarUrl.trim() || null,
      role: existingProfile.role,
      updated_at: new Date().toISOString(),
    }

    demoProfiles.set(input.userId, nextProfile)
    return nextProfile
  }

  const createdProfile: ProfileRow = {
    id: input.userId,
    full_name: input.fullName?.trim() || input.email || getFallbackName(input.userId),
    avatar_url: input.avatarUrl ?? null,
    email: input.email,
    role: input.role ?? 'mahasiswa',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  demoProfiles.set(input.userId, createdProfile)
  return createdProfile
}

export function updateDemoProfile(input: {
  userId: string
  fullName?: string | null
  avatarUrl?: string | null
}) {
  const currentProfile = demoProfiles.get(input.userId)

  if (!currentProfile) {
    throw new Error('Profile tidak ditemukan pada demo mode.')
  }

  const nextProfile: ProfileRow = {
    ...currentProfile,
    full_name:
      input.fullName == null
        ? currentProfile.full_name
        : input.fullName.trim() || currentProfile.full_name,
    avatar_url:
      input.avatarUrl == null
        ? currentProfile.avatar_url
        : input.avatarUrl.trim() || null,
    updated_at: new Date().toISOString(),
  }

  demoProfiles.set(input.userId, nextProfile)

  const account = demoAccounts.get(currentProfile.email?.toLowerCase() ?? '')
  if (account) {
    demoAccounts.set(account.email, {
      ...account,
      fullName: nextProfile.full_name,
      avatarUrl: nextProfile.avatar_url,
      updatedAt: nextProfile.updated_at,
    })
  }

  return nextProfile
}

export function getDemoRoleGroup(role: AppRole) {
  return getRoleGroup(role)
}
