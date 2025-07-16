'use client'

// Deshabilitar prerenderizado para esta página
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { BugSamsung } from '@/types/supabase'
import { 
  Bug, 
  Calendar, 
  DollarSign,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  Target,
  CheckCircle
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const bugSchema = z.object({
  cantidad_bugs: z.number().min(0, 'La cantidad debe ser mayor o igual a 0').max(1000, 'Máximo 1000 bugs por día'),
  precio_por_bug: z.number().min(0, 'El precio debe ser mayor a 0'),
  descripcion: z.string().optional()
})

type BugFormData = z.infer<typeof bugSchema>

interface BugConTotal extends BugSamsung {
  total_ganado: number
}

export default function BugsTrabajador() {
  const { userData } = useAuth()
  const [bugs, setBugs] = useState<BugConTotal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBug, setEditingBug] = useState<BugSamsung | null>(null)
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(new Date().getMonth() + 1)
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(new Date().getFullYear())
  const supabase = createSupabaseBrowserClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<BugFormData>({
    resolver: zodResolver(bugSchema),
    defaultValues: {
      precio_por_bug: 50.00 // Precio por defecto
    }
  })

  useEffect(() => {
    if (userData?.id) {
      loadBugs()
    }
  }, [userData?.id, mesSeleccionado, anioSeleccionado])

  const loadBugs = async () => {
    if (!userData?.id) return

    try {
      const inicioMes = new Date(anioSeleccionado, mesSeleccionado - 1, 1).toISOString().split('T')[0]
      const finMes = new Date(anioSeleccionado, mesSeleccionado, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('bugs_samsung')
        .select('*')
        .eq('usuario_id', userData.id)
        .gte('fecha', inicioMes)
        .lte('fecha', finMes)
        .order('fecha', { ascending: false })

      if (error) throw error
      setBugs(data || [])
    } catch (error) {
      console.error('Error cargando bugs:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: BugFormData) => {
    if (!userData?.id) return

    try {
      const fechaHoy = new Date().toISOString().split('T')[0]
      
      if (editingBug) {
        // Actualizar bug existente
        const { error } = await supabase
          .from('bugs_samsung')
          .update({
            cantidad_bugs: data.cantidad_bugs,
            precio_por_bug: data.precio_por_bug,
            descripcion: data.descripcion,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBug.id)

        if (error) throw error
        alert('✅ Bug actualizado exitosamente')
      } else {
        // Crear nuevo bug
        const { error } = await supabase
          .from('bugs_samsung')
          .insert({
            usuario_id: userData.id,
            fecha: fechaHoy,
            cantidad_bugs: data.cantidad_bugs,
            precio_por_bug: data.precio_por_bug,
            descripcion: data.descripcion
          })

        if (error) {
          if (error.code === '23505') {
            alert('❌ Ya registraste bugs para hoy. Puedes editarlo si necesitas cambiar la cantidad.')
            return
          }
          throw error
        }
        alert('✅ Bugs registrados exitosamente')
      }

      setShowModal(false)
      setEditingBug(null)
      reset()
      await loadBugs()
    } catch (error) {
      console.error('Error guardando bug:', error)
      alert('❌ Error al guardar los bugs')
    }
  }

  const handleEdit = (bug: BugSamsung) => {
    setEditingBug(bug)
    setValue('cantidad_bugs', bug.cantidad_bugs)
    setValue('precio_por_bug', bug.precio_por_bug)
    setValue('descripcion', bug.descripcion || '')
    setShowModal(true)
  }

  const handleDelete = async (bug: BugSamsung) => {
    if (!confirm('¿Estás seguro de eliminar este registro de bugs?')) return

    try {
      const { error } = await supabase
        .from('bugs_samsung')
        .delete()
        .eq('id', bug.id)

      if (error) throw error
      alert('✅ Registro eliminado exitosamente')
      await loadBugs()
    } catch (error) {
      console.error('Error eliminando bug:', error)
      alert('❌ Error al eliminar el registro')
    }
  }

  const registroHoy = bugs.find(bug => bug.fecha === new Date().toISOString().split('T')[0])
  const totalMes = bugs.reduce((sum, bug) => sum + bug.total_ganado, 0)
  const totalBugsMes = bugs.reduce((sum, bug) => sum + bug.cantidad_bugs, 0)
  const promedioDiario = bugs.length > 0 ? totalBugsMes / bugs.length : 0

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bugs Samsung
            </h1>
            <p className="text-gray-600 mt-1">
              Registra los bugs Samsung que proceses diariamente
            </p>
          </div>
          <button
            onClick={() => {
              setEditingBug(null)
              reset({ precio_por_bug: 50.00 })
              setShowModal(true)
            }}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Bugs Hoy
          </button>
        </div>

        {/* Selector de Mes */}
        <div className="flex items-center space-x-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Mes</label>
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(Number(e.target.value))}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
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
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estado de Hoy */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Estado de Hoy
        </h2>

        {registroHoy ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800">Ya registraste bugs hoy</h3>
                <p className="text-sm text-green-700 mt-1">
                  <strong>{registroHoy.cantidad_bugs} bugs</strong> × S/. {registroHoy.precio_por_bug} = 
                  <strong> S/. {registroHoy.total_ganado.toFixed(2)}</strong>
                </p>
                {registroHoy.descripcion && (
                  <p className="text-sm text-green-600 mt-1">"{registroHoy.descripcion}"</p>
                )}
              </div>
              <button
                onClick={() => handleEdit(registroHoy)}
                className="text-green-700 hover:text-green-900 text-sm font-medium"
              >
                Editar
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-yellow-800">No has registrado bugs hoy</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Registra la cantidad de bugs Samsung que procesaste hoy
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingBug(null)
                  reset({ precio_por_bug: 50.00 })
                  setShowModal(true)
                }}
                className="text-yellow-700 hover:text-yellow-900 text-sm font-medium"
              >
                Registrar Ahora
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Estadísticas del Mes */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Estadísticas - {getNombreMes(mesSeleccionado, anioSeleccionado)}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center">
              <Bug className="w-8 h-8 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Bugs</p>
                <p className="text-xl font-semibold text-gray-900">{totalBugsMes}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Ganado</p>
                <p className="text-xl font-semibold text-gray-900">S/. {totalMes.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Promedio Diario</p>
                <p className="text-xl font-semibold text-gray-900">{promedioDiario.toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Días Registrados</p>
                <p className="text-xl font-semibold text-gray-900">{bugs.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Historial de Registros
        </h2>

        {bugs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
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
                {bugs.map((bug) => (
                  <tr key={bug.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(bug.fecha).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        {bug.cantidad_bugs} bugs
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      S/. {bug.precio_por_bug.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      S/. {bug.total_ganado.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {bug.descripcion || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(bug)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(bug)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Bug className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay registros de bugs para este período</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingBug ? 'Editar Bugs' : 'Registrar Bugs de Hoy'}
              </h3>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {/* Cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🐛 Cantidad de Bugs
                </label>
                <input
                  {...register('cantidad_bugs', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  placeholder="Ej: 15"
                />
                {errors.cantidad_bugs && (
                  <p className="text-sm text-red-600 mt-1">{errors.cantidad_bugs.message}</p>
                )}
              </div>

              {/* Precio por Bug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  💰 Precio por Bug (S/.)
                </label>
                <input
                  {...register('precio_por_bug', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  placeholder="50.00"
                />
                {errors.precio_por_bug && (
                  <p className="text-sm text-red-600 mt-1">{errors.precio_por_bug.message}</p>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📝 Descripción (Opcional)
                </label>
                <textarea
                  {...register('descripcion')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  placeholder="Detalles adicionales sobre los bugs procesados..."
                />
              </div>

              {/* Botones */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 font-medium transition-colors"
                >
                  {editingBug ? '✅ Actualizar' : '🐛 Registrar Bugs'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingBug(null)
                    reset()
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 font-medium transition-colors"
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