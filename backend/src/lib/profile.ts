import { isSupabaseConfigured } from '../config/env'
import {
  ensureDemoProfile,
  getDemoProfileById,
  updateDemoProfile,
} from './demo-store'
import { getAdminSupabase } from './supabase'
import type { AppRole, AppSession, ProfileRow, RoleGroup, SessionUser } from '../types/auth'

const profileSelect = 'id, full_name, avatar_url, email, role, created_at, updated_at'

export function normalizeRole(role: string | null | undefined): AppRole {
  if (role === 'mahasiswa' || role === 'dosen' || role === 'admin') {
    return role
  }

  return 'mahasiswa'
}

export function getRoleGroup(role: AppRole): RoleGroup {
  return role === 'mahasiswa' ? 'mahasiswa' : 'staff'
}

export function getRoleLabel(role: AppRole) {
  switch (role) {
    case 'dosen':
      return 'Dosen'
    case 'admin':
      return 'Admin'
    default:
      return 'Mahasiswa'
  }
}

export function getRoleGroupLabel(roleGroup: RoleGroup) {
  return roleGroup === 'mahasiswa' ? 'Mahasiswa' : 'Dosen / Admin'
}

export function getDashboardPath(role: AppRole) {
  return getRoleGroup(role) === 'mahasiswa' ? '/dashboard/mahasiswa' : '/dashboard/staff'
}

function getFallbackName(email: string | null | undefined) {
  if (!email) {
    return null
  }

  const localPart = email.split('@')[0]?.trim()
  if (!localPart) {
    return null
  }

  return localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function normalizeProfile(profile: ProfileRow): ProfileRow {
  return {
    ...profile,
    role: normalizeRole(profile.role),
  }
}

export function getDisplayName(profile: Pick<ProfileRow, 'full_name' | 'email'>) {
  return profile.full_name?.trim() || getFallbackName(profile.email) || 'Pengguna'
}

export function buildSession(profile: ProfileRow): AppSession {
  const normalizedProfile = normalizeProfile(profile)

  const user: SessionUser = {
    id: normalizedProfile.id,
    email: normalizedProfile.email,
    fullName: normalizedProfile.full_name,
    avatarUrl: normalizedProfile.avatar_url,
    role: normalizedProfile.role,
    roleGroup: getRoleGroup(normalizedProfile.role),
  }

  return {
    user,
    profile: normalizedProfile,
  }
}

export async function fetchProfileById(userId: string): Promise<ProfileRow | null> {
  if (!isSupabaseConfigured) {
    return getDemoProfileById(userId)
  }

  const adminSupabase = getAdminSupabase()
  const { data, error } = await adminSupabase
    .from('profiles')
    .select(profileSelect)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? normalizeProfile(data as ProfileRow) : null
}

async function syncAuthMetadata(userId: string, profile: ProfileRow) {
  if (!isSupabaseConfigured) {
    return
  }

  try {
    await getAdminSupabase().auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: profile.role,
      },
    })
  } catch {
    // Auth metadata sync is best-effort.
  }
}

export async function ensureProfile(input: {
  userId: string
  email: string | null
  fullName?: string | null
  avatarUrl?: string | null
  role?: AppRole
}): Promise<ProfileRow> {
  if (!isSupabaseConfigured) {
    return ensureDemoProfile(input)
  }

  const currentProfile = await fetchProfileById(input.userId)
  const nextRole = currentProfile?.role ?? normalizeRole(input.role)
  const nextEmail = input.email ?? currentProfile?.email ?? null
  const nextFullName =
    input.fullName == null
      ? currentProfile?.full_name || getFallbackName(nextEmail)
      : input.fullName.trim() || currentProfile?.full_name || getFallbackName(nextEmail)
  const nextAvatarUrl =
    input.avatarUrl == null
      ? currentProfile?.avatar_url || null
      : input.avatarUrl.trim() || currentProfile?.avatar_url || null

  if (!currentProfile) {
    const { data, error } = await getAdminSupabase()
      .from('profiles')
      .insert({
        id: input.userId,
        email: nextEmail,
        full_name: nextFullName,
        avatar_url: nextAvatarUrl,
        role: nextRole,
      })
      .select(profileSelect)
      .single()

    if (error || !data) {
      throw error ?? new Error('Gagal membuat profile awal.')
    }

    const profile = normalizeProfile(data as ProfileRow)
    await syncAuthMetadata(input.userId, profile)
    return profile
  }

  const needsUpdate =
    currentProfile.email !== nextEmail ||
    currentProfile.full_name !== nextFullName ||
    currentProfile.avatar_url !== nextAvatarUrl

  if (!needsUpdate) {
    return currentProfile
  }

  const { data, error } = await getAdminSupabase()
    .from('profiles')
    .update({
      email: nextEmail,
      full_name: nextFullName,
      avatar_url: nextAvatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.userId)
    .select(profileSelect)
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal memperbarui profile.')
  }

  const profile = normalizeProfile(data as ProfileRow)
  await syncAuthMetadata(input.userId, profile)
  return profile
}

export async function updateProfile(input: {
  userId: string
  fullName?: string | null
  avatarUrl?: string | null
}) {
  if (!isSupabaseConfigured) {
    return updateDemoProfile(input)
  }

  const currentProfile = await fetchProfileById(input.userId)

  if (!currentProfile) {
    throw new Error('Profile tidak ditemukan.')
  }

  const nextFullName =
    input.fullName == null
      ? currentProfile.full_name
      : input.fullName.trim() || getFallbackName(currentProfile.email)

  const nextAvatarUrl =
    input.avatarUrl == null
      ? currentProfile.avatar_url
      : input.avatarUrl.trim() || null

  const { data, error } = await getAdminSupabase()
    .from('profiles')
    .update({
      full_name: nextFullName,
      avatar_url: nextAvatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.userId)
    .select(profileSelect)
    .single()

  if (error || !data) {
    throw error ?? new Error('Gagal memperbarui profile.')
  }

  const profile = normalizeProfile(data as ProfileRow)
  await syncAuthMetadata(input.userId, profile)
  return profile
}
