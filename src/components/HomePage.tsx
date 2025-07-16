'use client'

import { useAuth } from '@/contexts/AuthContext'
import LoginForm from '@/components/auth/LoginForm'
import { useEffect } from 'react'
import { useSafeNavigation, getDashboardPath, logNavigation } from '@/lib/navigation'

export default function HomePage() {
  const { user, usuario, loading, showWelcome } = useAuth()
  const { navigateTo } = useSafeNavigation()

  useEffect(() => {
    console.log('🏠 HomePage - Estado:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      usuario: usuario ? { 
        id: usuario.id, 
        email: usuario.email, 
        nombre: usuario.nombre,
        rol: usuario.rol
      } : null, 
      loading,
      showWelcome
    })
    
    // Solo redirigir si tenemos usuario completo, no estamos cargando y no estamos mostrando welcome
    if (user && usuario && !loading && !showWelcome) {
      console.log('🔄 Usuario autenticado, redirigiendo al dashboard')
      console.log('👤 Rol del usuario:', usuario.rol)
      
      // Redirigir directamente al dashboard específico según el rol
      const targetPath = getDashboardPath(usuario.rol)
      logNavigation('HomePage', targetPath, 'Usuario autenticado')
      
      navigateTo(targetPath)
    }
  }, [user, usuario, loading, showWelcome, navigateTo])

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

  // Si hay usuario pero no datos de BD, mostrar mensaje de configuración
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

  // Si no hay usuario, mostrar login
  if (!user) {
    return <LoginForm />
  }

  // Estado de transición
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Preparando dashboard...</p>
      </div>
    </div>
  )
} 