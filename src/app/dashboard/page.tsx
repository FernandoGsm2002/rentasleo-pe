'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user, userData, loading } = useAuth()

  useEffect(() => {
    // Si no hay usuario, redirigir al login
    if (!user && !loading) {
      window.location.href = '/'
      return
    }

    // Si tenemos usuario, redirigir según el rol
    if (user && userData && !loading) {
      const targetPath = userData.rol === 'creador' ? '/dashboard/admin' : '/dashboard/trabajador'
      window.location.href = targetPath
    }
  }, [user, userData, loading])

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