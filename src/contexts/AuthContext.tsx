'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createSupabaseBrowserClient, withRetry, logError } from '@/lib/supabase'
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

    // Obtener la sesión inicial con retry
    const getSession = async () => {
      try {
        console.log('🔄 Obteniendo sesión inicial...')
        
        const { data: { session }, error } = await withRetry(
          () => supabase.auth.getSession(),
          3,
          1000
        )
        
        if (error) {
          logError('getSession', error)
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
        logError('getSession', error)
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
      
      // Primero buscar por ID con retry
      const result = await withRetry(
        async () => {
          const response = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', userId)
            .single()
          return response
        },
        2,
        500
      )

      if (result.data && !result.error) {
        setUsuario(result.data)
        console.log('✅ Usuario encontrado por ID:', { nombre: result.data.nombre, rol: result.data.rol })
        return
      }

      console.log('⚠️ Usuario no encontrado por ID, buscando por email...')

      // Si no se encuentra por ID, buscar por email
      if (userEmail) {
        const emailResult = await withRetry(
          async () => {
            const response = await supabase
              .from('usuarios')
              .select('*')
              .eq('email', userEmail)
              .single()
            return response
          },
          2,
          500
        )

        if (emailResult.data && !emailResult.error) {
          setUsuario(emailResult.data)
          console.log('✅ Usuario encontrado por email:', { nombre: emailResult.data.nombre, rol: emailResult.data.rol })
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
      logError('obtenerDatosUsuario', error, { userId, userEmail })
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

      const result = await withRetry(
        async () => {
          const response = await supabase
            .from('usuarios')
            .insert(nuevoUsuario)
            .select()
            .single()
          return response
        },
        2,
        1000
      )

      if (result.data && !result.error) {
        setUsuario(result.data)
        console.log('✅ Usuario creado exitosamente:', { nombre: result.data.nombre, rol: result.data.rol })
      } else if (result.error?.code === '23505') {
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
        logError('crearUsuarioEnBD', result.error, { userId, email })
        setUsuario(createTempUser(userId, email))
      }
    } catch (error) {
      logError('crearUsuarioEnBD', error, { userId, email })
      setUsuario(createTempUser(userId, email))
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Intentando iniciar sesión...')
      setLoading(true)
      
      const { data, error } = await withRetry(
        () => supabase.auth.signInWithPassword({
          email,
          password,
        }),
        2,
        1000
      )
      
      if (!error && data.session) {
        console.log('✅ Login exitoso - ID:', data.session.user.id)
        console.log('📧 Email:', data.session.user.email)
        
        // Mostrar mensaje de bienvenida
        setShowWelcome(true)
        
        // El AuthContext se encargará de la redirección automática
        // a través del useEffect cuando detecte el cambio de estado
        console.log('🎯 Login completado, esperando redirección automática...')
        
        setTimeout(() => {
          setShowWelcome(false)
        }, 2500)
      } else {
        setLoading(false)
        logError('signIn', error, { email })
      }
      
      return { error }
    } catch (error) {
      setLoading(false)
      logError('signIn', error, { email })
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
        logError('signOut', error)
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
      logError('signOut', error)
      window.location.href = '/'
    } finally {
      setLoading(false)
    }
  }

  const registrarIngreso = async () => {
    if (!user) return

    try {
      console.log('📝 Registrando ingreso...')
      await withRetry(
        async () => {
          const response = await supabase
            .from('ingresos')
            .insert({
              usuario_id: user.id,
              user_agent: navigator.userAgent,
            })
          return response
        },
        2,
        500
      )
      console.log('✅ Ingreso registrado')
    } catch (error) {
      logError('registrarIngreso', error, { userId: user.id })
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