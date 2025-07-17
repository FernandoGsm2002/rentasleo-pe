'use client'

import { useEffect, useState } from 'react'

interface LoadingProps {
  message?: string
  timeout?: number
  onTimeout?: () => void
  className?: string
}

export function Loading({ 
  message = 'Cargando...', 
  timeout = 5000,
  onTimeout,
  className = ''
}: LoadingProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false)
  const [dots, setDots] = useState('')

  useEffect(() => {
    // Animación de puntos
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return ''
        return prev + '.'
      })
    }, 500)

    // Timeout de seguridad
    const timeoutId = setTimeout(() => {
      setHasTimedOut(true)
      onTimeout?.()
      console.warn('⚠️ [LOADING] Timeout después de', timeout, 'ms')
    }, timeout)

    return () => {
      clearInterval(dotsInterval)
      clearTimeout(timeoutId)
    }
  }, [timeout, onTimeout])

  if (hasTimedOut) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
        <div className="text-yellow-600 text-center">
          <div className="w-12 h-12 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium">⚠️ Carga lenta detectada</p>
          <p className="text-sm text-gray-600 mt-2">
            Esto puede deberse a la conexión. 
            <button 
              onClick={() => window.location.reload()} 
              className="text-blue-600 hover:underline ml-1"
            >
              Refrescar página
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-600 text-center">
        {message}{dots}
      </p>
    </div>
  )
}

export function PageLoading({ message = 'Cargando página' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loading 
        message={message}
        timeout={8000}
        onTimeout={() => {
          console.error('❌ [PAGE_LOADING] Timeout de página')
        }}
        className="bg-white rounded-lg shadow-sm p-8"
      />
    </div>
  )
}

export function ComponentLoading({ message = 'Cargando datos' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <Loading 
        message={message}
        timeout={6000}
        onTimeout={() => {
          console.error('❌ [COMPONENT_LOADING] Timeout de componente')
        }}
      />
    </div>
  )
} 