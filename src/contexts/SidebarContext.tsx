'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface SidebarContextType {
  isCollapsed: boolean
  isMobile: boolean
  isOpen: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
  openSidebar: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(true)

  // Detectar tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // En móvil, iniciar cerrado y no usar collapse
      if (mobile) {
        setIsOpen(false)
        setIsCollapsed(false)
      } else {
        // En desktop, siempre visible y no colapsado
        setIsOpen(true)
        setIsCollapsed(false)
      }
    }

    // Check inicial
    checkScreenSize()

    // Listener para resize
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const toggleSidebar = () => {
    // Solo permitir toggle en móvil
    if (isMobile) {
      setIsOpen(!isOpen)
    }
  }

  const closeSidebar = () => {
    // Solo permitir cerrar en móvil
    if (isMobile) {
      setIsOpen(false)
    }
  }

  const openSidebar = () => {
    // Solo permitir abrir en móvil
    if (isMobile) {
      setIsOpen(true)
    }
  }

  return (
    <SidebarContext.Provider value={{
      isCollapsed,
      isMobile,
      isOpen,
      toggleSidebar,
      closeSidebar,
      openSidebar
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
} 