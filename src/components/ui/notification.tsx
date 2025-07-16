'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  persistent?: boolean
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000
    }

    setNotifications(prev => [...prev, newNotification])

    // Auto remove si no es persistente
    if (!notification.persistent && newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications debe ser usado dentro de NotificationProvider')
  }
  return context
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications()

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onRemove: () => void
}

function NotificationItem({ notification, onRemove }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger entrada animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleRemove = () => {
    setIsVisible(false)
    setTimeout(onRemove, 300) // Esperar a que termine la animación
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getBgColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'info':
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
        p-4 rounded-lg border shadow-lg ${getBgColor()}
        max-w-sm w-full
      `}
    >
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900">
            {notification.title}
          </h4>
          {notification.message && (
            <p className="mt-1 text-sm text-gray-600">
              {notification.message}
            </p>
          )}
        </div>
        {!notification.persistent && (
          <button
            onClick={handleRemove}
            className="flex-shrink-0 p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  )
}

// Helpers para uso rápido
export const useNotify = () => {
  const { addNotification } = useNotifications()

  return {
    success: (title: string, message?: string, options?: Partial<Notification>) =>
      addNotification({ type: 'success', title, message, ...options }),
    
    error: (title: string, message?: string, options?: Partial<Notification>) =>
      addNotification({ type: 'error', title, message, ...options }),
    
    warning: (title: string, message?: string, options?: Partial<Notification>) =>
      addNotification({ type: 'warning', title, message, ...options }),
    
    info: (title: string, message?: string, options?: Partial<Notification>) =>
      addNotification({ type: 'info', title, message, ...options }),
  }
} 