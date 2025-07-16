'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { createSupabaseBrowserClient, checkSessionHealth, forceTokenRefresh } from '@/lib/supabase'
import { Usuario } from '@/types/supabase'

interface AuthContextType {
  user: User | null
  usuario: Usuario | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const isCheckingSession = useRef(false)

  // Función para verificar y mantener la sesión activa
  const maintainSession = async () => {
    if (isCheckingSession.current) return
    
    try {
      isCheckingSession.current = true
      const { healthy, session } = await checkSessionHealth()
      
      if (!healthy && user) {
        console.log('🔄 [Session Maintenance] Sesión no saludable, intentando refresh...')
        const refreshResult = await forceTokenRefresh()
        
        if (!refreshResult.success) {
          console.log('❌ [Session Maintenance] No se pudo refrescar token, cerrando sesión...')
          await signOut()
        } else {
          console.log('✅ [Session Maintenance] Token refrescado exitosamente')
        }
      }
    } catch (error) {
      console.error('❌ [Session Maintenance] Error:', error)
    } finally {
      isCheckingSession.current = false
    }
  }

  // Configurar verificación periódica de sesión
  useEffect(() => {
    // Verificar cada 5 minutos (300000ms)
    sessionCheckInterval.current = setInterval(maintainSession, 5 * 60 * 1000)
    
    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current)
      }
    }
  }, [user])

  useEffect(() => {
    // Verificar sesión inicial
    const getInitialSession = async () => {
      try {
        console.log('🔐 [AuthProvider] Obteniendo sesión inicial...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ [AuthProvider] Error obteniendo sesión:', error)
        } else {
          console.log('🔐 [AuthProvider] Sesión inicial:', session?.user?.email || 'Sin sesión')
          setUser(session?.user ?? null)
          
          if (session?.user?.email) {
            await obtenerUsuario(session.user.email)
          }
        }
      } catch (error) {
        console.error('❌ [AuthProvider] Error en getInitialSession:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Escuchar cambios de autenticación CON TODOS LOS EVENTOS
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 [AuthProvider] Auth event:', event, 'User:', session?.user?.email || 'None')
        
        // Manejar diferentes tipos de eventos
        switch (event) {
          case 'SIGNED_IN':
            console.log('✅ [AuthProvider] Usuario logueado exitosamente')
            setUser(session?.user ?? null)
            if (session?.user?.email) {
              await obtenerUsuario(session.user.email)
              // Redirigir después del login exitoso
              const urlParams = new URLSearchParams(window.location.search)
              const redirectTo = urlParams.get('redirect') || '/dashboard'
              console.log('🎯 [AuthProvider] Redirigiendo a:', redirectTo)
              window.location.href = redirectTo
            }
            break

          case 'SIGNED_OUT':
            console.log('👋 [AuthProvider] Usuario deslogueado')
            setUser(null)
            setUsuario(null)
            // Limpiar intervalo de verificación
            if (sessionCheckInterval.current) {
              clearInterval(sessionCheckInterval.current)
              sessionCheckInterval.current = null
            }
            window.location.href = '/'
            break

          case 'TOKEN_REFRESHED':
            console.log('🔄 [AuthProvider] Token refrescado exitosamente')
            setUser(session?.user ?? null)
            // Revalidar datos del usuario si es necesario
            if (session?.user?.email && !usuario) {
              await obtenerUsuario(session.user.email)
            }
            break

          case 'USER_UPDATED':
            console.log('👤 [AuthProvider] Usuario actualizado')
            setUser(session?.user ?? null)
            break

          case 'PASSWORD_RECOVERY':
            console.log('🔑 [AuthProvider] Recuperación de contraseña')
            break

          default:
            console.log('🔐 [AuthProvider] Evento no manejado:', event)
            setUser(session?.user ?? null)
            if (session?.user?.email) {
              await obtenerUsuario(session.user.email)
            } else {
              setUsuario(null)
            }
        }
        
        setLoading(false)
      }
    )

    return () => {
      console.log('🔐 [AuthProvider] Limpiando suscripción de auth')
      subscription.unsubscribe()
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current)
      }
    }
  }, [])

  const obtenerUsuario = async (email: string) => {
    try {
      console.log('👤 [AuthProvider] Obteniendo datos del usuario:', email)
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single()

      if (error) {
        console.error('❌ [AuthProvider] Error obteniendo usuario:', error)
        throw error
      }

      if (data) {
        console.log('✅ [AuthProvider] Usuario encontrado:', data.nombre, 'Rol:', data.rol)
        setUsuario(data)
      } else {
        console.error('❌ [AuthProvider] Usuario no encontrado en la base de datos')
        setUsuario(null)
      }
    } catch (error) {
      console.error('❌ [AuthProvider] Error en obtenerUsuario:', error)
      setUsuario(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('🔑 [AuthProvider] Iniciando sesión para:', email)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('❌ [AuthProvider] Error en login:', error.message)
      } else {
        console.log('✅ [AuthProvider] Login exitoso')
      }

      return { error }
    } catch (error) {
      console.error('❌ [AuthProvider] Error en signIn:', error)
      return { error }
    }
  }

  const signOut = async () => {
    console.log('🚪 [AuthProvider] Cerrando sesión...')
    
    try {
      // Limpiar intervalo de verificación inmediatamente
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current)
        sessionCheckInterval.current = null
      }
      
      // Limpiar estado inmediatamente
      setUser(null)
      setUsuario(null)
      
      // Cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ [AuthProvider] Error cerrando sesión:', error)
      } else {
        console.log('✅ [AuthProvider] Sesión cerrada exitosamente')
      }
      
      // Redirigir al login independientemente del resultado
      window.location.href = '/'
    } catch (error) {
      console.error('❌ [AuthProvider] Error en signOut:', error)
      // Incluso si hay error, redirigir al login
      window.location.href = '/'
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      usuario,
      loading,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 