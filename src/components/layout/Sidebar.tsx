'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useSidebar } from '@/contexts/SidebarContext'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Users, 
  Calendar, 
  Wrench, 
  Smartphone, 
  Bug, 
  LogOut,
  BarChart3,
  Clock,
  DollarSign,
  Code
} from 'lucide-react'

const adminMenuItems = [
  { name: 'Dashboard', href: '/dashboard/admin', icon: Home },
  { name: 'Trabajadores', href: '/dashboard/admin/trabajadores', icon: Users },
  { name: 'Pagos y Deudas', href: '/dashboard/admin/pagos', icon: DollarSign },
  { name: 'Días Trabajados', href: '/dashboard/admin/dias-trabajados', icon: Calendar },
  { name: 'Rentas', href: '/dashboard/admin/rentas', icon: Wrench },
  { name: 'IMEI Justificado', href: '/dashboard/admin/imei', icon: Smartphone },
  { name: 'Bugs Samsung', href: '/dashboard/admin/bugs', icon: Bug },
  { name: 'Script Añadir Web', href: '/dashboard/admin/script-web', icon: Code },
  { name: 'Reportes', href: '/dashboard/admin/reportes', icon: BarChart3 },
]

const trabajadorMenuItems = [
  { name: 'Mi Dashboard', href: '/dashboard/trabajador', icon: Home },
  { name: 'Mis Horarios', href: '/dashboard/trabajador/horarios', icon: Clock },
  { name: 'Mis Días', href: '/dashboard/trabajador/dias', icon: Calendar },
  { name: 'Mis Pagos', href: '/dashboard/trabajador/pagos', icon: DollarSign },
  { name: 'Rentas', href: '/dashboard/trabajador/rentas', icon: Wrench },
  { name: 'IMEI Justificado', href: '/dashboard/trabajador/imei', icon: Smartphone },
  { name: 'Bugs Samsung', href: '/dashboard/trabajador/bugs', icon: Bug },
  { name: 'Script Añadir Web', href: '/dashboard/trabajador/script-web', icon: Code },
  { name: 'Mis Ingresos', href: '/dashboard/trabajador/ingresos', icon: Clock },
]

export default function Sidebar() {
  const { userData, signOut } = useAuth()
  const { isCollapsed, isMobile, isOpen, toggleSidebar, closeSidebar } = useSidebar()
  const pathname = usePathname()

  // Configurar items del menú según el rol
  const menuItems = userData?.rol === 'creador' ? adminMenuItems : trabajadorMenuItems

  const handleSignOut = async () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      await signOut()
    }
  }

  // En móvil, cerrar sidebar cuando se hace click en un link
  const handleLinkClick = () => {
    if (isMobile) {
      closeSidebar()
    }
  }

  return (
    <>
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50
        flex flex-col bg-gray-900 text-white w-64
        transition-all duration-300 ease-in-out
        ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-center h-16 bg-gray-800 border-b border-gray-700">
          <h1 className="text-xl font-bold text-blue-400">LEOPE-STAFF</h1>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-medium">
              {userData?.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium truncate">{userData?.nombre}</p>
              <p className="text-xs text-gray-400 capitalize">{userData?.rol}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-4">
          <ul className="space-y-2 px-4">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard/admin' && item.href !== '/dashboard/trabajador' && pathname?.startsWith(item.href))
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={handleLinkClick}
                    className={`
                      flex items-center rounded-lg transition-colors space-x-3 px-3 py-2
                      ${isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium truncate">{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>



        {/* Logout */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleSignOut}
            className="flex items-center rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors space-x-3 px-3 py-2 w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  )
} 