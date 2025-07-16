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
    // Función para cargar la sesión inicial
    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          await loadUserData(session.user.email!)
        }
      } catch (error) {
        console.error('❌ Error cargando sesión:', error)
      } finally {
        setLoading(false)
      }
    }

    // Función para cargar datos del usuario desde la base de datos
    const loadUserData = async (email: string) => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id, nombre, rol, email, sueldo_base')
          .eq('email', email)
          .single()

        if (data && !error) {
          setUserData(data)
          console.log('✅ Usuario cargado:', data.nombre, 'Rol:', data.rol)
        } else {
          console.error('❌ Error cargando datos del usuario:', error)
        }
      } catch (error) {
        console.error('❌ Error en loadUserData:', error)
      }
    }

    // Cargar sesión inicial
    loadSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth event:', event)
        
        if (session?.user) {
          setUser(session.user)
          await loadUserData(session.user.email!)
        } else {
          setUser(null)
          setUserData(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
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