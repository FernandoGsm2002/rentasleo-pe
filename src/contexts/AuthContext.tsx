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
  const [userProcessed, setUserProcessed] = useState<string | null>(null) // Para evitar bucles
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    // Obtener la sesión inicial
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user && userProcessed !== session.user.id) {
        setUserProcessed(session.user.id)
        await obtenerDatosUsuario(session.user.id, session.user.email)
      }
      setLoading(false)
    }

    getSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user && userProcessed !== session.user.id) {
          setUserProcessed(session.user.id)
          await obtenerDatosUsuario(session.user.id, session.user.email)
          if (event === 'SIGNED_IN') {
            await registrarIngreso()
          }
        } else if (!session?.user) {
          setUsuario(null)
          setUserProcessed(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [userProcessed]) // Agregar userProcessed como dependencia

  const crearUsuarioEnBD = async (userId: string, email: string) => {
    try {
      // Validar que tenemos email
      if (!email) {
        console.error('❌ No se puede crear usuario sin email')
        return
      }

      const nuevoUsuario = {
        id: userId,
        email: email,
        nombre: email.split('@')[0] || 'Usuario',
        rol: 'trabajador' as const, // Por defecto trabajador
        activo: true,
        sueldo_base: 0
      }

      console.log('🚀 Creando nuevo usuario:', nuevoUsuario)

      const { data, error } = await supabase
        .from('usuarios')
        .insert(nuevoUsuario)
        .select()
        .single()

      console.log('📊 Resultado de creación:', { data, error })

      if (data && !error) {
        setUsuario(data)
        console.log('✅ Usuario creado exitosamente:', data)
      } else {
        console.error('❌ Error creando usuario en BD:', error)
        
        // Si el error es por email duplicado, buscar el usuario existente
        if (error?.code === '23505' && error?.message?.includes('usuarios_email_key')) {
          console.log('⚠️ Email ya existe, buscando usuario existente...')
          const { data: usuarioExistente } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .single()
            
          if (usuarioExistente) {
            console.log('✅ Usuario existente encontrado:', usuarioExistente)
            setUsuario(usuarioExistente)
            return
          }
        }
        
        // Crear usuario temporal si falla la creación
        const usuarioTemporal = {
          ...nuevoUsuario,
          sueldo_base: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setUsuario(usuarioTemporal)
        console.log('⚠️ Usando usuario temporal:', usuarioTemporal)
      }
    } catch (error) {
      console.error('Error en crearUsuarioEnBD:', error)
      
      // Solo crear fallback si tenemos email
      if (email) {
        setUsuario({
          id: userId,
          email: email,
          nombre: email.split('@')[0] || 'Usuario',
          rol: 'trabajador' as const,
          activo: true,
          sueldo_base: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    }
  }

  const obtenerDatosUsuario = async (userId: string, userEmail?: string) => {
    try {
      console.log('🔍 Buscando usuario con ID:', userId)
      console.log('📧 Email proporcionado:', userEmail)
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()

      console.log('📊 Respuesta de BD por ID:', { data, error })

      if (data && !error) {
        setUsuario(data)
        console.log('✅ Usuario encontrado en BD por ID:', data)
      } else {
        console.log('❌ Usuario no encontrado por ID. Buscando por email...')
        
        // Usar el email proporcionado como parámetro, o el email del user como fallback
        const emailParaBuscar = userEmail || user?.email
        console.log('📧 Email para buscar:', emailParaBuscar)
        
        if (!emailParaBuscar) {
          console.error('❌ No hay email para buscar usuario')
          return // No crear usuario sin email
        }
        
        // Verificar si existe por email
        const { data: usuarioPorEmail, error: errorEmail } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', emailParaBuscar)
          .single()

        console.log('📊 Respuesta de BD por email:', { usuarioPorEmail, errorEmail })

        if (usuarioPorEmail && !errorEmail) {
          console.log('✅ Usuario encontrado por email:', usuarioPorEmail)
          console.log('⚠️ IMPORTANTE: Usando usuario existente, NO se puede cambiar el ID')
          
          // USAR EL USUARIO EXISTENTE TAL COMO ESTÁ
          // No intentamos cambiar el ID porque es primary key
          setUsuario(usuarioPorEmail)
          
          console.log('✅ Usuario establecido correctamente:', usuarioPorEmail)
        } else {
          console.log('❌ Usuario no encontrado por email tampoco, creando nuevo...')
          await crearUsuarioEnBD(userId, emailParaBuscar)
        }
      }
    } catch (error) {
      console.error('Error obteniendo datos usuario:', error)
      
      // En caso de error, solo crear fallback si tenemos email
      const emailParaFallback = userEmail || user?.email
      if (emailParaFallback) {
        setUsuario({
          id: userId,
          email: emailParaFallback,
          nombre: emailParaFallback.split('@')[0] || 'Usuario',
          rol: 'trabajador' as const,
          activo: true,
          sueldo_base: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (!error) {
      // Mostrar mensaje de bienvenida por 3 segundos
      setShowWelcome(true)
      setTimeout(() => {
        setShowWelcome(false)
      }, 3000)
    }
    
    return { error }
  }

  const signOut = async () => {
    try {
      // Limpiar estados antes del logout
      setUser(null)
      setUsuario(null)
      setUserProcessed(null)
      
      // Ejecutar logout en Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error en logout:', error)
      }
      
      // Redirigir al login (independientemente del error)
      window.location.href = '/'
    } catch (error) {
      console.error('Error inesperado en logout:', error)
      // En caso de error, forzar redirección
      window.location.href = '/'
    }
  }

  const registrarIngreso = async () => {
    if (!user) return

    // Obtener información del navegador
    const userAgent = navigator.userAgent
    
    try {
      await supabase
        .from('ingresos')
        .insert({
          usuario_id: user.id,
          user_agent: userAgent,
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