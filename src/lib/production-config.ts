// Configuración específica para producción
export const PRODUCTION_CONFIG = {
  // Delays para evitar problemas de hydration
  NAVIGATION_DELAY: 200,
  TOAST_DELAY: 300,
  RETRY_DELAY: 500,
  
  // Timeouts
  AUTH_TIMEOUT: 10000,
  SESSION_CHECK_TIMEOUT: 5000,
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_MULTIPLIER: 1.5,
  
  // Cache settings
  SESSION_CACHE_DURATION: 60000, // 1 minuto
  
  // URLs
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  PRODUCTION_URL: 'https://leope-staff.vercel.app',
  
  // Feature flags
  ENABLE_DIAGNOSTICS: process.env.NODE_ENV !== 'production',
  ENABLE_VERBOSE_LOGGING: process.env.NODE_ENV !== 'production',
  
  // Error handling
  SHOW_ERROR_DETAILS: process.env.NODE_ENV !== 'production',
}

// Utilidad para verificar si estamos en producción
export const isProduction = () => process.env.NODE_ENV === 'production'

// Utilidad para obtener delay adecuado según el ambiente
export const getDelay = (type: 'navigation' | 'toast' | 'retry') => {
  if (!isProduction()) return 0
  
  switch (type) {
    case 'navigation':
      return PRODUCTION_CONFIG.NAVIGATION_DELAY
    case 'toast':
      return PRODUCTION_CONFIG.TOAST_DELAY
    case 'retry':
      return PRODUCTION_CONFIG.RETRY_DELAY
    default:
      return 100
  }
}

// Utilidad para logging condicional
export const log = {
  debug: (message: string, ...args: any[]) => {
    if (PRODUCTION_CONFIG.ENABLE_VERBOSE_LOGGING) {
      console.log(`🔍 ${message}`, ...args)
    }
  },
  
  info: (message: string, ...args: any[]) => {
    console.log(`ℹ️ ${message}`, ...args)
  },
  
  warn: (message: string, ...args: any[]) => {
    console.warn(`⚠️ ${message}`, ...args)
  },
  
  error: (message: string, ...args: any[]) => {
    console.error(`❌ ${message}`, ...args)
  },
  
  success: (message: string, ...args: any[]) => {
    console.log(`✅ ${message}`, ...args)
  }
}

// Función para manejo de errores de producción
export const handleProductionError = (error: any, context: string) => {
  log.error(`Error en ${context}:`, error)
  
  // En producción, enviar error a servicio de logging
  if (isProduction()) {
    // TODO: Integrar con servicio de logging (Sentry, etc.)
    try {
      // Fallback: almacenar en localStorage para debugging
      const errorLog = {
        timestamp: new Date().toISOString(),
        context,
        error: {
          message: error?.message || 'Unknown error',
          stack: error?.stack,
          code: error?.code
        },
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server'
      }
      
      if (typeof window !== 'undefined') {
        const existingLogs = localStorage.getItem('production-errors') || '[]'
        const logs = JSON.parse(existingLogs)
        logs.push(errorLog)
        
        // Mantener solo los últimos 10 errores
        if (logs.length > 10) {
          logs.splice(0, logs.length - 10)
        }
        
        localStorage.setItem('production-errors', JSON.stringify(logs))
      }
    } catch (logError) {
      console.error('Error guardando log:', logError)
    }
  }
}

// Utilidad para verificar conectividad de red
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return true
  
  try {
    // Verificar si hay conectividad básica
    if (!navigator.onLine) {
      return false
    }
    
    // Intentar hacer ping a un endpoint confiable
    const response = await fetch('/api/health', { 
      method: 'HEAD',
      cache: 'no-store'
    })
    
    return response.ok
  } catch {
    return false
  }
}

// Utilidad para limpiar storage en caso de problemas
export const clearStorageOnError = () => {
  if (typeof window === 'undefined') return
  
  try {
    // Limpiar solo items relacionados con auth
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    log.info('Storage limpiado por error de autenticación')
  } catch (error) {
    log.error('Error limpiando storage:', error)
  }
} 