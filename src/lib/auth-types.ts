export type AppRole = 'mahasiswa' | 'dosen' | 'admin'

export type RoleGroup = 'mahasiswa' | 'staff'

export type AppProfile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  role: AppRole
  created_at: string
  updated_at: string
}

export type AppSession = {
  user: {
    id: string
    email: string | null
    fullName: string | null
    avatarUrl: string | null
    role: AppRole
    roleGroup: RoleGroup
  }
  profile: AppProfile
}

export function getRoleGroup(role: AppRole): RoleGroup {
  return role === 'mahasiswa' ? 'mahasiswa' : 'staff'
}

export function getDashboardPath(role: AppRole) {
  return getRoleGroup(role) === 'mahasiswa' ? '/dashboard/mahasiswa' : '/dashboard/staff'
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

export function getDisplayName(fullName: string | null | undefined, email: string | null | undefined) {
  return fullName?.trim() || getFallbackName(email) || 'Pengguna'
}

export function getGuestSession(role: AppRole): AppSession {
  const roleGroup = getRoleGroup(role)
  const name = role === 'mahasiswa' ? 'Guest Mahasiswa' : 'Guest Staff'
  const email = `guest-${role}@tutor-ai.id`

  return {
    user: {
      id: `guest-${role}`,
      email,
      fullName: name,
      avatarUrl: null,
      role,
      roleGroup,
    },
    profile: {
      id: `guest-${role}`,
      full_name: name,
      avatar_url: null,
      email,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }
}
