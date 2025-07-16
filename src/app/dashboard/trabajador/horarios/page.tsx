'use client'

// Deshabilitar prerenderizado para esta página
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { EstadoMarcadoHoy, MarcadoResponse, ResumenHorariosMes, MarcadoHorarios } from '@/types/supabase'
import { 
  Clock, 
  Calendar, 
  LogIn, 
  LogOut, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Timer,
  Users,
  ClockIcon
} from 'lucide-react'

export default function HorariosTrabajador() {
  const { userData } = useAuth()
  const [estadoHoy, setEstadoHoy] = useState<EstadoMarcadoHoy | null>(null)
  const [resumenMes, setResumenMes] = useState<ResumenHorariosMes | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (userData?.id) {
      loadDashboardData()
    }
  }, [userData?.id])

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        loadEstadoHoy(),
        loadResumenMes()
      ])
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadEstadoHoy = async () => {
    if (!userData?.id) return

    try {
      const { data, error } = await supabase.rpc('get_marcado_hoy', {
        trabajador_id: userData.id
      })

      if (error) throw error
      setEstadoHoy(data)
    } catch (error) {
      console.error('Error cargando estado de hoy:', error)
    }
  }

  const loadResumenMes = async () => {
    if (!userData?.id) return

    try {
      const { data, error } = await supabase.rpc('get_resumen_horarios_mes', {
        trabajador_id: userData.id
      })

      if (error) throw error
      setResumenMes(data)
    } catch (error) {
      console.error('Error cargando resumen del mes:', error)
    }
  }

  const marcarEntrada = async () => {
    if (!userData?.id || actionLoading) return

    setActionLoading(true)
    try {
      const { data, error } = await supabase.rpc('marcar_entrada', {
        trabajador_id: userData.id
      })

      if (error) throw error

      const resultado: MarcadoResponse = data
      if (resultado.success) {
        alert(`✅ ${resultado.message}`)
        await loadEstadoHoy()
        await loadResumenMes()
      } else {
        alert(`❌ ${resultado.message}`)
      }
    } catch (error) {
      console.error('Error marcando entrada:', error)
      alert('❌ Error al marcar entrada')
    } finally {
      setActionLoading(false)
    }
  }

  const marcarSalida = async () => {
    if (!userData?.id || actionLoading) return

    setActionLoading(true)
    try {
      const { data, error } = await supabase.rpc('marcar_salida', {
        trabajador_id: userData.id
      })

      if (error) throw error

      const resultado: MarcadoResponse = data
      if (resultado.success) {
        alert(`✅ ${resultado.message}`)
        await loadEstadoHoy()
        await loadResumenMes()
      } else {
        alert(`❌ ${resultado.message}`)
      }
    } catch (error) {
      console.error('Error marcando salida:', error)
      alert('❌ Error al marcar salida')
    } finally {
      setActionLoading(false)
    }
  }

  const formatTime = (datetime: string | null) => {
    if (!datetime) return 'No marcado'
    return new Date(datetime).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
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
          Control de Horarios
        </h1>
        <p className="text-gray-600 mt-1">
          Marca tu entrada y salida diaria. Hoy es {new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
          <p className="text-sm text-amber-800">
            <strong>⚠️ Importante:</strong> Solo recibes pago (S/. {userData?.sueldo_base?.toFixed(2) || '0.00'}) por los días que marques TANTO entrada como salida. 
            Si olvidas marcar cualquiera de los dos, pierdes el pago de ese día.
          </p>
        </div>
      </div>

      {/* Marcado de Hoy */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Marcado de Hoy
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Estado Actual */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Estado Actual</h3>
            {estadoHoy?.exists && estadoHoy.marcado ? (
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <LogIn className="w-4 h-4 mr-2 text-green-600" />
                  <span>Entrada: {formatTime(estadoHoy.marcado.hora_entrada)}</span>
                </div>
                <div className="flex items-center text-sm">
                  <LogOut className="w-4 h-4 mr-2 text-red-600" />
                  <span>Salida: {formatTime(estadoHoy.marcado.hora_salida)}</span>
                </div>
                {estadoHoy.marcado.hora_entrada && estadoHoy.marcado.hora_salida && (
                  <div className="flex items-center text-sm font-medium text-blue-600">
                    <Timer className="w-4 h-4 mr-2" />
                    <span>Total: {estadoHoy.marcado.total_horas.toFixed(2)} horas</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No has marcado hoy</p>
            )}
          </div>

          {/* Botón de Entrada */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Marcar Entrada</h3>
            <button
              onClick={marcarEntrada}
              disabled={actionLoading || !estadoHoy?.puede_marcar_entrada}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                estadoHoy?.puede_marcar_entrada && !actionLoading
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {actionLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Marcando...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <LogIn className="w-5 h-5 mr-2" />
                  Marcar Entrada
                </div>
              )}
            </button>
            {!estadoHoy?.puede_marcar_entrada && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Ya marcaste entrada hoy
              </p>
            )}
          </div>

          {/* Botón de Salida */}
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Marcar Salida</h3>
            <button
              onClick={marcarSalida}
              disabled={actionLoading || !estadoHoy?.puede_marcar_salida}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                estadoHoy?.puede_marcar_salida && !actionLoading
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {actionLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Marcando...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <LogOut className="w-5 h-5 mr-2" />
                  Marcar Salida
                </div>
              )}
            </button>
            {!estadoHoy?.puede_marcar_salida && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                {estadoHoy?.exists ? 'Ya marcaste salida' : 'Primero marca entrada'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Resumen del Mes */}
      {resumenMes && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Resumen del Mes - {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </h2>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <Calendar className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Días Trabajados</p>
                  <p className="text-xl font-semibold text-gray-900">{resumenMes.total_dias_trabajados}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Horas</p>
                  <p className="text-xl font-semibold text-gray-900">{resumenMes.total_horas.toFixed(1)}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Promedio/Día</p>
                  <p className="text-xl font-semibold text-gray-900">{resumenMes.promedio_horas_dia.toFixed(1)}h</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Sin Salida</p>
                  <p className="text-xl font-semibold text-gray-900">{resumenMes.dias_sin_salida}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Historial Detallado */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3">Historial Detallado</h3>
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
                      Total Horas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {resumenMes.detalles?.map((dia, index) => (
                    <tr key={index} className="hover:bg-gray-50">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {dia.completo ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completo
                          </span>
                        ) : dia.hora_entrada ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            Sin salida
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            Sin marcar
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
      )}
    </div>
  )
} 