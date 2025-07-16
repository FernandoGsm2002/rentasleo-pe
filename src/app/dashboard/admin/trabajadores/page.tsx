'use client'

// Deshabilitar prerenderizado para esta página
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Usuario } from '@/types/supabase'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Mail,
  Key,
  Search,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Calendar
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const trabajadorSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  username: z.string().min(3, 'Username debe tener al menos 3 caracteres').regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos'),
  password: z.string(),
  sueldo_base: z.number().min(0, 'El sueldo debe ser mayor o igual a 0'),
}).refine((data) => {
  // En creación, password es obligatorio y debe tener al menos 6 caracteres
  if (data.password.length > 0) {
    return data.password.length >= 6
  }
  return true
}, {
  message: 'Contraseña debe tener al menos 6 caracteres',
  path: ['password']
})

type TrabajadorFormData = z.infer<typeof trabajadorSchema>

export default function TrabajadoresAdmin() {
  const [trabajadores, setTrabajadores] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTrabajador, setEditingTrabajador] = useState<Usuario | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({})
  const supabase = createSupabaseBrowserClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<TrabajadorFormData>({
    resolver: zodResolver(trabajadorSchema),
  })

  const watchedUsername = watch('username')

  useEffect(() => {
    loadTrabajadores()
  }, [])

  const loadTrabajadores = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('rol', 'trabajador')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTrabajadores(data || [])
    } catch (error) {
      console.error('Error cargando trabajadores:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: TrabajadorFormData) => {
    try {
      // Validar contraseña para nuevos trabajadores
      if (!editingTrabajador && !data.password) {
        alert('❌ La contraseña es obligatoria para nuevos trabajadores')
        return
      }

      const action = editingTrabajador ? 'update' : 'create'
      const requestData = {
        nombre: data.nombre,
        username: data.username,
        password: data.password,
        sueldo_base: data.sueldo_base,
        action: action,
        ...(editingTrabajador && { id: editingTrabajador.id })
      }

      const response = await fetch('/api/admin/trabajadores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error en la operación')
      }

      alert(`✅ ${result.message}`)
      setShowModal(false)
      setEditingTrabajador(null)
      reset()
      loadTrabajadores()
    } catch (error) {
      console.error('Error guardando trabajador:', error)
      alert(`❌ ${error instanceof Error ? error.message : 'Error guardando trabajador'}`)
    }
  }

  const handleEdit = (trabajador: Usuario) => {
    setEditingTrabajador(trabajador)
    setValue('nombre', trabajador.nombre)
    setValue('username', trabajador.email.split('@')[0])
    setValue('password', '') // No mostrar contraseña actual
    setValue('sueldo_base', trabajador.sueldo_base || 0)
    setShowModal(true)
  }

  const handleDelete = async (trabajador: Usuario) => {
    if (!confirm(`¿Estás seguro de eliminar al trabajador "${trabajador.nombre}"?\n\nEsto eliminará todos sus datos asociados.`)) return

    try {
      const response = await fetch('/api/admin/trabajadores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          id: trabajador.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error eliminando trabajador')
      }

      alert(`✅ ${result.message}`)
      loadTrabajadores()
    } catch (error) {
      console.error('Error eliminando trabajador:', error)
      alert(`❌ ${error instanceof Error ? error.message : 'Error eliminando trabajador'}`)
    }
  }

  const toggleStatus = async (trabajador: Usuario) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ 
          activo: !trabajador.activo,
          updated_at: new Date().toISOString()
        })
        .eq('id', trabajador.id)

      if (error) throw error
      loadTrabajadores()
    } catch (error) {
      console.error('Error cambiando estado:', error)
    }
  }

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  const filteredTrabajadores = trabajadores.filter(trabajador =>
    trabajador.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trabajador.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="text-3xl font-bold text-gray-900">👥 Gestión de Trabajadores</h1>
          <p className="text-gray-600">Administra los trabajadores del sistema LEOPE-STAFF</p>
        </div>
        <button
          onClick={() => {
            setEditingTrabajador(null)
            reset()
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Trabajador</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Trabajadores</p>
              <p className="text-2xl font-bold text-gray-900">{trabajadores.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <UserCheck className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {trabajadores.filter(t => t.activo).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <UserX className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inactivos</p>
              <p className="text-2xl font-bold text-gray-900">
                {trabajadores.filter(t => !t.activo).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Nuevos (Este Mes)</p>
              <p className="text-2xl font-bold text-gray-900">
                {trabajadores.filter(t => {
                  const created = new Date(t.created_at)
                  const now = new Date()
                  return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        </div>
      </div>

      {/* Trabajadores Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Trabajadores Registrados ({filteredTrabajadores.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trabajador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email / Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sueldo Diario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Registro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTrabajadores.map((trabajador) => (
                <tr key={trabajador.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {trabajador.nombre.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {trabajador.nombre}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {trabajador.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div>
                        <div className="text-sm text-gray-900 flex items-center">
                          <Mail className="w-4 h-4 mr-1 text-gray-400" />
                          {trabajador.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          Username: {trabajador.email.split('@')[0]}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-green-600">
                      S/. {trabajador.sueldo_base?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {trabajador.sueldo_base === 0 ? 'Sin asignar' : 'Por día trabajado'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleStatus(trabajador)}
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                        trabajador.activo
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {trabajador.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(trabajador.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(trabajador)}
                        className="p-1 rounded text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                        title="Editar trabajador"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(trabajador)}
                        className="p-1 rounded text-red-600 hover:text-red-900 hover:bg-red-50"
                        title="Eliminar trabajador"
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
      </div>

      {/* Modal para agregar/editar trabajador */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-slate-800 mb-6">
              {editingTrabajador ? '✏️ Editar Trabajador' : '➕ Nuevo Trabajador'}
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  {...register('nombre')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Juan Pérez"
                />
                {errors.nombre && (
                  <p className="text-sm text-red-600 mt-1">{errors.nombre.message}</p>
                )}
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Username
                </label>
                <div className="relative">
                  <input
                    {...register('username')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 pr-20"
                    placeholder="juanperez"
                  />
                  <span className="absolute right-3 top-2 text-sm text-gray-500">@leope.com</span>
                </div>
                {watchedUsername && (
                  <p className="text-xs text-blue-600 mt-1">
                    Email: {watchedUsername}@leope.com
                  </p>
                )}
                {errors.username && (
                  <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Contraseña {editingTrabajador && '(dejar vacío para mantener actual)'}
                </label>
                <input
                  {...register('password')}
                  type="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Sueldo Base */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  💰 Sueldo Diario (S/.)
                </label>
                <input
                  {...register('sueldo_base', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="50.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ⚠️ Solo cobra si marca entrada y salida el mismo día
                </p>
                {errors.sueldo_base && (
                  <p className="text-sm text-red-600 mt-1">{errors.sueldo_base.message}</p>
                )}
              </div>

              {/* Botones */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium transition-colors"
                >
                  {editingTrabajador ? '✅ Actualizar' : '➕ Crear Trabajador'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingTrabajador(null)
                    reset()
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 font-medium transition-colors"
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