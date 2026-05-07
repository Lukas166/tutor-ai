export type AppRole = 'mahasiswa' | 'dosen' | 'admin'

export type RoleGroup = 'mahasiswa' | 'staff'

export type ProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  role: AppRole
  created_at: string
  updated_at: string
}

export type SessionUser = {
  id: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
  role: AppRole
  roleGroup: RoleGroup
}

export type AppSession = {
  user: SessionUser
  profile: ProfileRow
}

export type AuthContext = {
  token: string
  user: SessionUser
  profile: ProfileRow
  session: AppSession
}
