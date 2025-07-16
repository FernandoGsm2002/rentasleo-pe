'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Usuario } from '@/types/supabase'

interface AuthContextType {
  user: User | null
  usuario: Usuario | null
  loading: boolean
  showWelcome: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  registrarIngreso: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    let isMounted = true

    // Obtener la sesión inicial
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!isMounted) return

        setUser(session?.user ?? null)
        
        if (session?.user) {
          await obtenerDatosUsuario(session.user.id, session.user.email)
        }
      } catch (error) {
        console.error('Error obteniendo sesión:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        setUser(session?.user ?? null)
        
        if (session?.user) {
          await obtenerDatosUsuario(session.user.id, session.user.email)
          if (event === 'SIGNED_IN') {
            await registrarIngreso()
          }
        } else {
          setUsuario(null)
        }
        
        if (isMounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const obtenerDatosUsuario = async (userId: string, userEmail?: string) => {
    try {
      console.log('🔍 Buscando usuario con ID:', userId)
      console.log('📧 Email proporcionado:', userEmail)
      
      // Primero buscar por ID
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()

      if (data && !error) {
        setUsuario(data)
        console.log('✅ Usuario encontrado por ID:', data)
        return
      }

      // Si no se encuentra por ID, buscar por email
      if (userEmail) {
        const { data: usuarioPorEmail, error: errorEmail } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', userEmail)
          .single()

        if (usuarioPorEmail && !errorEmail) {
          setUsuario(usuarioPorEmail)
          console.log('✅ Usuario encontrado por email:', usuarioPorEmail)
          return
        }
      }

      // Si no existe, crear nuevo usuario
      if (userEmail) {
        await crearUsuarioEnBD(userId, userEmail)
      } else {
        console.error('❌ No se puede crear usuario sin email')
        // Crear usuario temporal para evitar bloqueo
        setUsuario(createTempUser(userId))
      }
    } catch (error) {
      console.error('Error obteniendo datos usuario:', error)
      // En caso de error, crear usuario temporal
      setUsuario(createTempUser(userId, userEmail))
    }
  }

  const createTempUser = (userId: string, email?: string): Usuario => ({
    id: userId,
    email: email || 'usuario@temporal.com',
    nombre: email ? email.split('@')[0] : 'Usuario',
    rol: 'trabajador' as const,
    activo: true,
    sueldo_base: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })

  const crearUsuarioEnBD = async (userId: string, email: string) => {
    try {
      const nuevoUsuario = {
        id: userId,
        email: email,
        nombre: email.split('@')[0] || 'Usuario',
        rol: 'trabajador' as const,
        activo: true,
        sueldo_base: 0
      }

      console.log('🚀 Creando nuevo usuario:', nuevoUsuario)

      const { data, error } = await supabase
        .from('usuarios')
        .insert(nuevoUsuario)
        .select()
        .single()

      if (data && !error) {
        setUsuario(data)
        console.log('✅ Usuario creado exitosamente:', data)
      } else if (error?.code === '23505') {
        // Usuario ya existe, buscar nuevamente
        const { data: usuarioExistente } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', email)
          .single()
          
        if (usuarioExistente) {
          setUsuario(usuarioExistente)
          console.log('✅ Usuario existente encontrado:', usuarioExistente)
        } else {
          setUsuario(createTempUser(userId, email))
        }
      } else {
        console.error('❌ Error creando usuario:', error)
        setUsuario(createTempUser(userId, email))
      }
    } catch (error) {
      console.error('Error en crearUsuarioEnBD:', error)
      setUsuario(createTempUser(userId, email))
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (!error) {
      setShowWelcome(true)
      setTimeout(() => {
        setShowWelcome(false)
      }, 3000)
    }
    
    return { error }
  }

  const signOut = async () => {
    try {
      setUser(null)
      setUsuario(null)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error en logout:', error)
      }
      
      window.location.href = '/'
    } catch (error) {
      console.error('Error inesperado en logout:', error)
      window.location.href = '/'
    }
  }

  const registrarIngreso = async () => {
    if (!user) return

    try {
      await supabase
        .from('ingresos')
        .insert({
          usuario_id: user.id,
          user_agent: navigator.userAgent,
        })
    } catch (error) {
      console.error('Error registrando ingreso:', error)
    }
  }

  const value = {
    user,
    usuario,
    loading,
    showWelcome,
    signIn,
    signOut,
    registrarIngreso,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
} 