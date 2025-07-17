'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { RentaHerramienta } from '@/types/supabase'
import { useNotifications } from './useNotifications'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseRentasRealtimeOptions {
  onRentasUpdate?: (rentas: RentaHerramienta[]) => void
  autoCheckExpired?: boolean
  checkInterval?: number // minutos
}

interface UseRentasRealtimeReturn {
  isConnected: boolean
  subscribe: () => void
  unsubscribe: () => void
  forceCheck: () => void
}

export function useRentasRealtime(
  rentas: RentaHerramienta[],
  options: UseRentasRealtimeOptions = {}
): UseRentasRealtimeReturn {
  const {
    onRentasUpdate,
    autoCheckExpired = true,
    checkInterval = 30 // 30 minutos por defecto
  } = options

  const supabase = createSupabaseBrowserClient()
  const { checkExpiredRents, notificationsEnabled, showNotification } = useNotifications()
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isConnectedRef = useRef(false)
  const lastCheckedRef = useRef<Set<string>>(new Set())

  // Función para verificar rentas manualmente
  const forceCheck = useCallback(() => {
    if (rentas.length > 0) {
      console.log('🔍 Verificando rentas vencidas...', rentas.length)
      checkExpiredRents(rentas)
    }
  }, [rentas, checkExpiredRents])

  // Función mejorada para detectar cambios importantes
  const checkForImportantChanges = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    console.log('📡 Cambio en tiempo real:', eventType, newRecord?.nombre_herramienta)

    // Si una renta se actualiza y ahora está vencida
    if (eventType === 'UPDATE' && newRecord) {
      const now = new Date()
      const fechaFin = new Date(newRecord.fecha_fin)
      
      // Si la renta acaba de vencer
      if (newRecord.activa && fechaFin < now) {
        const rentaId = newRecord.id
        
        // Evitar spam de notificaciones para la misma renta
        if (!lastCheckedRef.current.has(rentaId)) {
          lastCheckedRef.current.add(rentaId)
          
          showNotification({
            title: '🔴 ¡RENTA VENCIDA!',
            body: `${newRecord.nombre_herramienta} ha vencido. ¡Cambia la clave YA y agrega el stock!`,
            tag: `expired-realtime-${rentaId}`,
            requireInteraction: true
          })
          
          // Limpiar el cache después de 1 hora para permitir nuevas notificaciones
          setTimeout(() => {
            lastCheckedRef.current.delete(rentaId)
          }, 60 * 60 * 1000)
        }
      }
    }

    // Si se inicia una nueva renta
    if (eventType === 'UPDATE' && newRecord && oldRecord) {
      if (!oldRecord.activa && newRecord.activa) {
        showNotification({
          title: '🚀 Nueva Renta Iniciada',
          body: `${newRecord.nombre_herramienta} está ahora en uso`,
          tag: `started-${newRecord.id}`,
          requireInteraction: false
        })
      }
    }

  }, [showNotification])

  // Suscribirse a cambios en tiempo real
  const subscribe = useCallback(() => {
    if (channelRef.current || !notificationsEnabled) return

    console.log('🔌 Conectando a Supabase Realtime...')

    try {
      channelRef.current = supabase
        .channel('rentas-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rentas_herramientas'
          },
          (payload) => {
            console.log('📡 Cambio detectado:', payload)
            
            // Verificar cambios importantes
            checkForImportantChanges(payload)
            
            // Notificar al componente padre si hay callback
            if (onRentasUpdate) {
              // Aquí podrías recargar los datos si es necesario
              // Por ahora solo notificamos del cambio
              console.log('🔄 Notificando cambio al componente padre')
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Estado de conexión Realtime:', status)
          isConnectedRef.current = status === 'SUBSCRIBED'
          
          if (status === 'SUBSCRIBED') {
            showNotification({
              title: '🔗 Conectado',
              body: 'Monitoreo de rentas en tiempo real activado',
              tag: 'realtime-connected',
              requireInteraction: false
            })
          }
        })

    } catch (error) {
      console.error('❌ Error conectando Realtime:', error)
    }
  }, [supabase, notificationsEnabled, checkForImportantChanges, onRentasUpdate, showNotification])

  // Desuscribirse
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      console.log('🔌 Desconectando de Supabase Realtime...')
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      isConnectedRef.current = false
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [supabase])

  // Auto-conexión cuando las notificaciones están habilitadas
  useEffect(() => {
    if (notificationsEnabled && rentas.length > 0) {
      subscribe()
      
      // Verificación periódica adicional
      if (autoCheckExpired && checkInterval > 0) {
        intervalRef.current = setInterval(() => {
          forceCheck()
        }, checkInterval * 60 * 1000) // convertir minutos a ms
      }
    } else {
      unsubscribe()
    }

    return () => {
      unsubscribe()
    }
  }, [notificationsEnabled, subscribe, unsubscribe, autoCheckExpired, checkInterval, forceCheck, rentas.length])

  // Verificación inicial
  useEffect(() => {
    if (notificationsEnabled && rentas.length > 0) {
      // Esperar un poco antes de la verificación inicial
      const timer = setTimeout(() => {
        forceCheck()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [notificationsEnabled, rentas, forceCheck])

  return {
    isConnected: isConnectedRef.current,
    subscribe,
    unsubscribe,
    forceCheck
  }
} 