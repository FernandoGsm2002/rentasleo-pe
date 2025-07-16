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
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'sb-auth-token'
    },
    global: {
      headers: {
        'X-Client-Info': 'leope-staff-web',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
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
          cookieStore.set({ 
            name, 
            value, 
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          })
        } catch (error) {
          // Error al setear cookie en Server Component
          console.warn('Could not set cookie in server component:', error)
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ 
            name, 
            value: '', 
            ...options,
            maxAge: 0
          })
        } catch (error) {
          // Error al remover cookie en Server Component
          console.warn('Could not remove cookie in server component:', error)
        }
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'X-Client-Info': 'leope-staff-server',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
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
    details: error?.details,
    hint: error?.hint,
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

// Función para verificar el estado de conexión de Supabase
export const checkSupabaseConnection = async () => {
  try {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase.from('usuarios').select('count').limit(1)
    
    if (error) {
      logError('checkSupabaseConnection', error)
      return { 
        connected: false, 
        error: error.message,
        code: error.code 
      }
    }
    
    return { 
      connected: true, 
      timestamp: new Date().toISOString() 
    }
  } catch (error) {
    logError('checkSupabaseConnection', error)
    return { 
      connected: false, 
      error: 'Network error or invalid configuration' 
    }
  }
}

// Función para diagnosticar problemas de autenticación
export const diagnoseAuthIssues = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
    connection: null as any,
    session: null as any,
    user: null as any
  }

  try {
    // Verificar conexión
    results.connection = await checkSupabaseConnection()
    
    // Verificar sesión
    const supabase = createSupabaseBrowserClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      results.session = { error: sessionError.message, code: sessionError.name }
    } else {
      results.session = { 
        exists: !!session, 
        userId: session?.user?.id || null,
        expiresAt: session?.expires_at || null
      }
    }
    
    // Verificar usuario en BD
    if (session?.user?.id) {
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, email, nombre, rol, activo')
        .eq('id', session.user.id)
        .single()
        
      if (userError) {
        results.user = { error: userError.message, code: userError.code }
      } else {
        results.user = { found: true, data: userData }
      }
    }
    
  } catch (error) {
    logError('diagnoseAuthIssues', error)
    results.session = { error: 'Failed to diagnose' }
  }
  
  console.log('🔍 DIAGNÓSTICO DE AUTENTICACIÓN:', results)
  return results
} 