'use client'

// Deshabilitar prerenderizado para esta página
export const dynamic = 'force-dynamic'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { 
  Calendar, 
  DollarSign, 
  Clock,
  Wrench,
  Smartphone,
  Bug,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface TrabajadorStats {
  diasTrabajados: number
  montoPendiente: number
  montoPagado: number
  ingresosHoy: number
  rentasActivas: number
  imeisProcesados: number
  bugsSamsung: number
  gananciasBugs: number
}

export default function TrabajadorDashboard() {
  const { usuario } = useAuth()
  const [stats, setStats] = useState<TrabajadorStats>({
    diasTrabajados: 0,
    montoPendiente: 0,
    montoPagado: 0,
    ingresosHoy: 0,
    rentasActivas: 0,
    imeisProcesados: 0,
    bugsSamsung: 0,
    gananciasBugs: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (usuario?.id) {
      loadTrabajadorStats()
    }
  }, [usuario?.id])

  const loadTrabajadorStats = async () => {
    if (!usuario?.id) return

    try {
      const hoy = new Date().toISOString().split('T')[0]
      const inicioMes = new Date()
      inicioMes.setDate(1)

      // Días trabajados
      const { count: diasTrabajados } = await supabase
        .from('dias_trabajados')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', usuario.id)

      // Monto pendiente de pago
      const { data: montosPendientes } = await supabase
        .from('dias_trabajados')
        .select('monto_asignado')
        .eq('usuario_id', usuario.id)
        .eq('pagado', false)

      const montoPendiente = montosPendientes?.reduce(
        (sum, item) => sum + (item.monto_asignado || 0), 0
      ) || 0

      // Monto ya pagado
      const { data: montosPagados } = await supabase
        .from('dias_trabajados')
        .select('monto_asignado')
        .eq('usuario_id', usuario.id)
        .eq('pagado', true)

      const montoPagado = montosPagados?.reduce(
        (sum, item) => sum + (item.monto_asignado || 0), 0
      ) || 0

      // Ingresos de hoy
      const { count: ingresosHoy } = await supabase
        .from('ingresos')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', usuario.id)
        .gte('fecha_ingreso', hoy + 'T00:00:00')
        .lte('fecha_ingreso', hoy + 'T23:59:59')

      // Rentas activas (del usuario)
      const { count: rentasActivas } = await supabase
        .from('rentas_herramientas')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_responsable_id', usuario.id)
        .eq('activa', true)

      // IMEIs procesados este mes
      const { count: imeisProcesados } = await supabase
        .from('imei_justificado')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_procesado_id', usuario.id)
        .gte('created_at', inicioMes.toISOString())

      // Bugs Samsung este mes
      const { data: bugsData } = await supabase
        .from('bugs_samsung')
        .select('cantidad_bugs, total_ganado')
        .eq('usuario_id', usuario.id)
        .gte('fecha', inicioMes.toISOString().split('T')[0])

      const bugsSamsung = bugsData?.reduce(
        (sum, item) => sum + (item.cantidad_bugs || 0), 0
      ) || 0

      const gananciasBugs = bugsData?.reduce(
        (sum, item) => sum + (item.total_ganado || 0), 0
      ) || 0

      setStats({
        diasTrabajados: diasTrabajados || 0,
        montoPendiente,
        montoPagado,
        ingresosHoy: ingresosHoy || 0,
        rentasActivas: rentasActivas || 0,
        imeisProcesados: imeisProcesados || 0,
        bugsSamsung,
        gananciasBugs
      })
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    {
      title: 'Mi Sueldo Diario',
      value: `S/. ${usuario?.sueldo_base?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      description: usuario?.sueldo_base === 0 ? 'Sin asignar' : 'Por día completo'
    },
    {
      title: 'Días Trabajados',
      value: stats.diasTrabajados,
      icon: Calendar,
      color: 'bg-blue-500',
      description: 'Total registrados'
    },
    {
      title: 'Monto Pendiente',
      value: `$${stats.montoPendiente.toFixed(2)}`,
      icon: Clock,
      color: 'bg-yellow-500',
      description: 'Por cobrar'
    },
    {
      title: 'Monto Pagado',
      value: `$${stats.montoPagado.toFixed(2)}`,
      icon: CheckCircle,
      color: 'bg-green-500',
      description: 'Ya cobrado'
    },
    {
      title: 'Ingresos Hoy',
      value: stats.ingresosHoy,
      icon: Clock,
      color: 'bg-indigo-500',
      description: 'Veces que entraste'
    },
    {
      title: 'Rentas Activas',
      value: stats.rentasActivas,
      icon: Wrench,
      color: 'bg-purple-500',
      description: 'A tu cargo'
    },
    {
      title: 'IMEIs del Mes',
      value: stats.imeisProcesados,
      icon: Smartphone,
      color: 'bg-cyan-500',
      description: 'Procesados'
    },
    {
      title: 'Bugs Samsung',
      value: stats.bugsSamsung,
      icon: Bug,
      color: 'bg-red-500',
      description: `$${stats.gananciasBugs.toFixed(2)} ganados`
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
          Mi Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Hola, {usuario?.nombre}. Aquí tienes tu resumen de actividad.
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

      {/* Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado de Pagos */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estado de Pagos</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">Pendiente</span>
              </div>
              <span className="text-lg font-semibold text-yellow-600">
                ${stats.montoPendiente.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-sm font-medium text-gray-900">Pagado</span>
              </div>
              <span className="text-lg font-semibold text-green-600">
                ${stats.montoPagado.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Resumen del Mes */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen del Mes</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">IMEIs Procesados</span>
              <span className="font-medium">{stats.imeisProcesados}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bugs Samsung</span>
              <span className="font-medium">{stats.bugsSamsung}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ganancias por Bugs</span>
              <span className="font-medium text-green-600">
                ${stats.gananciasBugs.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rentas Activas</span>
              <span className="font-medium">{stats.rentasActivas}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Bug className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Registrar Bugs</p>
          </button>
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Smartphone className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Procesar IMEI</p>
          </button>
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Wrench className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Ver Rentas</p>
          </button>
          <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Ver Pagos</p>
          </button>
        </div>
      </div>
    </div>
  )
} 