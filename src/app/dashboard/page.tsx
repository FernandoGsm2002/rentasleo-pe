'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { useSafeNavigation, getDashboardPath, logNavigation } from '@/lib/navigation'

export default function DashboardPage() {
  const { user, usuario, loading } = useAuth()
  const { navigateTo } = useSafeNavigation()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    console.log('📊 Dashboard - Estado:', { 
      user: user ? { id: user.id, email: user.email } : null, 
      usuario: usuario ? { rol: usuario.rol, nombre: usuario.nombre } : null, 
      loading,
      redirecting
    })

    // Evitar múltiples redirecciones
    if (redirecting) {
      console.log('⏳ Ya redirigiendo, saltando...')
      return
    }

    // Si no hay usuario después de cargar, redirigir al login
    if (!loading && !user) {
      console.log('🚫 Sin usuario, redirigiendo al login')
      setRedirecting(true)
      logNavigation('Dashboard', '/', 'Sin usuario')
      navigateTo('/')
      return
    }

    // Solo redirigir si tenemos usuario completo y no estamos cargando
    if (user && usuario && !loading) {
      setRedirecting(true)
      
      console.log('🔄 Redirigiendo usuario con rol:', usuario.rol)
      
      const targetPath = getDashboardPath(usuario.rol)
      logNavigation('Dashboard', targetPath, `Rol: ${usuario.rol}`)
      navigateTo(targetPath)
    }
  }, [user, usuario, loading, navigateTo, redirecting])

  // Mostrar loading mientras procesamos
  if (loading || !user || !usuario || redirecting) {
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

  // Si llegamos aquí, algo salió mal
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-red-600">Error: No se pudo cargar el dashboard</p>
        <button 
          onClick={() => navigateTo('/', true)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Volver al login
        </button>
      </div>
    </div>
  )
} 