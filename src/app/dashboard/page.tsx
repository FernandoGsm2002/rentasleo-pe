'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const { user, usuario, loading } = useAuth()
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    console.log('📊 Dashboard - Estado:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      usuario: usuario ? { rol: usuario.rol, nombre: usuario.nombre } : null, 
      loading,
      redirecting
    })

    // Solo redirigir si tenemos usuario completo y no estamos cargando
    if (user && usuario && !loading && !redirecting) {
      setRedirecting(true)
      
      console.log('🔄 Redirigiendo usuario con rol:', usuario.rol)
      
      if (usuario.rol === 'creador') {
        console.log('👑 Redirigiendo a dashboard de admin')
        router.replace('/dashboard/admin')
      } else if (usuario.rol === 'trabajador') {
        console.log('👤 Redirigiendo a dashboard de trabajador')
        router.replace('/dashboard/trabajador')
      } else {
        console.warn('⚠️ Rol no reconocido, redirigiendo a trabajador por defecto')
        router.replace('/dashboard/trabajador')
      }
    }
  }, [user, usuario, loading, router, redirecting])

  // Si no hay usuario, redirigir al login
  if (!loading && !user) {
    router.replace('/')
    return null
  }

  // Mostrar carga mientras se obtienen los datos o se redirige
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">
          {loading ? 'Cargando datos del usuario...' : 'Redirigiendo al dashboard...'}
        </p>
        {usuario && (
          <p className="mt-2 text-sm text-gray-500">
            Bienvenido, {usuario.nombre} ({usuario.rol})
          </p>
        )}
      </div>
    </div>
  )
} 