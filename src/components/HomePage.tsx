'use client'

import { useAuth } from '@/contexts/AuthContext'
import LoginForm from '@/components/auth/LoginForm'
import { useEffect } from 'react'

export default function HomePage() {
  const { user, usuario, loading } = useAuth()

  useEffect(() => {
    // Si el usuario está autenticado y tenemos datos del usuario, redirigir al dashboard
    if (user && usuario && !loading) {
      const dashboardPath = usuario.rol === 'creador' ? '/dashboard/admin' : '/dashboard/trabajador'
      window.location.href = dashboardPath
    }
  }, [user, usuario, loading])

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // Si hay usuario pero no datos de usuario, mostrar loading
  if (user && !usuario) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando datos de usuario...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario, mostrar formulario de login
  return <LoginForm />
} 