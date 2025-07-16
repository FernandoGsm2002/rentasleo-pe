'use client'

// Deshabilitar prerenderizado para esta página
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { BugSamsung, Usuario } from '@/types/supabase'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  Bug
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'

const bugSchema = z.object({
  usuario_id: z.string().min(1, 'Usuario requerido'),
  fecha: z.string().min(1, 'Fecha requerida'),
  cantidad_bugs: z.number().min(0, 'Cantidad debe ser mayor o igual a 0'),
  precio_por_bug: z.number().min(0, 'Precio debe ser mayor o igual a 0'),
  descripcion: z.string().optional(),
})

type BugFormData = z.infer<typeof bugSchema>

interface BugConUsuario extends BugSamsung {
  usuario: Usuario
}

export default function BugsAdmin() {
  const [bugs, setBugs] = useState<BugConUsuario[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBug, setEditingBug] = useState<BugSamsung | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const supabase = createSupabaseBrowserClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<BugFormData>({
    resolver: zodResolver(bugSchema),
    defaultValues: {
      fecha: format(new Date(), 'yyyy-MM-dd'),
      precio_por_bug: 50.00
    }
  })

  const watchCantidad = watch('cantidad_bugs')
  const watchPrecio = watch('precio_por_bug')

  useEffect(() => {
    loadBugs()
    loadUsuarios()
  }, [selectedMonth])

  const loadBugs = async () => {
    try {
      const startDate = `${selectedMonth}-01`
      const endDate = `${selectedMonth}-31`

      const { data, error } = await supabase
        .from('bugs_samsung')
        .select(`
          *,
          usuario:usuarios(*)
        `)
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false })

      if (error) throw error
      setBugs(data || [])
    } catch (error) {
      console.error('Error cargando bugs:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('rol', 'trabajador')
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      setUsuarios(data || [])
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    }
  }

  const onSubmit = async (data: BugFormData) => {
    try {
      if (editingBug) {
        const { error } = await supabase
          .from('bugs_samsung')
          .update(data)
          .eq('id', editingBug.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('bugs_samsung')
          .insert(data)

        if (error) throw error
      }

      setShowModal(false)
      setEditingBug(null)
      reset({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        precio_por_bug: 50.00
      })
      loadBugs()
    } catch (error) {
      console.error('Error guardando bug:', error)
    }
  }

  const handleEdit = (bug: BugSamsung) => {
    setEditingBug(bug)
    setValue('usuario_id', bug.usuario_id)
    setValue('fecha', bug.fecha)
    setValue('cantidad_bugs', bug.cantidad_bugs)
    setValue('precio_por_bug', bug.precio_por_bug)
    setValue('descripcion', bug.descripcion || '')
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return

    try {
      const { error } = await supabase
        .from('bugs_samsung')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadBugs()
    } catch (error) {
      console.error('Error eliminando bug:', error)
    }
  }

  const filteredBugs = bugs.filter(bug =>
    bug.usuario?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bug.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Estadísticas del mes
  const totalBugs = bugs.reduce((sum, bug) => sum + bug.cantidad_bugs, 0)
  const totalGanancias = bugs.reduce((sum, bug) => sum + bug.total_ganado, 0)
  const trabajadoresActivos = new Set(bugs.map(bug => bug.usuario_id)).size
  const promedioPorDia = bugs.length > 0 ? totalBugs / bugs.length : 0

  // Datos por usuario
  const bugsPorUsuario = bugs.reduce((acc, bug) => {
    const userId = bug.usuario_id
    if (!acc[userId]) {
      acc[userId] = {
        usuario: bug.usuario,
        totalBugs: 0,
        totalGanancias: 0,
        dias: 0
      }
    }
    acc[userId].totalBugs += bug.cantidad_bugs
    acc[userId].totalGanancias += bug.total_ganado
    acc[userId].dias += 1
    return acc
  }, {} as Record<string, any>)

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bugs Samsung</h1>
          <p className="text-gray-600">Control de bugs procesados y ganancias</p>
        </div>
        <button
          onClick={() => {
            setEditingBug(null)
            reset({
              fecha: format(new Date(), 'yyyy-MM-dd'),
              precio_por_bug: 50.00
            })
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Bugs</span>
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mes a mostrar
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por usuario o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Bugs', 
            value: totalBugs, 
            icon: Bug, 
            color: 'bg-red-500',
            description: `${filteredBugs.length} registros`
          },
          { 
            label: 'Total Ganancias', 
            value: `$${totalGanancias.toFixed(2)}`, 
            icon: DollarSign, 
            color: 'bg-green-500',
            description: 'Este mes'
          },
          { 
            label: 'Trabajadores', 
            value: trabajadoresActivos, 
            icon: Calendar, 
            color: 'bg-blue-500',
            description: 'Activos en bugs'
          },
          { 
            label: 'Promedio/Día', 
            value: promedioPorDia.toFixed(1), 
            icon: TrendingUp, 
            color: 'bg-purple-500',
            description: 'Bugs por día'
          }
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Ranking por Usuario */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Ranking por Usuario</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Bugs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Ganancias
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Días Trabajados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Promedio/Día
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.values(bugsPorUsuario)
                .sort((a: any, b: any) => b.totalBugs - a.totalBugs)
                .map((userStats: any, index) => (
                <tr key={userStats.usuario.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-white">
                          {index + 1}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {userStats.usuario.nombre}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userStats.totalBugs}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${userStats.totalGanancias.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {userStats.dias}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(userStats.totalBugs / userStats.dias).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registros Detallados */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Registros Detallados ({filteredBugs.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio/Bug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBugs.map((bug) => (
                <tr key={bug.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(bug.fecha).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {bug.usuario?.nombre}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bug.cantidad_bugs}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${bug.precio_por_bug.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    ${bug.total_ganado.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {bug.descripcion || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(bug)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(bug.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingBug ? 'Editar Registro' : 'Registrar Bugs'}
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario
                </label>
                <select
                  {...register('usuario_id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar usuario</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre}
                    </option>
                  ))}
                </select>
                {errors.usuario_id && (
                  <p className="text-sm text-red-600">{errors.usuario_id.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha
                </label>
                <input
                  {...register('fecha')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.fecha && (
                  <p className="text-sm text-red-600">{errors.fecha.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad de Bugs
                  </label>
                  <input
                    {...register('cantidad_bugs', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.cantidad_bugs && (
                    <p className="text-sm text-red-600">{errors.cantidad_bugs.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio por Bug ($)
                  </label>
                  <input
                    {...register('precio_por_bug', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.precio_por_bug && (
                    <p className="text-sm text-red-600">{errors.precio_por_bug.message}</p>
                  )}
                </div>
              </div>

              {/* Cálculo automático */}
              {watchCantidad && watchPrecio && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Total a ganar: ${(watchCantidad * watchPrecio).toFixed(2)}</strong>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  {...register('descripcion')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Detalles adicionales sobre los bugs procesados..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  {editingBug ? 'Actualizar' : 'Registrar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingBug(null)
                    reset({
                      fecha: format(new Date(), 'yyyy-MM-dd'),
                      precio_por_bug: 50.00
                    })
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 