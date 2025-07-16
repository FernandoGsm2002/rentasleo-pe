import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

let supabaseBrowserClient: ReturnType<typeof createClient<Database>> | null = null
let supabaseAdminClient: ReturnType<typeof createClient<Database>> | null = null

// Cliente para el navegador (singleton)
export const createSupabaseBrowserClient = () => {
  if (supabaseBrowserClient) {
    return supabaseBrowserClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  supabaseBrowserClient = createClient<Database>(supabaseUrl, supabaseAnonKey)
  return supabaseBrowserClient
}

// Cliente con service role para operaciones de administrador (singleton)
export const createSupabaseAdminClient = () => {
  if (supabaseAdminClient) {
    return supabaseAdminClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables')
  }

  supabaseAdminClient = createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
  
  return supabaseAdminClient
} 