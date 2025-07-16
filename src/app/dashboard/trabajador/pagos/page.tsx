'use client'

// Deshabilitar prerenderizado para esta página
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { 
  DollarSign, 
  Calendar, 
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Eye
} from 'lucide-react'

interface PagoCalculado {
  trabajador_id: string
  periodo: {
    inicio: string
    fin: string
  }
  sueldo_diario: number
  dias_trabajados_completos: number
  monto_total_a_pagar: number
  detalles_dias: Array<{
    fecha: string
    hora_entrada: string | null
    hora_salida: string | null
    total_horas: number
    es_dia_completo: boolean
    monto_dia: number
  }>
}

export default function PagosTrabajador() {
  const { usuario } = useAuth()
  const [pagoMesActual, setPagoMesActual] = useState<PagoCalculado | null>(null)
  const [pagoMesAnterior, setPagoMesAnterior] = useState<PagoCalculado | null>(null)
  const [loading, setLoading] = useState(true)
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(new Date().getMonth() + 1)
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(new Date().getFullYear())
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (usuario?.id) {
      loadPagos()
    }
  }, [usuario?.id, mesSeleccionado, anioSeleccionado])

  const loadPagos = async () => {
    if (!usuario?.id) return

    try {
      // Mes actual seleccionado
      const inicioMes = new Date(anioSeleccionado, mesSeleccionado - 1, 1).toISOString().split('T')[0]
      const finMes = new Date(anioSeleccionado, mesSeleccionado, 0).toISOString().split('T')[0]

      const { data: datosMesActual, error: errorMesActual } = await supabase.rpc('calcular_pago_trabajador', {
        trabajador_id: usuario.id,
        fecha_inicio: inicioMes,
        fecha_fin: finMes
      })

      if (errorMesActual) throw errorMesActual
      setPagoMesActual(datosMesActual)

      // Mes anterior para comparación
      const mesAnterior = mesSeleccionado === 1 ? 12 : mesSeleccionado - 1
      const anioAnterior = mesSeleccionado === 1 ? anioSeleccionado - 1 : anioSeleccionado
      const inicioMesAnterior = new Date(anioAnterior, mesAnterior - 1, 1).toISOString().split('T')[0]
      const finMesAnterior = new Date(anioAnterior, mesAnterior, 0).toISOString().split('T')[0]

      const { data: datosMesAnterior, error: errorMesAnterior } = await supabase.rpc('calcular_pago_trabajador', {
        trabajador_id: usuario.id,
        fecha_inicio: inicioMesAnterior,
        fecha_fin: finMesAnterior
      })

      if (!errorMesAnterior) {
        setPagoMesAnterior(datosMesAnterior)
      }

    } catch (error) {
      console.error('Error cargando pagos:', error)
    } finally {
      setLoading(false)
    }
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

  const getNombreMes = (mes: number, anio: number) => {
    return new Date(anio, mes - 1).toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
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
        <h1 className="text-2xl font-bold text-gray-900">
          Mis Pagos
        </h1>
        <p className="text-gray-600 mt-1">
          Revisa tus pagos calculados según días trabajados completos
        </p>

        {/* Selector de Mes */}
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

      {/* Resumen del Mes Seleccionado */}
      {pagoMesActual && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Resumen de {getNombreMes(mesSeleccionado, anioSeleccionado)}
          </h2>

          {/* Cards de Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Sueldo Diario</p>
                  <p className="text-xl font-semibold text-gray-900">S/. {pagoMesActual.sueldo_diario.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Días Completos</p>
                  <p className="text-xl font-semibold text-gray-900">{pagoMesActual.dias_trabajados_completos}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center">
                <XCircle className="w-8 h-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Días Perdidos</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {pagoMesActual.detalles_dias?.filter(d => !d.es_dia_completo).length || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total a Cobrar</p>
                  <p className="text-xl font-semibold text-gray-900">S/. {pagoMesActual.monto_total_a_pagar.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparación con mes anterior */}
          {pagoMesAnterior && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Comparación con mes anterior</h3>
              <div className="flex items-center space-x-6 text-sm">
                <div>
                  <span className="text-gray-600">Días completos: </span>
                  <span className={`font-medium ${
                    pagoMesActual.dias_trabajados_completos >= pagoMesAnterior.dias_trabajados_completos 
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {pagoMesActual.dias_trabajados_completos} vs {pagoMesAnterior.dias_trabajados_completos}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Total: </span>
                  <span className={`font-medium ${
                    pagoMesActual.monto_total_a_pagar >= pagoMesAnterior.monto_total_a_pagar 
                      ? 'text-green-600' : 'text-red-600'
                  }`}>
                    S/. {pagoMesActual.monto_total_a_pagar.toFixed(2)} vs S/. {pagoMesAnterior.monto_total_a_pagar.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Aviso importante */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-amber-800">Reglas de Pago</h4>
                <p className="text-sm text-amber-700 mt-1">
                  • Solo recibes pago por días donde marques TANTO entrada como salida<br/>
                  • Si olvidas marcar entrada o salida, pierdes el pago de ese día<br/>
                  • Los días incompletos no generan ningún pago
                </p>
              </div>
            </div>
          </div>

          {/* Detalle Diario */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3">Detalle Diario</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entrada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salida
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pagoMesActual.detalles_dias?.map((dia, index) => (
                    <tr key={index} className={`hover:bg-gray-50 ${
                      dia.es_dia_completo ? 'bg-green-25' : 'bg-red-25'
                    }`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDate(dia.fecha)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(dia.hora_entrada)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(dia.hora_salida)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dia.total_horas > 0 ? `${dia.total_horas.toFixed(2)}h` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={dia.monto_dia > 0 ? 'text-green-600' : 'text-red-600'}>
                          S/. {dia.monto_dia.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {dia.es_dia_completo ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Pagado
                          </span>
                        ) : dia.hora_entrada && !dia.hora_salida ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Sin salida
                          </span>
                        ) : !dia.hora_entrada && dia.hora_salida ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Sin entrada
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            Sin marcar
                          </span>
                        )}
                      </td>
                    </tr>
                  )) || []}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 