'use client'

import { useAuth } from '@/contexts/AuthContext'
import LoginForm from '@/components/auth/LoginForm'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

export default function HomePage() {
  const { user, usuario, loading, showWelcome } = useAuth()
  const router = useRouter()
  const redirecting = useRef(false)

  useEffect(() => {
    console.log('🏠 HomePage - Estado completo:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      usuario: usuario ? { 
        id: usuario.id, 
        email: usuario.email, 
        nombre: usuario.nombre,
        rol: usuario.rol,
        activo: usuario.activo 
      } : null, 
      loading,
      redirecting: redirecting.current
    })
    
    // Solo redirigir si tenemos usuario completo, no estamos cargando y no hemos redirigido ya
    if (user && usuario && !loading && !redirecting.current) {
      console.log('🔄 Evaluando redirección para usuario:', {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol
      })
      
      redirecting.current = true
      
      // Redirigir al dashboard según el rol
      if (usuario.rol === 'creador') {
        console.log('👑 Usuario es CREADOR - Redirigiendo a dashboard de admin')
        router.push('/dashboard/admin')
      } else if (usuario.rol === 'trabajador') {
        console.log('👤 Usuario es TRABAJADOR - Redirigiendo a dashboard de trabajador')
        router.push('/dashboard/trabajador')
      } else {
        console.warn('⚠️ Rol de usuario no reconocido:', usuario.rol)
        // Por defecto ir a trabajador
        router.push('/dashboard/trabajador')
      }
    } else if (user && !usuario && !loading) {
      console.warn('⚠️ Usuario autenticado pero sin datos en BD')
    }
  }, [user, usuario, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  // Mostrar mensaje de bienvenida después del login
  if (showWelcome && user && usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center animate-fade-in">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              ¡Bienvenido a LEOPE-STAFF!
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Hola <strong>{usuario.nombre}</strong>, sesión iniciada correctamente
            </p>
            <p className="text-sm text-gray-500">
              Redirigiendo al dashboard...
            </p>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  // Si hay usuario pero no datos de BD, mostrar mensaje
  if (user && !usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Configurando cuenta...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  )
} 