'use client'

import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { RentaHerramienta } from '@/types/supabase'
import { 
  Bell, 
  BellOff, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Clock,
  Settings
} from 'lucide-react'

interface NotificationStatusProps {
  rentas: RentaHerramienta[]
  isRealtimeConnected?: boolean
  className?: string
  compact?: boolean
}

export default function NotificationStatus({ 
  rentas, 
  isRealtimeConnected = false, 
  className = '',
  compact = false 
}: NotificationStatusProps) {
  const { 
    permission, 
    requestPermission, 
    notificationsEnabled, 
    checkExpiredRents 
  } = useNotifications()
  
  const [isRequesting, setIsRequesting] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  // Calcular estadísticas de rentas
  const stats = {
    total: rentas.filter(r => r.activa).length,
    expired: rentas.filter(r => {
      if (!r.activa) return false
      const now = new Date()
      return new Date(r.fecha_fin) < now
    }).length,
    expiringSoon: rentas.filter(r => {
      if (!r.activa) return false
      const now = new Date()
      const fechaFin = new Date(r.fecha_fin)
      const hoursRemaining = (fechaFin.getTime() - now.getTime()) / (1000 * 60 * 60)
      return hoursRemaining <= 6 && hoursRemaining > 0
    }).length
  }

  const handleRequestPermission = async () => {
    if (isRequesting) return
    
    setIsRequesting(true)
    try {
      await requestPermission()
    } finally {
      setIsRequesting(false)
    }
  }

  const handleTestNotification = () => {
    checkExpiredRents(rentas)
  }

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={notificationsEnabled ? undefined : handleRequestPermission}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`relative flex items-center justify-center p-2 rounded-lg transition-all ${
            notificationsEnabled 
              ? 'text-green-600 hover:bg-green-50' 
              : 'text-gray-400 hover:bg-gray-50'
          }`}
          disabled={isRequesting}
        >
          {/* Campanita principal */}
          {notificationsEnabled ? (
            <Bell className="w-5 h-5" />
          ) : (
            <BellOff className="w-5 h-5" />
          )}

          {/* Indicador de conexión Realtime */}
          <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
            isRealtimeConnected ? 'bg-blue-500' : 'bg-gray-300'
          }`} />

          {/* Badge de alertas críticas */}
          {stats.expired > 0 && (
            <div className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse font-bold">
              {stats.expired}
            </div>
          )}

          {/* Badge de próximas a vencer */}
          {stats.expired === 0 && stats.expiringSoon > 0 && (
            <div className="absolute -top-2 -left-2 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {stats.expiringSoon}
            </div>
          )}
        </button>

        {/* Tooltip informativo */}
        {showTooltip && (
          <div className="absolute right-0 top-full mt-2 bg-gray-900 text-white text-xs rounded-lg p-3 whitespace-nowrap z-50 shadow-lg">
            <div className="space-y-1">
              <div className="font-semibold">
                {notificationsEnabled ? '🔔 Notificaciones Activas' : '🔕 Notificaciones Desactivadas'}
              </div>
              <div className="flex items-center space-x-4 text-gray-300">
                <span>📊 {stats.total} activas</span>
                {stats.expiringSoon > 0 && <span className="text-orange-300">⚠️ {stats.expiringSoon} por vencer</span>}
                {stats.expired > 0 && <span className="text-red-300">🔴 {stats.expired} vencidas</span>}
              </div>
              <div className="flex items-center space-x-1 text-gray-400">
                {isRealtimeConnected ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    <span>Tiempo real conectado</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>Sin conexión en tiempo real</span>
                  </>
                )}
              </div>
              {!notificationsEnabled && (
                <div className="text-blue-300 pt-1 border-t border-gray-700">
                  👆 Click para activar
                </div>
              )}
            </div>
            
            {/* Flecha del tooltip */}
            <div className="absolute top-0 right-4 transform -translate-y-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Notificaciones en Tiempo Real</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Estado de conexión Realtime */}
          <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
            isRealtimeConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {isRealtimeConnected ? (
              <>
                <Wifi className="w-3 h-3" />
                <span>Conectado</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Desconectado</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Estado actual */}
      <div className="space-y-4">
        {/* Permisos de notificación */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              notificationsEnabled 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {notificationsEnabled ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {notificationsEnabled ? 'Notificaciones Activas' : 'Notificaciones Desactivadas'}
              </p>
              <p className="text-xs text-gray-500">
                {notificationsEnabled 
                  ? 'Recibirás alertas cuando las rentas venzan'
                  : 'Activa las notificaciones para recibir alertas'
                }
              </p>
            </div>
          </div>
          
          {!notificationsEnabled && (
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isRequesting ? 'Solicitando...' : 'Activar'}
            </button>
          )}
        </div>

        {/* Estadísticas */}
        {notificationsEnabled && (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-500">Rentas Activas</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-semibold ${
                stats.expiringSoon > 0 ? 'text-orange-600' : 'text-gray-900'
              }`}>
                {stats.expiringSoon}
              </div>
              <div className="text-xs text-gray-500">Por Vencer</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-semibold ${
                stats.expired > 0 ? 'text-red-600 animate-pulse' : 'text-gray-900'
              }`}>
                {stats.expired}
              </div>
              <div className="text-xs text-gray-500">Vencidas</div>
            </div>
          </div>
        )}

        {/* Alertas críticas */}
        {notificationsEnabled && stats.expired > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                ¡{stats.expired} renta(s) vencida(s)!
              </span>
            </div>
            <p className="text-xs text-red-600 mt-1">
              Cambia las claves y agrega el stock inmediatamente
            </p>
          </div>
        )}

        {/* Próximas a vencer */}
        {notificationsEnabled && stats.expiringSoon > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                {stats.expiringSoon} renta(s) próxima(s) a vencer
              </span>
            </div>
            <p className="text-xs text-orange-600 mt-1">
              Prepárate para cambiar las claves
            </p>
          </div>
        )}

        {/* Botón de prueba (solo en desarrollo) */}
        {notificationsEnabled && process.env.NODE_ENV === 'development' && (
          <button
            onClick={handleTestNotification}
            className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Probar Notificaciones</span>
          </button>
        )}
      </div>
    </div>
  )
} 