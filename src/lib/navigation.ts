import { useRouter } from 'next/navigation'
import { useCallback, useRef } from 'react'

// Utilidad para manejo seguro de navegación en producción
export const useSafeNavigation = () => {
  const router = useRouter()
  const isNavigatingRef = useRef(false)
  const lastNavigationRef = useRef<string | null>(null)

  const navigateTo = useCallback((path: string, force = false) => {
    // Evitar navegaciones duplicadas
    if (!force && (isNavigatingRef.current || lastNavigationRef.current === path)) {
      console.log('🚫 Navegación bloqueada - ya navegando a:', path)
      return false
    }

    console.log('🔄 Navegando a:', path)
    isNavigatingRef.current = true
    lastNavigationRef.current = path

    // En producción, usar un pequeño delay para evitar problemas de hydration
    const delay = process.env.NODE_ENV === 'production' ? 150 : 0
    
    setTimeout(() => {
      try {
        router.replace(path)
        
        // Resetear flags después de un tiempo
        setTimeout(() => {
          isNavigatingRef.current = false
        }, 1000)
      } catch (error) {
        console.error('❌ Error en navegación:', error)
        isNavigatingRef.current = false
        
        // Fallback usando window.location en caso de error
        if (typeof window !== 'undefined') {
          window.location.href = path
        }
      }
    }, delay)

    return true
  }, [router])

  const reset = useCallback(() => {
    isNavigatingRef.current = false
    lastNavigationRef.current = null
    console.log('🔄 Reset navegación')
  }, [])

  return {
    navigateTo,
    reset,
    isNavigating: isNavigatingRef.current,
    lastPath: lastNavigationRef.current
  }
}

// Utilidad para obtener la ruta correcta según el rol
export const getDashboardPath = (rol: string): string => {
  switch (rol) {
    case 'creador':
      return '/dashboard/admin'
    case 'trabajador':
      return '/dashboard/trabajador'
    default:
      console.warn('⚠️ Rol no reconocido:', rol, '- usando trabajador por defecto')
      return '/dashboard/trabajador'
  }
}

// Utilidad para logging en navegación
export const logNavigation = (from: string, to: string, reason: string) => {
  console.log(`🔄 Navegación: ${from} → ${to} (${reason})`)
}

// Función para manejo de errores de navegación en producción
export const handleNavigationError = (error: any, fallbackPath = '/') => {
  console.error('❌ Error de navegación:', error)
  
  // En producción, usar window.location como fallback
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    console.log('🔄 Usando fallback de navegación:', fallbackPath)
    window.location.href = fallbackPath
  }
} 