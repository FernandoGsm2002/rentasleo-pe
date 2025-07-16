import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

let supabaseBrowserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

// Cliente para el navegador con configuración optimizada para persistencia de sesión
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
      // Configuraciones adicionales para mejor persistencia
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'sb-rentas-auth-token',
      debug: process.env.NODE_ENV === 'development',
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-web'
      }
    },
    // Configuración de retry para problemas de red
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })
  
  // Logging para desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 [Supabase] Cliente del navegador configurado:', {
      url: supabaseUrl,
      persistSession: true,
      autoRefreshToken: true
    })
  }
  
  return supabaseBrowserClient
}

// Cliente del servidor optimizado
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
            // Configuraciones para mejor persistencia en servidor
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 días
          })
        } catch {
          // Manejo silencioso de errores de cookies en servidor
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
        } catch {
          // Manejo silencioso de errores
        }
      },
    },
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false // Falso en servidor
    }
  })
}

// Función utilitaria para verificar el estado de la sesión
export const checkSessionHealth = async () => {
  try {
    const supabase = createSupabaseBrowserClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ [Session Health] Error:', error)
      return { healthy: false, error }
    }
    
    const isHealthy = !!session?.user && !!session?.access_token
    console.log('🔍 [Session Health] Estado:', {
      healthy: isHealthy,
      user: session?.user?.email || 'None',
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'Unknown'
    })
    
    return { healthy: isHealthy, session }
  } catch (error) {
    console.error('❌ [Session Health] Error general:', error)
    return { healthy: false, error }
  }
}

// Función para forzar refresh de token
export const forceTokenRefresh = async () => {
  try {
    const supabase = createSupabaseBrowserClient()
    console.log('🔄 [Token Refresh] Forzando refresh del token...')
    
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('❌ [Token Refresh] Error:', error)
      return { success: false, error }
    }
    
    console.log('✅ [Token Refresh] Token refrescado exitosamente')
    return { success: true, session: data.session }
  } catch (error) {
    console.error('❌ [Token Refresh] Error general:', error)
    return { success: false, error }
  }
} 