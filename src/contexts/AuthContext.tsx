'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface UserData {
  id: string
  nombre: string
  rol: string
  email: string
  sueldo_base: number
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    let isMounted = true
    let sessionLoaded = false

    // Función para cargar datos del usuario desde la base de datos
    const loadUserData = async (email: string) => {
      if (!isMounted) return null
      
      try {
        console.log('🔍 [AUTH] Cargando datos para:', email)
        
        // Timeout de 5 segundos para evitar cuelgues
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout cargando usuario')), 5000)
        })
        
        const dataPromise = supabase
          .from('usuarios')
          .select('id, nombre, rol, email, sueldo_base')
          .eq('email', email)
          .single()

        const { data, error } = await Promise.race([dataPromise, timeoutPromise]) as any

        if (data && !error && isMounted) {
          setUserData(data)
          console.log('✅ [AUTH] Usuario cargado:', data.nombre, 'Rol:', data.rol)
          return data
        } else {
          console.error('❌ [AUTH] Error cargando datos:', error)
          return null
        }
      } catch (error) {
        console.error('❌ [AUTH] Error en loadUserData:', error)
        return null
      }
    }

    // Función para cargar la sesión inicial
    const loadSession = async () => {
      if (!isMounted || sessionLoaded) return
      
      try {
        console.log('🚀 [AUTH] Cargando sesión inicial...')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user && isMounted) {
          console.log('✅ [AUTH] Sesión encontrada')
          setUser(session.user)
          await loadUserData(session.user.email!)
          sessionLoaded = true
        } else {
          console.log('ℹ️ [AUTH] No hay sesión activa')
        }
      } catch (error) {
        console.error('❌ [AUTH] Error cargando sesión:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
          sessionLoaded = true
        }
      }
    }

    // Cargar sesión inicial con timeout de seguridad
    const loadTimeout = setTimeout(() => {
      if (isMounted && !sessionLoaded) {
        console.warn('⚠️ [AUTH] Timeout de carga inicial, forzando loading=false')
        setLoading(false)
        sessionLoaded = true
      }
    }, 3000)

    loadSession()

    // Escuchar cambios de autenticación (solo después de sesión inicial)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        
        console.log('🔄 [AUTH] Event:', event)
        
        // Evitar procesamiento durante carga inicial
        if (!sessionLoaded && event === 'INITIAL_SESSION') {
          return
        }
        
        if (session?.user) {
          setUser(session.user)
          // Solo cargar datos si no es la sesión inicial o si cambió el usuario
          if (event !== 'INITIAL_SESSION' || user?.email !== session.user.email) {
            await loadUserData(session.user.email!)
          }
        } else {
          setUser(null)
          setUserData(null)
        }
        
        if (isMounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(loadTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setUserData(null)
      window.location.href = '/'
    } catch (error) {
      console.error('❌ Error en signOut:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 