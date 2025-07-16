'use client'

// Deshabilitar prerenderizado para esta página
export const dynamic = 'force-dynamic'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Clock,
  Wrench,
  Smartphone,
  Bug
} from 'lucide-react'

interface DashboardStats {
  totalTrabajadores: number
  trabajadoresActivos: number
  ingresosHoy: number
  montoTotalPendiente: number
  rentasActivas: number
  imeisProcesados: number
  bugsSamsung: number
}

export default function AdminDashboard() {
  const { usuario } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalTrabajadores: 0,
    trabajadoresActivos: 0,
    ingresosHoy: 0,
    montoTotalPendiente: 0,
    rentasActivas: 0,
    imeisProcesados: 0,
    bugsSamsung: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      const hoy = new Date().toISOString().split('T')[0]

      // Total trabajadores
      const { count: totalTrabajadores } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'trabajador')

      // Trabajadores activos
      const { count: trabajadoresActivos } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'trabajador')
        .eq('activo', true)

      // Ingresos de hoy
      const { count: ingresosHoy } = await supabase
        .from('ingresos')
        .select('*', { count: 'exact', head: true })
        .gte('fecha_ingreso', hoy + 'T00:00:00')
        .lte('fecha_ingreso', hoy + 'T23:59:59')

      // Monto total pendiente de pago
      const { data: montosPendientes } = await supabase
        .from('dias_trabajados')
        .select('monto_asignado')
        .eq('pagado', false)

      const montoTotalPendiente = montosPendientes?.reduce(
        (sum, item) => sum + (item.monto_asignado || 0), 0
      ) || 0

      // Rentas activas
      const { count: rentasActivas } = await supabase
        .from('rentas_herramientas')
        .select('*', { count: 'exact', head: true })
        .eq('activa', true)

      // IMEIs procesados este mes
      const inicioMes = new Date()
      inicioMes.setDate(1)
      const { count: imeisProcesados } = await supabase
        .from('imei_justificado')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', inicioMes.toISOString())

      // Bugs Samsung este mes
      const { data: bugsData } = await supabase
        .from('bugs_samsung')
        .select('cantidad_bugs')
        .gte('fecha', inicioMes.toISOString().split('T')[0])

      const bugsSamsung = bugsData?.reduce(
        (sum, item) => sum + (item.cantidad_bugs || 0), 0
      ) || 0

      setStats({
        totalTrabajadores: totalTrabajadores || 0,
        trabajadoresActivos: trabajadoresActivos || 0,
        ingresosHoy: ingresosHoy || 0,
        montoTotalPendiente,
        rentasActivas: rentasActivas || 0,
        imeisProcesados: imeisProcesados || 0,
        bugsSamsung
      })
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    {
      title: 'Total Trabajadores',
      value: stats.totalTrabajadores,
      icon: Users,
      color: 'bg-blue-500',
      description: `${stats.trabajadoresActivos} activos`
    },
    {
      title: 'Ingresos Hoy',
      value: stats.ingresosHoy,
      icon: Clock,
      color: 'bg-green-500',
      description: 'Logins registrados'
    },
    {
      title: 'Monto Pendiente',
      value: `$${stats.montoTotalPendiente.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
      description: 'Por pagar'
    },
    {
      title: 'Rentas Activas',
      value: stats.rentasActivas,
      icon: Wrench,
      color: 'bg-purple-500',
      description: 'Herramientas alquiladas'
    },
    {
      title: 'IMEIs del Mes',
      value: stats.imeisProcesados,
      icon: Smartphone,
      color: 'bg-indigo-500',
      description: 'Procesados'
    },
    {
      title: 'Bugs Samsung',
      value: stats.bugsSamsung,
      icon: Bug,
      color: 'bg-red-500',
      description: 'Este mes'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Dashboard Administrador
        </h1>
        <p className="text-gray-600 mt-1">
          Bienvenido, {usuario?.nombre}. Aquí tienes un resumen del sistema.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500">{card.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Gestionar Trabajadores</p>
          </button>
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Asignar Pagos</p>
          </button>
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Wrench className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Nueva Renta</p>
          </button>
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Ver Reportes</p>
          </button>
        </div>
      </div>
    </div>
  )
} 