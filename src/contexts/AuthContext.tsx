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
        console.log('🔄 Obteniendo sesión inicial...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error obteniendo sesión:', error)
          if (isMounted) {
            setLoading(false)
          }
          return
        }
        
        if (!isMounted) return

        console.log('📋 Sesión obtenida:', session ? 'Usuario autenticado' : 'Sin sesión')
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('👤 Obteniendo datos de usuario desde BD...')
          await obtenerDatosUsuario(session.user.id, session.user.email)
        } else {
          console.log('🚫 Sin sesión activa')
        }
      } catch (error) {
        console.error('💥 Error obteniendo sesión:', error)
      } finally {
        if (isMounted) {
          console.log('✅ Carga inicial completada')
          setLoading(false)
        }
      }
    }

    getSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        console.log('🔄 Auth state changed:', event, session?.user?.id)

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
        console.log('✅ Usuario encontrado por ID:', { nombre: data.nombre, rol: data.rol })
        return
      }

      console.log('⚠️ Usuario no encontrado por ID, buscando por email...')

      // Si no se encuentra por ID, buscar por email
      if (userEmail) {
        const { data: usuarioPorEmail, error: errorEmail } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', userEmail)
          .single()

        if (usuarioPorEmail && !errorEmail) {
          setUsuario(usuarioPorEmail)
          console.log('✅ Usuario encontrado por email:', { nombre: usuarioPorEmail.nombre, rol: usuarioPorEmail.rol })
          return
        }
      }

      console.log('⚠️ Usuario no existe en BD, creando nuevo usuario...')

      // Si no existe, crear nuevo usuario
      if (userEmail) {
        await crearUsuarioEnBD(userId, userEmail)
      } else {
        console.error('❌ No se puede crear usuario sin email')
        // Crear usuario temporal para evitar bloqueo
        setUsuario(createTempUser(userId))
      }
    } catch (error) {
      console.error('💥 Error obteniendo datos usuario:', error)
      // En caso de error, crear usuario temporal
      setUsuario(createTempUser(userId, userEmail))
    }
  }

  const createTempUser = (userId: string, email?: string): Usuario => {
    const tempUser = {
      id: userId,
      email: email || 'usuario@temporal.com',
      nombre: email ? email.split('@')[0] : 'Usuario',
      rol: 'trabajador' as const,
      activo: true,
      sueldo_base: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    console.log('🆘 Creando usuario temporal:', tempUser)
    return tempUser
  }

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

      console.log('🚀 Creando nuevo usuario en BD:', nuevoUsuario)

      const { data, error } = await supabase
        .from('usuarios')
        .insert(nuevoUsuario)
        .select()
        .single()

      if (data && !error) {
        setUsuario(data)
        console.log('✅ Usuario creado exitosamente:', { nombre: data.nombre, rol: data.rol })
      } else if (error?.code === '23505') {
        console.log('⚠️ Usuario ya existe, buscando nuevamente...')
        // Usuario ya existe, buscar nuevamente
        const { data: usuarioExistente } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', email)
          .single()
          
        if (usuarioExistente) {
          setUsuario(usuarioExistente)
          console.log('✅ Usuario existente encontrado:', { nombre: usuarioExistente.nombre, rol: usuarioExistente.rol })
        } else {
          setUsuario(createTempUser(userId, email))
        }
      } else {
        console.error('❌ Error creando usuario:', error)
        setUsuario(createTempUser(userId, email))
      }
    } catch (error) {
      console.error('💥 Error en crearUsuarioEnBD:', error)
      setUsuario(createTempUser(userId, email))
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Intentando iniciar sesión...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (!error && data.session) {
        console.log('✅ Login exitoso')
        setShowWelcome(true)
        setTimeout(() => {
          setShowWelcome(false)
        }, 3000)
        
        // Redirigir a la página base del dashboard que manejará el rol
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1000)
      } else {
        console.error('❌ Error en login:', error)
      }
      
      return { error }
    } catch (error) {
      console.error('💥 Error en signIn:', error)
      return { error }
    }
  }

  const signOut = async () => {
    try {
      console.log('🚪 Cerrando sesión...')
      setLoading(true)
      setUser(null)
      setUsuario(null)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ Error en logout:', error)
      } else {
        console.log('✅ Logout exitoso')
      }
      
      // Limpiar cookies y redirigir
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=")
        const name = eqPos > -1 ? c.substr(0, eqPos) : c
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
      })
      
      window.location.href = '/'
    } catch (error) {
      console.error('💥 Error inesperado en logout:', error)
      window.location.href = '/'
    } finally {
      setLoading(false)
    }
  }

  const registrarIngreso = async () => {
    if (!user) return

    try {
      console.log('📝 Registrando ingreso...')
      await supabase
        .from('ingresos')
        .insert({
          usuario_id: user.id,
          user_agent: navigator.userAgent,
        })
      console.log('✅ Ingreso registrado')
    } catch (error) {
      console.error('❌ Error registrando ingreso:', error)
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