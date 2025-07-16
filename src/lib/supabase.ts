import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

let supabaseBrowserClient: ReturnType<typeof createBrowserClient<Database>> | null = null
let supabaseAdminClient: ReturnType<typeof createClient<Database>> | null = null

// Cliente para el navegador con soporte de cookies y configuración mejorada para producción
export const createSupabaseBrowserClient = () => {
  if (supabaseBrowserClient) {
    return supabaseBrowserClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  supabaseBrowserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'X-Client-Info': 'leope-staff-web'
      }
    }
  })
  return supabaseBrowserClient
}

// Función helper para crear cliente del servidor (usar solo en Server Components)
export const createSupabaseServerClient = (cookieStore: any) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // Error al setear cookie en Server Component
          console.warn('Could not set cookie in server component:', error)
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // Error al remover cookie en Server Component
          console.warn('Could not remove cookie in server component:', error)
        }
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  })
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
      },
      global: {
        headers: {
          'X-Client-Info': 'leope-staff-admin'
        }
      }
    }
  )
  
  return supabaseAdminClient
}

// Utilidad para hacer retry de operaciones que fallan
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      console.warn(`Attempt ${attempt} failed:`, error)
      
      if (attempt === maxRetries) {
        break
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)))
    }
  }
  
  throw lastError
}

// Utilidad para logging en producción
export const logError = (operation: string, error: any, context?: any) => {
  const errorData = {
    timestamp: new Date().toISOString(),
    operation,
    error: error?.message || error,
    code: error?.code,
    context,
    url: typeof window !== 'undefined' ? window.location.href : 'server',
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
  }
  
  console.error('🚨 LEOPE-STAFF Error:', errorData)
  
  // En producción, podrías enviar esto a un servicio de logging
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrar con servicio de logging (Sentry, LogRocket, etc.)
  }
} 