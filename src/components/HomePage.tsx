'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'
import LoginForm from './auth/LoginForm'

export default function HomePage() {
  const { user, userData, loading } = useAuth()

  useEffect(() => {
    // Si el usuario está autenticado y tenemos datos del usuario, redirigir al dashboard
    if (user && userData && !loading) {
      const dashboardPath = userData.rol === 'creador' ? '/dashboard/admin' : '/dashboard/trabajador'
      window.location.href = dashboardPath
    }
  }, [user, userData, loading])

  // Si está cargando, mostrar loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si hay usuario pero no datos de usuario, mostrar loading
  if (user && !userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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