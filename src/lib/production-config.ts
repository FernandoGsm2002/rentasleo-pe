// Configuraciones optimizadas para producción
export const PRODUCTION_CONFIG = {
  // Configuraciones de autenticación
  auth: {
    // Verificar sesión cada 5 minutos en lugar de esperar a que expire
    sessionCheckInterval: 5 * 60 * 1000, // 5 minutos
    // Tiempo máximo para operaciones de auth
    authTimeout: 30000, // 30 segundos
    // Número de reintentos para operaciones críticas
    maxRetries: 3,
    // Tiempo entre reintentos
    retryDelay: 2000, // 2 segundos
  },
  
  // Configuraciones de base de datos
  database: {
    // Timeout para consultas de base de datos
    queryTimeout: 15000, // 15 segundos
    // Timeout para operaciones de escritura
    writeTimeout: 20000, // 20 segundos
    // Configuración de conexión
    connectionTimeout: 10000, // 10 segundos
  },
  
  // Configuraciones de UI
  ui: {
    // Tiempo para mostrar mensajes de loading
    loadingTimeout: 30000, // 30 segundos
    // Tiempo para auto-cerrar toasts
    toastDuration: 5000, // 5 segundos
    // Debounce para búsquedas
    searchDebounce: 300, // 300ms
  },
  
  // Configuraciones de red
  network: {
    // Tiempo máximo para requests HTTP
    httpTimeout: 25000, // 25 segundos
    // Reintentos automáticos para errores de red
    networkRetries: 2,
    // Tiempo entre reintentos de red
    networkRetryDelay: 1500, // 1.5 segundos
  },
  
  // Configuraciones específicas para Supabase
  supabase: {
    // Storage key personalizado
    storageKey: 'sb-rentas-auth-token',
    // Configuraciones de refresh de token
    tokenRefreshThreshold: 300, // 5 minutos antes de expirar
    // Auto-logout si no se puede refrescar token
    autoLogoutOnTokenError: true,
    // Configuraciones de realtime
    realtime: {
      eventsPerSecond: 10,
      timeout: 20000
    }
  },
  
  // Configuraciones de desarrollo vs producción
  environment: {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    // Logging detallado solo en desarrollo
    enableDetailedLogs: process.env.NODE_ENV === 'development',
    // Verificaciones adicionales en desarrollo
    enableHealthChecks: true,
  }
}

// Función helper para obtener timeout basado en el tipo de operación
export const getOperationTimeout = (operation: 'auth' | 'database' | 'network'): number => {
  switch (operation) {
    case 'auth':
      return PRODUCTION_CONFIG.auth.authTimeout
    case 'database':
      return PRODUCTION_CONFIG.database.queryTimeout
    case 'network':
      return PRODUCTION_CONFIG.network.httpTimeout
    default:
      return 15000 // Default 15 segundos
  }
}

// Función para logging condicional
export const conditionalLog = (message: string, data?: any) => {
  if (PRODUCTION_CONFIG.environment.enableDetailedLogs) {
    console.log(message, data || '')
  }
}

// Función para retry con configuración
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = PRODUCTION_CONFIG.auth.maxRetries,
  delay: number = PRODUCTION_CONFIG.auth.retryDelay
): Promise<T> => {
  let lastError: any
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      conditionalLog(`🔄 Intento ${i + 1}/${maxRetries + 1} falló:`, error)
      
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

// Configuración para timeout de Promise
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operación timeout'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    )
  ])
} 