'use client'

// Deshabilitar prerenderizado para esta página
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Usuario } from '@/types/supabase'
import { 
  DollarSign, 
  Calendar, 
  Users,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Download,
  Eye,
  CreditCard
} from 'lucide-react'

interface ResumenPagos {
  periodo: {
    inicio: string
    fin: string
  }
  resumen_general: {
    total_trabajadores: number
    total_dias_completos: number
    monto_total_periodo: number
  }
  detalle_por_trabajador: Array<{
    trabajador: {
      id: string
      nombre: string
      email: string
      sueldo_diario: number
    }
    dias_completos: number
    dias_incompletos: number
    monto_a_pagar: number
  }>
}

export default function PagosAdmin() {
  const [resumenPagos, setResumenPagos] = useState<ResumenPagos | null>(null)
  const [loading, setLoading] = useState(true)
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(new Date().getMonth() + 1)
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(new Date().getFullYear())
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState<string | null>(null)
  const [detallesTrabajador, setDetallesTrabajador] = useState<any>(null)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    loadResumenPagos()
  }, [mesSeleccionado, anioSeleccionado])

  const loadResumenPagos = async () => {
    try {
      const inicioMes = new Date(anioSeleccionado, mesSeleccionado - 1, 1).toISOString().split('T')[0]
      const finMes = new Date(anioSeleccionado, mesSeleccionado, 0).toISOString().split('T')[0]

      const { data, error } = await supabase.rpc('get_resumen_pagos_todos_trabajadores', {
        fecha_inicio: inicioMes,
        fecha_fin: finMes
      })

      if (error) throw error
      setResumenPagos(data)
    } catch (error) {
      console.error('Error cargando resumen de pagos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDetallesTrabajador = async (trabajadorId: string) => {
    try {
      const inicioMes = new Date(anioSeleccionado, mesSeleccionado - 1, 1).toISOString().split('T')[0]
      const finMes = new Date(anioSeleccionado, mesSeleccionado, 0).toISOString().split('T')[0]

      const { data, error } = await supabase.rpc('calcular_pago_trabajador', {
        trabajador_id: trabajadorId,
        fecha_inicio: inicioMes,
        fecha_fin: finMes
      })

      if (error) throw error
      setDetallesTrabajador(data)
      setTrabajadorSeleccionado(trabajadorId)
    } catch (error) {
      console.error('Error cargando detalles del trabajador:', error)
    }
  }

  const exportarResumen = () => {
    if (!resumenPagos) return
    
    const dataToExport = {
      periodo: `${getNombreMes(mesSeleccionado, anioSeleccionado)}`,
      resumen: resumenPagos.resumen_general,
      trabajadores: resumenPagos.detalle_por_trabajador
    }
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pagos_${anioSeleccionado}_${mesSeleccionado.toString().padStart(2, '0')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getNombreMes = (mes: number, anio: number) => {
    return new Date(anio, mes - 1).toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    })
  }

  const formatTime = (datetime: string | null) => {
    if (!datetime) return 'No marcado'
    return new Date(datetime).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Pagos
            </h1>
            <p className="text-gray-600 mt-1">
              Control de deudas y pagos a trabajadores
            </p>
          </div>
          <button
            onClick={exportarResumen}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>

        {/* Selector de Período */}
        <div className="flex items-center space-x-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Mes</label>
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(Number(e.target.value))}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleDateString('es-ES', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Año</label>
            <select
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resumen General */}
      {resumenPagos && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Resumen General - {getNombreMes(mesSeleccionado, anioSeleccionado)}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Trabajadores Activos</p>
                  <p className="text-xl font-semibold text-gray-900">{resumenPagos.resumen_general.total_trabajadores}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Días Completos Total</p>
                  <p className="text-xl font-semibold text-gray-900">{resumenPagos.resumen_general.total_dias_completos}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total a Pagar</p>
                  <p className="text-xl font-semibold text-gray-900">S/. {resumenPagos.resumen_general.monto_total_periodo.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerta si hay deudas altas */}
          {resumenPagos.resumen_general.monto_total_periodo > 1000 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-2" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800">Deuda Alta</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    El monto total a pagar este mes es alto. Considera revisar los pagos pendientes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabla de Trabajadores */}
      {resumenPagos && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Deudas por Trabajador
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trabajador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sueldo Diario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Días Completos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Días Perdidos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto a Pagar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resumenPagos.detalle_por_trabajador?.map((trabajador, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {trabajador.trabajador.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {trabajador.trabajador.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {trabajador.trabajador.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      S/. {trabajador.trabajador.sueldo_diario.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {trabajador.dias_completos} días
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        {trabajador.dias_incompletos} días
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        S/. {trabajador.monto_a_pagar.toFixed(2)}
                      </div>
                      {trabajador.monto_a_pagar > 0 && (
                        <div className="text-xs text-gray-500">
                          Pendiente de pago
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => loadDetallesTrabajador(trabajador.trabajador.id)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Trabajador */}
      {trabajadorSeleccionado && detallesTrabajador && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalle de Pagos - {resumenPagos?.detalle_por_trabajador.find(t => t.trabajador.id === trabajadorSeleccionado)?.trabajador.nombre}
                </h3>
                <button
                  onClick={() => {
                    setTrabajadorSeleccionado(null)
                    setDetallesTrabajador(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Resumen del Trabajador */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Sueldo Diario</p>
                  <p className="text-lg font-semibold text-gray-900">S/. {detallesTrabajador.sueldo_diario.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Días Completos</p>
                  <p className="text-lg font-semibold text-gray-900">{detallesTrabajador.dias_trabajados_completos}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Total a Pagar</p>
                  <p className="text-lg font-semibold text-gray-900">S/. {detallesTrabajador.monto_total_a_pagar.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Eficiencia</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {detallesTrabajador.detalles_dias ? 
                      ((detallesTrabajador.dias_trabajados_completos / detallesTrabajador.detalles_dias.length) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              {/* Detalle Diario */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrada</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salida</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pago</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {detallesTrabajador.detalles_dias?.map((dia: any, index: number) => (
                      <tr key={index} className={`text-sm ${dia.es_dia_completo ? 'bg-green-25' : 'bg-red-25'}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">{formatDate(dia.fecha)}</td>
                        <td className="px-4 py-3 text-gray-500">{formatTime(dia.hora_entrada)}</td>
                        <td className="px-4 py-3 text-gray-500">{formatTime(dia.hora_salida)}</td>
                        <td className="px-4 py-3 text-gray-500">{dia.total_horas > 0 ? `${dia.total_horas.toFixed(2)}h` : '-'}</td>
                        <td className="px-4 py-3 font-medium">
                          <span className={dia.monto_dia > 0 ? 'text-green-600' : 'text-red-600'}>
                            S/. {dia.monto_dia.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {dia.es_dia_completo ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Pagado
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              No pagado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 