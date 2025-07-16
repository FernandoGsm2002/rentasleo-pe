'use client'

// Deshabilitar prerenderizado para esta página
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Usuario, RentaHerramienta, ImeiJustificado } from '@/types/supabase'
import { 
  BarChart3, 
  Download, 
  Calendar,
  DollarSign,
  Clock,
  Smartphone,
  Settings,
  TrendingUp,
  Users,
  Filter
} from 'lucide-react'

interface ReporteUsuario {
  usuario: Usuario
  rentas: {
    total: number
    por_herramienta: { [key: string]: number }
    horas_totales: number
    tiempo_promedio: number
  }
  imeis: {
    total: number
    aptos: number
    no_aptos: number
    pendientes: number
    ingresos_total: number
  }
}

interface EstadisticasGenerales {
  total_usuarios: number
  total_rentas: number
  total_imeis: number
  ingresos_totales: number
  horas_rentadas: number
}

export default function ReportesAdmin() {
  const [reportes, setReportes] = useState<ReporteUsuario[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales>({
    total_usuarios: 0,
    total_rentas: 0,
    total_imeis: 0,
    ingresos_totales: 0,
    horas_rentadas: 0
  })
  const [loading, setLoading] = useState(true)
  const [fechaInicio, setFechaInicio] = useState(() => {
    const fecha = new Date()
    fecha.setMonth(fecha.getMonth() - 1)
    return fecha.toISOString().split('T')[0]
  })
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    loadReportes()
  }, [fechaInicio, fechaFin])

  const loadReportes = async () => {
    try {
      setLoading(true)

      // Cargar usuarios
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('rol', 'trabajador')
        .eq('activo', true)
        .order('nombre')

      if (usuariosError) throw usuariosError

      // Cargar rentas en el período
      const { data: rentas, error: rentasError } = await supabase
        .from('rentas_herramientas')
        .select('*')
        .gte('created_at', fechaInicio + 'T00:00:00')
        .lte('created_at', fechaFin + 'T23:59:59')

      if (rentasError) throw rentasError

      // Cargar IMEIs en el período
      const { data: imeis, error: imeisError } = await supabase
        .from('imei_justificado')
        .select('*')
        .gte('created_at', fechaInicio + 'T00:00:00')
        .lte('created_at', fechaFin + 'T23:59:59')

      if (imeisError) throw imeisError

      // Procesar reportes por usuario
      const reportesUsuarios: ReporteUsuario[] = usuarios?.map(usuario => {
        // Filtrar rentas del usuario
        const rentasUsuario = rentas?.filter(r => r.usuario_responsable_id === usuario.id) || []
        
        // Procesar estadísticas de rentas
        const rentasPorHerramienta: { [key: string]: number } = {}
        let horasTotales = 0
        
        rentasUsuario.forEach(renta => {
          rentasPorHerramienta[renta.tipo_herramienta] = (rentasPorHerramienta[renta.tipo_herramienta] || 0) + 1
          horasTotales += renta.duracion_horas || 0
        })

        // Filtrar IMEIs del usuario
        const imeisUsuario = imeis?.filter(i => i.usuario_procesado_id === usuario.id) || []
        
        // Procesar estadísticas de IMEIs
        const imeisAptos = imeisUsuario.filter(i => i.estado_osiptel === 'apto').length
        const imeisNoAptos = imeisUsuario.filter(i => i.estado_osiptel === 'no_apto').length
        const imeisPendientes = imeisUsuario.filter(i => i.estado_osiptel === 'pendiente').length
        const ingresosTotales = imeisUsuario.reduce((sum, imei) => sum + (imei.monto_cobrado || 0), 0)

        return {
          usuario,
          rentas: {
            total: rentasUsuario.length,
            por_herramienta: rentasPorHerramienta,
            horas_totales: horasTotales,
            tiempo_promedio: rentasUsuario.length > 0 ? horasTotales / rentasUsuario.length : 0
          },
          imeis: {
            total: imeisUsuario.length,
            aptos: imeisAptos,
            no_aptos: imeisNoAptos,
            pendientes: imeisPendientes,
            ingresos_total: ingresosTotales
          }
        }
      }) || []

      // Calcular estadísticas generales
      const statsGenerales: EstadisticasGenerales = {
        total_usuarios: usuarios?.length || 0,
        total_rentas: rentas?.length || 0,
        total_imeis: imeis?.length || 0,
        ingresos_totales: imeis?.reduce((sum, imei) => sum + (imei.monto_cobrado || 0), 0) || 0,
        horas_rentadas: rentas?.reduce((sum, renta) => sum + (renta.duracion_horas || 0), 0) || 0
      }

      setReportes(reportesUsuarios)
      setEstadisticas(statsGenerales)
    } catch (error) {
      console.error('Error cargando reportes:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportarReportes = () => {
    const data = {
      periodo: { desde: fechaInicio, hasta: fechaFin },
      estadisticas_generales: estadisticas,
      reportes_por_usuario: reportes.map(r => ({
        usuario: r.usuario.nombre,
        email: r.usuario.email,
        rentas: r.rentas,
        imeis: r.imeis
      }))
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reportes_${fechaInicio}_${fechaFin}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const reportesFiltrados = reportes.filter(reporte => 
    filtroUsuario === '' || 
    reporte.usuario.nombre.toLowerCase().includes(filtroUsuario.toLowerCase()) ||
    reporte.usuario.email.toLowerCase().includes(filtroUsuario.toLowerCase())
  )

  const getHerramientaIcon = (tipo: string) => {
    switch (tipo) {
      case 'unlocktool': return '🔓'
      case 'dft': return '🔧'
      case 'pandora': return '📦'
      case 'tsm': return '⚡'
      default: return '🛠️'
    }
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📊 Reportes y Estadísticas</h1>
          <p className="text-gray-600">Análisis detallado de rendimiento por usuario</p>
        </div>
        <button
          onClick={exportarReportes}
          className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors text-sm sm:text-base"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Reportes</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filtros de Reporte
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Fin
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar Usuario
            </label>
            <input
              type="text"
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              placeholder="Nombre o email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Usuarios Activos', value: estadisticas.total_usuarios, icon: Users, color: 'bg-blue-500' },
          { label: 'Total Rentas', value: estadisticas.total_rentas, icon: Settings, color: 'bg-green-500' },
          { label: 'Horas Rentadas', value: `${estadisticas.horas_rentadas}h`, icon: Clock, color: 'bg-purple-500' },
          { label: 'IMEIs Procesados', value: estadisticas.total_imeis, icon: Smartphone, color: 'bg-orange-500' },
          { label: 'Ingresos Totales', value: `$${estadisticas.ingresos_totales.toFixed(2)}`, icon: DollarSign, color: 'bg-emerald-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className={`${stat.color} w-3 h-3 rounded-full mr-3`}></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">{stat.label}</p>
                <p className="text-lg sm:text-xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reportes por Usuario */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Rendimiento por Usuario ({reportesFiltrados.length})
          </h3>
        </div>

        {/* Vista Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rentas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Por Herramienta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horas Totales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IMEIs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ingresos IMEI
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportesFiltrados.map((reporte) => (
                <tr key={reporte.usuario.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {reporte.usuario.nombre}
                      </div>
                      <div className="text-sm text-gray-500">
                        {reporte.usuario.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="font-medium">{reporte.rentas.total} rentas</div>
                      <div className="text-gray-500">
                        Promedio: {reporte.rentas.tiempo_promedio.toFixed(1)}h
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {Object.entries(reporte.rentas.por_herramienta).map(([herramienta, cantidad]) => (
                        <div key={herramienta} className="flex items-center text-sm">
                          <span className="mr-2">{getHerramientaIcon(herramienta)}</span>
                          <span className="text-gray-900">{herramienta.toUpperCase()}: {cantidad}</span>
                        </div>
                      ))}
                      {Object.keys(reporte.rentas.por_herramienta).length === 0 && (
                        <span className="text-gray-500 text-sm">Sin rentas</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {reporte.rentas.horas_totales}h
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-900">
                        Total: {reporte.imeis.total}
                      </div>
                      <div className="flex space-x-3 text-xs">
                        <span className="text-green-600">✓ {reporte.imeis.aptos}</span>
                        <span className="text-red-600">✗ {reporte.imeis.no_aptos}</span>
                        <span className="text-yellow-600">⏳ {reporte.imeis.pendientes}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-green-600">
                      ${reporte.imeis.ingresos_total.toFixed(2)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Vista Mobile */}
        <div className="lg:hidden">
          {reportesFiltrados.map((reporte) => (
            <div key={reporte.usuario.id} className="p-4 border-b border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{reporte.usuario.nombre}</h4>
                  <p className="text-sm text-gray-500">{reporte.usuario.email}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">
                    ${reporte.imeis.ingresos_total.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">Ingresos IMEI</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Rentas:</span>
                    <span className="ml-1 text-gray-900">{reporte.rentas.total}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Horas:</span>
                    <span className="ml-1 text-gray-900">{reporte.rentas.horas_totales}h</span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(reporte.rentas.por_herramienta).map(([herramienta, cantidad]) => (
                      <div key={herramienta} className="flex items-center text-xs">
                        <span className="mr-1">{getHerramientaIcon(herramienta)}</span>
                        <span className="text-gray-600">{herramienta.toUpperCase()}: {cantidad}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">IMEIs:</span>
                    <span className="ml-1 text-gray-900">{reporte.imeis.total}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                      ✓ {reporte.imeis.aptos} Aptos
                    </span>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                      ✗ {reporte.imeis.no_aptos} No Aptos
                    </span>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      ⏳ {reporte.imeis.pendientes} Pendientes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {reportesFiltrados.length === 0 && (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay datos para el período seleccionado</p>
          </div>
        )}
      </div>
    </div>
  )
} 