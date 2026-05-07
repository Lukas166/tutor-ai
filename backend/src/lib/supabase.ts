import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from '../config/env'

const sharedAuthOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
}

let publicSupabase: SupabaseClient | null = null
let adminSupabase: SupabaseClient | null = null

function ensureConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }
}

export function getPublicSupabase() {
  ensureConfigured()

  if (!publicSupabase) {
    publicSupabase = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, sharedAuthOptions)
  }

  return publicSupabase
}

export function getAdminSupabase() {
  ensureConfigured()

  if (!adminSupabase) {
    adminSupabase = createClient(
      env.SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY!,
      sharedAuthOptions
    )
  }

  return adminSupabase
}

