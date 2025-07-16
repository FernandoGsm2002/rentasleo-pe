'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user, usuario, loading } = useAuth()

  useEffect(() => {
    // Si no hay usuario, redirigir al login
    if (!loading && !user) {
      window.location.href = '/'
      return
    }

    // Si hay usuario pero no datos del usuario, esperar
    if (user && !usuario) {
      return
    }

    // Si tenemos todos los datos, redirigir al dashboard específico
    if (user && usuario) {
      const dashboardPath = usuario.rol === 'creador' ? '/dashboard/admin' : '/dashboard/trabajador'
      window.location.href = dashboardPath
    }
  }, [user, usuario, loading])

  // Mostrar loading mientras se determina el destino
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  )
} 