'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { diagnoseAuthIssues, checkSupabaseConnection } from '@/lib/supabase'
import { useNotify } from '@/components/ui/notification'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const { signIn } = useAuth()
  const notify = useNotify()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('🔐 Iniciando proceso de login...')
      
      // Verificar conexión antes del login
      const connectionCheck = await checkSupabaseConnection()
      if (!connectionCheck.connected) {
        notify.error(
          'Error de conexión',
          `No se pudo conectar con el servidor: ${connectionCheck.error}`,
          { persistent: true }
        )
        return
      }
      
      const { error } = await signIn(email, password)
      
      if (error) {
        console.error('❌ Error en login:', error)
        
        // Si hay error HTTP 406, mostrar diagnósticos
        if (error.message?.includes('406') || error.code === 'invalid_request') {
          console.log('🔍 Error 406 detectado, ejecutando diagnósticos...')
          const diag = await diagnoseAuthIssues()
          setDiagnostics(diag)
          setShowDiagnostics(true)
          
          notify.error(
            'Error de autenticación',
            'Se detectó un problema con la configuración. Revisa los diagnósticos.',
            { duration: 8000 }
          )
        } else {
          // Personalizar mensaje según el tipo de error
          let title = 'Error de login'
          let message = error.message || 'Error desconocido'
          
          if (error.message?.includes('Invalid login credentials')) {
            title = 'Credenciales incorrectas'
            message = 'Email o contraseña incorrectos. Verifica tus datos.'
          } else if (error.message?.includes('Email not confirmed')) {
            title = 'Email no confirmado'
            message = 'Debes confirmar tu email antes de iniciar sesión.'
          } else if (error.message?.includes('Too many requests')) {
            title = 'Demasiados intentos'
            message = 'Has hecho muchos intentos. Espera unos minutos e intenta de nuevo.'
          }
          
          notify.error(title, message, { duration: 6000 })
        }
      } else {
        notify.success(
          'Login exitoso',
          'Redirigiendo al dashboard...',
          { duration: 3000 }
        )
      }
    } catch (error) {
      console.error('❌ Excepción en login:', error)
      notify.error(
        'Error inesperado',
        'Ocurrió un problema durante el login. Intenta nuevamente.',
        { duration: 6000 }
      )
    } finally {
      setLoading(false)
    }
  }

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      console.log('🔍 Ejecutando diagnósticos...')
      const diag = await diagnoseAuthIssues()
      setDiagnostics(diag)
      setShowDiagnostics(true)
    } catch (error) {
      console.error('❌ Error en diagnósticos:', error)
      notify.error(
        'Error en diagnósticos',
        'No se pudieron ejecutar los diagnósticos del sistema.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">LEOPE Staff</h1>
          <p className="text-gray-600">Sistema de Control de Trabajadores</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="usuario@leope.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Botón de diagnósticos */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Ejecutando...' : 'Diagnosticar Problemas'}
          </button>
        </div>

        {/* Panel de diagnósticos */}
        {showDiagnostics && diagnostics && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Diagnósticos</h3>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Ambiente:</span> {diagnostics.environment}
              </div>
              
              <div>
                <span className="font-medium">Configuración Supabase:</span>
                <div className="ml-4">
                  <div>URL: {diagnostics.supabaseUrl}</div>
                  <div>Anon Key: {diagnostics.anonKey}</div>
                </div>
              </div>
              
              <div>
                <span className="font-medium">Conexión:</span>
                <div className="ml-4">
                  {diagnostics.connection?.connected ? (
                    <span className="text-green-600">✅ Conectado</span>
                  ) : (
                    <span className="text-red-600">❌ {diagnostics.connection?.error}</span>
                  )}
                </div>
              </div>
              
              <div>
                <span className="font-medium">Sesión:</span>
                <div className="ml-4">
                  {diagnostics.session?.exists ? (
                    <div className="text-green-600">
                      ✅ Sesión activa
                      <div>Usuario: {diagnostics.session.userId}</div>
                    </div>
                  ) : diagnostics.session?.error ? (
                    <span className="text-red-600">❌ {diagnostics.session.error}</span>
                  ) : (
                    <span className="text-yellow-600">⚠️ Sin sesión</span>
                  )}
                </div>
              </div>
              
              {diagnostics.user && (
                <div>
                  <span className="font-medium">Usuario en BD:</span>
                  <div className="ml-4">
                    {diagnostics.user.found ? (
                      <div className="text-green-600">
                        ✅ Usuario encontrado
                        <div>Rol: {diagnostics.user.data?.rol}</div>
                        <div>Email: {diagnostics.user.data?.email}</div>
                      </div>
                    ) : (
                      <span className="text-red-600">❌ {diagnostics.user.error}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
              <strong>Timestamp:</strong> {diagnostics.timestamp}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 