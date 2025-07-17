'use client'

import { useState, useEffect, useCallback } from 'react'
import { RentaHerramienta } from '@/types/supabase'

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  tag?: string
  requireInteraction?: boolean
}

interface UseNotificationsReturn {
  permission: NotificationPermission | null
  requestPermission: () => Promise<NotificationPermission>
  showNotification: (options: NotificationOptions) => void
  checkExpiredRents: (rentas: RentaHerramienta[]) => void
  notificationsEnabled: boolean
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  // Inicializar permisos al cargar
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
      setNotificationsEnabled(Notification.permission === 'granted')
    }
  }, [])

  // Solicitar permisos de notificación
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones')
      return 'denied'
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      setNotificationsEnabled(result === 'granted')
      
      if (result === 'granted') {
        showNotification({
          title: '🔔 Notificaciones activadas',
          body: 'Ahora recibirás alertas cuando las rentas venzan',
          icon: '/favicon.ico'
        })
      }
      
      return result
    } catch (error) {
      console.error('Error solicitando permisos:', error)
      return 'denied'
    }
  }, [])

  // Mostrar notificación
  const showNotification = useCallback((options: NotificationOptions) => {
    if (!notificationsEnabled || !('Notification' in window)) {
      console.warn('Notificaciones no habilitadas')
      return
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        badge: '/favicon.ico'
      })

      // Auto cerrar después de 10 segundos si no requiere interacción
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close()
        }, 10000)
      }

      // Opcional: manejar click en la notificación
      notification.onclick = () => {
        window.focus()
        notification.close()
      }

    } catch (error) {
      console.error('Error mostrando notificación:', error)
    }
  }, [notificationsEnabled])

  // Verificar rentas vencidas y próximas a vencer
  const checkExpiredRents = useCallback((rentas: RentaHerramienta[]) => {
    if (!notificationsEnabled) return

    const now = new Date()
    
    rentas.forEach((renta) => {
      if (!renta.activa) return

      const fechaFin = new Date(renta.fecha_fin)
      const hoursRemaining = (fechaFin.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      // Renta vencida
      if (fechaFin < now) {
        showNotification({
          title: '🔴 Renta Vencida',
          body: `${renta.nombre_herramienta} ha vencido. ¡Cambia la clave y agrega el stock!`,
          tag: `expired-${renta.id}`,
          requireInteraction: true,
          icon: '/png/unlocktool.png' // Usar el icono de la herramienta si está disponible
        })
      }
      // Próxima a vencer (menos de 2 horas)
      else if (hoursRemaining <= 2 && hoursRemaining > 0) {
        showNotification({
          title: '⚠️ Renta Próxima a Vencer',
          body: `${renta.nombre_herramienta} vence en ${Math.round(hoursRemaining)} hora(s). Prepárate para cambiar la clave.`,
          tag: `expiring-${renta.id}`,
          requireInteraction: false
        })
      }
      // Alerta temprana (menos de 6 horas)
      else if (hoursRemaining <= 6 && hoursRemaining > 2) {
        showNotification({
          title: '🟡 Alerta de Vencimiento',
          body: `${renta.nombre_herramienta} vence en ${Math.round(hoursRemaining)} horas.`,
          tag: `warning-${renta.id}`,
          requireInteraction: false
        })
      }
    })
  }, [notificationsEnabled, showNotification])

  return {
    permission,
    requestPermission,
    showNotification,
    checkExpiredRents,
    notificationsEnabled
  }
} 