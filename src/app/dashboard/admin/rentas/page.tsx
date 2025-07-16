'use client'

// Deshabilitar prerenderizado para esta página
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { RentaHerramienta, Usuario } from '@/types/supabase'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Search,
  Calendar,
  Timer,
  User,
  Wrench,
  Settings,
  Zap,
  Play,
  Pause,
  Copy
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToast } from '@/components/ui/toast'

// Funciones helper simplificadas
const simpleLog = (operation: string, error: any) => {
  console.error(`🔴 [${operation}] Error detallado:`, {
    message: error?.message || 'Sin mensaje',
    code: error?.code || 'Sin código',
    details: error?.details || 'Sin detalles',
    hint: error?.hint || 'Sin sugerencia',
    fullError: error
  })
}

// Herramientas predefinidas
const HERRAMIENTAS_DISPONIBLES = [
  { id: 'unlocktool', nombre: 'UNLOCKTOOL', color: 'bg-blue-600', imagen: '/png/unlocktool.png' },
  { id: 'dft', nombre: 'DFT', color: 'bg-green-600', imagen: '/png/dftpro.png' },
  { id: 'pandora', nombre: 'PANDORA', color: 'bg-purple-600', imagen: '/png/pandora.jpg' },
  { id: 'tsm', nombre: 'TSM', color: 'bg-red-600', imagen: '/png/tsm.png' },
  { id: 'custom', nombre: 'Personalizada', color: 'bg-gray-600', imagen: null }
]

// Duraciones predefinidas
const DURACIONES_DISPONIBLES = [
  { horas: 6, texto: '6 horas', color: 'bg-emerald-100 text-emerald-800' },
  { horas: 12, texto: '12 horas', color: 'bg-blue-100 text-blue-800' },
  { horas: 24, texto: '24 horas (1 día)', color: 'bg-indigo-100 text-indigo-800' },
  { horas: 48, texto: '48 horas (2 días)', color: 'bg-purple-100 text-purple-800' },
  { horas: 168, texto: '1 semana', color: 'bg-orange-100 text-orange-800' },
  { horas: 720, texto: '1 mes (30 días)', color: 'bg-red-100 text-red-800' }
]

const rentaSchema = z.object({
  tipo_herramienta: z.string().min(1, 'Selecciona una herramienta'),
  usuario_login: z.string().min(1, 'Username requerido'),
  password_actual: z.string().min(1, 'Password requerido'),
  email: z.string().email('Email válido requerido'),
})

type RentaFormData = z.infer<typeof rentaSchema>

interface RentaConUsuario extends RentaHerramienta {
  usuario_responsable?: Usuario | null
  email?: string
  fecha_vencimiento?: string
}

export default function RentasAdmin() {
  const [rentas, setRentas] = useState<RentaConUsuario[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showRentModal, setShowRentModal] = useState(false)
  const [editingRenta, setEditingRenta] = useState<RentaHerramienta | null>(null)
  const [rentingLicense, setRentingLicense] = useState<RentaHerramienta | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTool, setSelectedTool] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedDuration, setSelectedDuration] = useState<number>(24)
  const [selectedResponsible, setSelectedResponsible] = useState<string>('')
  const [selectedStartDate, setSelectedStartDate] = useState<string>('')
  const [selectedStartTime, setSelectedStartTime] = useState<string>('')
  const [selectedLicenses, setSelectedLicenses] = useState<Set<string>>(new Set())
  const [showScriptModal, setShowScriptModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createSupabaseBrowserClient()
  const { addToast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<RentaFormData>({
    resolver: zodResolver(rentaSchema),
  })

  const watchedTool = watch('tipo_herramienta')

  useEffect(() => {
    loadRentas()
    loadUsuarios()
  }, [])

  const loadRentas = async () => {
    try {
      console.log('📋 [loadRentas] Iniciando carga de rentas...')
      const result = await supabase
        .from('rentas_herramientas')
        .select(`
          *,
          usuario_responsable:usuarios(*)
        `)
        .order('created_at', { ascending: false })

      console.log('📋 [loadRentas] Respuesta recibida:', result)

      if (result.error) {
        console.error('❌ [loadRentas] Error en la consulta:', result.error)
        throw result.error
      }
      
      console.log('📋 [loadRentas] Estableciendo rentas en estado...', result.data?.length || 0, 'elementos')
      setRentas(result.data || [])
      console.log('✅ Rentas cargadas:', result.data?.length || 0)
    } catch (error) {
      console.error('❌ [loadRentas] Error en catch:', error)
      simpleLog('loadRentas', error)
      addToast({
        type: 'error',
        title: 'Error al cargar rentas',
        message: 'No se pudieron cargar las rentas. Intenta recargar la página.'
      })
    } finally {
      console.log('📋 [loadRentas] Estableciendo loading en false...')
      setLoading(false)
      console.log('📋 [loadRentas] loadRentas completado!')
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

  const onSubmit = async (data: RentaFormData) => {
    if (submitting) return
    
    try {
      setSubmitting(true)
      console.log('💾 Guardando licencia:', data.usuario_login)

      const rentaData = {
        nombre_herramienta: data.usuario_login, // Usamos el username como nombre
        tipo_herramienta: data.tipo_herramienta,
        usuario_login: data.usuario_login,
        password_actual: data.password_actual,
        duracion_horas: 0, // Sin duración inicial
        fecha_inicio: new Date().toISOString(), // Fecha placeholder
        fecha_fin: new Date().toISOString(), // Fecha placeholder  
        usuario_responsable_id: null, // Sin responsable inicial
        activa: false, // Inicia como disponible
        costo: 0 // Sin costo, manejado externamente
      }

      if (editingRenta) {
        const result = await supabase
          .from('rentas_herramientas')
          .update(rentaData)
          .eq('id', editingRenta.id)

        if (result.error) throw result.error
        
        addToast({
          type: 'success',
          title: 'Licencia actualizada',
          message: `La licencia ${data.usuario_login} se actualizó correctamente`
        })
      } else {
        const result = await supabase
          .from('rentas_herramientas')
          .insert(rentaData)

        if (result.error) throw result.error
        
        addToast({
          type: 'success',
          title: 'Licencia creada',
          message: `La licencia ${data.usuario_login} se creó correctamente`
        })
      }

      setShowModal(false)
      setEditingRenta(null)
      reset()
      await loadRentas()
    } catch (error) {
              simpleLog('onSubmit', error)
      addToast({
        type: 'error',
        title: editingRenta ? 'Error al actualizar' : 'Error al crear',
        message: 'No se pudo guardar la licencia. Por favor intenta nuevamente.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const startRent = async () => {
    if (!rentingLicense || !selectedStartDate || !selectedStartTime) {
      addToast({
        type: 'warning',
        title: 'Campos requeridos',
        message: 'Por favor selecciona fecha y hora de inicio'
      })
      return
    }

    if (submitting) return

    try {
      console.log('🔵 [1] Iniciando proceso de renta...')
      setSubmitting(true)
      console.log('🔵 [2] Estado submitting establecido en true')
      console.log('🚀 Iniciando renta para:', rentingLicense.nombre_herramienta)

      // Combinar fecha y hora seleccionadas
      const fechaInicio = new Date(`${selectedStartDate}T${selectedStartTime}`)
      const fechaFin = new Date(fechaInicio.getTime() + (selectedDuration * 60 * 60 * 1000))
      
      console.log('🔵 [3] Fechas calculadas:', {
        inicio: fechaInicio.toISOString(),
        fin: fechaFin.toISOString(),
        duracion: selectedDuration
      })

      console.log('🔵 [4] Preparando actualización de base de datos...')

      const result = await supabase
        .from('rentas_herramientas')
        .update({
          duracion_horas: selectedDuration,
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: fechaFin.toISOString(),
          usuario_responsable_id: selectedResponsible || null,
          activa: true
        })
        .eq('id', rentingLicense.id)

      console.log('🔵 [5] Respuesta de la base de datos:', result)

      if (result.error) {
        console.error('🔴 [ERROR] Error en la actualización:', result.error)
        throw result.error
      }

      console.log('🔵 [6] Actualización exitosa, mostrando toast...')
      console.log('✅ Renta iniciada exitosamente')
      addToast({
        type: 'success',
        title: 'Renta iniciada',
        message: `La renta de ${rentingLicense.nombre_herramienta} se inició correctamente`
      })

      console.log('🔵 [7] Limpiando modales y estado...')
      setShowRentModal(false)
      setRentingLicense(null)
      setSelectedDuration(24)
      setSelectedResponsible('')
      setSelectedStartDate('')
      setSelectedStartTime('')
      
      console.log('🔵 [8] Iniciando recarga de rentas...')
      await loadRentas()
      console.log('🔵 [9] Recarga de rentas completada!')
      
    } catch (error) {
      console.error('🔴 [ERROR] Error en startRent:', error)
      simpleLog('startRent', error)
      addToast({
        type: 'error',
        title: 'Error al iniciar renta',
        message: 'No se pudo iniciar la renta. Por favor intenta nuevamente.'
      })
    } finally {
      console.log('🔵 [10] Ejecutando finally, estableciendo submitting en false...')
      setSubmitting(false)
      console.log('🔵 [11] Proceso completado!')
    }
  }

  const handleEdit = (renta: RentaHerramienta) => {
    setEditingRenta(renta)
    setValue('tipo_herramienta', renta.tipo_herramienta)
    setValue('usuario_login', renta.usuario_login)
    setValue('password_actual', renta.password_actual)
    setValue('email', 'leonardocontreras1020@gmail.com') // Email por defecto
    setShowModal(true)
  }

  const handleRent = (renta: RentaHerramienta) => {
    setRentingLicense(renta)
    
    // Establecer fecha y hora actual como valores por defecto
    const now = new Date()
    const today = now.toISOString().split('T')[0] // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
    
    setSelectedStartDate(today)
    setSelectedStartTime(currentTime)
    setShowRentModal(true)
  }

  const handleDelete = async (id: string) => {
    const licencia = rentas.find(r => r.id === id)
    const confirmed = window.confirm(`¿Estás seguro de eliminar la licencia ${licencia?.nombre_herramienta || 'seleccionada'}?`)
    
    if (!confirmed) return

    try {
      console.log('🗑️ Eliminando licencia:', id)
      
      const result = await supabase
        .from('rentas_herramientas')
        .delete()
        .eq('id', id)

      if (result.error) throw result.error
      
      addToast({
        type: 'success',
        title: 'Licencia eliminada',
        message: `La licencia ${licencia?.nombre_herramienta || ''} se eliminó correctamente`
      })
      
      await loadRentas()
    } catch (error) {
              simpleLog('handleDelete', error)
      addToast({
        type: 'error',
        title: 'Error al eliminar',
        message: 'No se pudo eliminar la licencia. Por favor intenta nuevamente.'
      })
    }
  }

  const stopRent = async (renta: RentaHerramienta) => {
    try {
      const { error } = await supabase
        .from('rentas_herramientas')
        .update({ 
          activa: false,
          fecha_inicio: new Date().toISOString(), // Placeholder fecha
          fecha_fin: new Date().toISOString(), // Placeholder fecha
          duracion_horas: 0,
          usuario_responsable_id: null
        })
        .eq('id', renta.id)

      if (error) throw error
      loadRentas()
    } catch (error) {
      console.error('Error deteniendo renta:', error)
    }
  }

  // Funciones helper - deben estar antes del filtro
  const getHerramientaInfo = (tipo: string) => {
    return HERRAMIENTAS_DISPONIBLES.find(h => h.id === tipo) || HERRAMIENTAS_DISPONIBLES[4]
  }

  const getDuracionInfo = (horas: number) => {
    return DURACIONES_DISPONIBLES.find(d => d.horas === horas) || 
           { horas, texto: `${horas}h`, color: 'bg-gray-100 text-gray-800' }
  }

  const getStatusColor = (renta: RentaHerramienta) => {
    if (!renta.activa) return 'bg-gray-100 text-gray-800'
    const now = new Date()
    const fin = new Date(renta.fecha_fin)
    if (fin < now) return 'bg-red-100 text-red-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = (renta: RentaHerramienta) => {
    if (!renta.activa) return 'Disponible'
    const now = new Date()
    const fin = new Date(renta.fecha_fin)
    if (fin < now) return 'Vencida'
    return 'En Uso'
  }

  const filteredRentas = rentas.filter(renta => {
    const matchesSearch = renta.nombre_herramienta.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         renta.tipo_herramienta.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         renta.usuario_login.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         renta.password_actual.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTool = selectedTool === '' || renta.tipo_herramienta === selectedTool
    
    // Filtro por estado
    const currentStatus = getStatusText(renta)
    const matchesStatus = selectedStatus === '' || 
                         (selectedStatus === 'disponible' && currentStatus === 'Disponible') ||
                         (selectedStatus === 'en_uso' && currentStatus === 'En Uso') ||
                         (selectedStatus === 'vencida' && currentStatus === 'Vencida')
    
    return matchesSearch && matchesTool && matchesStatus
  })

  const getPasswordChangeUrl = (tipoHerramienta: string) => {
    switch (tipoHerramienta) {
      case 'unlocktool':
        return 'https://unlocktool.net/post-in/'
      case 'dft':
        return 'https://www.dftpro.com/user/forget_password'
      case 'pandora':
        return 'https://pandoratools.org/login' // URL ejemplo
      case 'tsm':
        return 'https://tsm.com/login' // URL ejemplo
      default:
        return '#'
    }
  }

  const handleExpiredRent = (renta: RentaHerramienta) => {
    const url = getPasswordChangeUrl(renta.tipo_herramienta)
    const message = `La renta de ${renta.tipo_herramienta.toUpperCase()} ha expirado.\n\n` +
                   `Usuario: ${renta.usuario_login}\n` +
                   `¿Deseas cambiar la contraseña ahora?`
    
    if (confirm(message)) {
      window.open(url, '_blank')
    }
  }

  const handleLicenseSelection = (licenseId: string, checked: boolean) => {
    const newSelection = new Set(selectedLicenses)
    if (checked) {
      newSelection.add(licenseId)
    } else {
      newSelection.delete(licenseId)
    }
    setSelectedLicenses(newSelection)
  }

  const handleSelectAllLicenses = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredRentas.map(renta => renta.id))
      setSelectedLicenses(allIds)
    } else {
      setSelectedLicenses(new Set())
    }
  }

  const generateScript = () => {
    const selectedRentas = filteredRentas.filter(renta => selectedLicenses.has(renta.id))
    const script = selectedRentas.map(renta => 
      `username=>${renta.usuario_login}password=>${renta.password_actual}`
    ).join('\n')
    
    return script
  }

  const copyScript = async () => {
    try {
      const script = generateScript()
      await navigator.clipboard.writeText(script)
      alert('✅ Script copiado al clipboard')
    } catch (error) {
      console.error('Error copiando script:', error)
      alert('❌ Error al copiar el script')
    }
  }

  const downloadScript = () => {
    const script = generateScript()
    const blob = new Blob([script], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `licencias_script_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🛠️ Gestión de Licencias</h1>
          <p className="text-gray-600">Administra las licencias de herramientas y sus credenciales</p>
          {selectedLicenses.size > 0 && (
            <p className="text-sm text-blue-600 mt-1">
              📋 {selectedLicenses.size} licencia(s) seleccionada(s)
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {selectedLicenses.size > 0 && (
            <button
              onClick={() => setShowScriptModal(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Generar Script ({selectedLicenses.size})</span>
            </button>
          )}
          <button
            onClick={() => {
              setEditingRenta(null)
              reset()
              setShowModal(true)
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Licencia</span>
          </button>
        </div>
      </div>

      {/* Herramientas Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {HERRAMIENTAS_DISPONIBLES.slice(0, -1).map((herramienta) => {
          const count = rentas.filter(r => r.tipo_herramienta === herramienta.id && r.activa).length
          const total = rentas.filter(r => r.tipo_herramienta === herramienta.id).length
          return (
            <button 
              key={herramienta.id} 
              onClick={() => setSelectedTool(selectedTool === herramienta.id ? '' : herramienta.id)}
              className={`w-full text-left bg-white p-4 rounded-lg shadow-sm border transition-all hover:shadow-md ${
                selectedTool === herramienta.id ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-gray-300'
              }`}
            >
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 overflow-hidden bg-gray-100">
                {herramienta.imagen ? (
                  <Image
                    src={herramienta.imagen}
                    alt={herramienta.nombre}
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain rounded-lg"
                  />
                ) : (
                  <div className={`w-full h-full ${herramienta.color} rounded-lg flex items-center justify-center`}>
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              <h3 className="font-medium text-gray-900">{herramienta.nombre}</h3>
              <p className="text-sm text-gray-600">{count} en uso / {total} total</p>
            </button>
          )
        })}
      </div>

      {/* Filtros por Estado */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Filtrar por Estado</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedStatus('')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedStatus === '' 
                ? 'bg-gray-800 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 Todas ({rentas.length})
          </button>
          <button
            onClick={() => setSelectedStatus('disponible')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedStatus === 'disponible' 
                ? 'bg-gray-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⚪ Disponibles ({rentas.filter(r => getStatusText(r) === 'Disponible').length})
          </button>
          <button
            onClick={() => setSelectedStatus('en_uso')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedStatus === 'en_uso' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            🟢 En Uso ({rentas.filter(r => getStatusText(r) === 'En Uso').length})
          </button>
          <button
            onClick={() => setSelectedStatus('vencida')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedStatus === 'vencida' 
                ? 'bg-red-600 text-white' 
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            🔴 Vencidas ({rentas.filter(r => getStatusText(r) === 'Vencida').length})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre, herramienta, usuario o contraseña..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        </div>
        {(selectedTool || selectedStatus) && (
          <div className="mt-3 space-y-2">
            {selectedTool && (
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-blue-800">
                    🔧 Herramienta: <strong>{getHerramientaInfo(selectedTool).nombre}</strong>
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTool('')}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  ✕
                </button>
              </div>
            )}
            {selectedStatus && (
              <div className="flex items-center justify-between bg-purple-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-purple-800">
                    📊 Estado: <strong>
                      {selectedStatus === 'disponible' && 'Disponibles'}
                      {selectedStatus === 'en_uso' && 'En Uso'}
                      {selectedStatus === 'vencida' && 'Vencidas'}
                    </strong>
                  </span>
                </div>
                <button
                  onClick={() => setSelectedStatus('')}
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                >
                  ✕
                </button>
              </div>
            )}
            {(selectedTool || selectedStatus) && (
              <button
                onClick={() => {
                  setSelectedTool('')
                  setSelectedStatus('')
                }}
                className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                🗑️ Limpiar todos los filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Licencias Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Licencias Disponibles ({filteredRentas.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedLicenses.size === filteredRentas.length && filteredRentas.length > 0}
                    onChange={(e) => handleSelectAllLicenses(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Herramienta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credenciales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email/Vencimiento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado/Renta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responsable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRentas.map((renta) => {
                const herramientaInfo = getHerramientaInfo(renta.tipo_herramienta)
                const duracionInfo = getDuracionInfo(renta.duracion_horas)
                return (
                  <tr key={renta.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLicenses.has(renta.id)}
                        onChange={(e) => handleLicenseSelection(renta.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 overflow-hidden bg-gray-100">
                          {herramientaInfo.imagen ? (
                            <Image
                              src={herramientaInfo.imagen}
                              alt={herramientaInfo.nombre}
                              width={40}
                              height={40}
                              className="w-10 h-10 object-contain rounded-lg"
                            />
                          ) : (
                            <div className={`w-full h-full ${herramientaInfo.color} rounded-lg flex items-center justify-center`}>
                              <Wrench className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {herramientaInfo.nombre}
                          </div>
                          <div className="text-sm text-gray-500">
                            {renta.nombre_herramienta}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900 flex items-center">
                          <User className="w-4 h-4 mr-1 text-gray-400" />
                          {renta.usuario_login}
                        </div>
                        <div className="text-sm text-gray-900 flex items-center">
                          <span className="mr-1">🔑</span>
                          {renta.password_actual}
                        </div>
                        <a
                          href={getPasswordChangeUrl(renta.tipo_herramienta)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center"
                        >
                          🔗 Cambiar contraseña aquí
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        📧 leonardocontreras1020@gmail.com
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Vence: 15/07/2025
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(renta)}`}>
                        {getStatusText(renta)}
                        {getStatusText(renta) === 'Vencida' && (
                          <AlertCircle className="w-3 h-3 ml-1 animate-pulse" />
                        )}
                      </span>
                      {renta.activa && renta.duracion_horas > 0 && (
                        <div className="mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${duracionInfo.color}`}>
                            <Timer className="w-3 h-3 mr-1" />
                            {duracionInfo.texto}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            Hasta: {new Date(renta.fecha_fin).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {renta.usuario_responsable?.nombre || 'Sin asignar'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {!renta.activa ? (
                          <button
                            onClick={() => handleRent(renta)}
                            className="p-1 rounded text-green-600 hover:text-green-900 hover:bg-green-50"
                            title="Iniciar renta"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        ) : getStatusText(renta) === 'Vencida' ? (
                          <button
                            onClick={() => handleExpiredRent(renta)}
                            className="p-1 rounded text-orange-600 hover:text-orange-900 hover:bg-orange-50"
                            title="Cambiar contraseña"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => stopRent(renta)}
                            className="p-1 rounded text-red-600 hover:text-red-900 hover:bg-red-50"
                            title="Detener renta"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(renta)}
                          className="p-1 rounded text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                          title="Editar licencia"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(renta.id)}
                          className="p-1 rounded text-red-600 hover:text-red-900 hover:bg-red-50"
                          title="Eliminar licencia"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para agregar/editar licencia */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-6">
              {editingRenta ? '✏️ Editar Licencia' : '➕ Nueva Licencia'}
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Selección de Herramienta */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Seleccionar Herramienta
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {HERRAMIENTAS_DISPONIBLES.map((herramienta) => (
                    <label
                      key={herramienta.id}
                      className={`cursor-pointer border-2 rounded-lg p-3 transition-all ${
                        watchedTool === herramienta.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        {...register('tipo_herramienta')}
                        type="radio"
                        value={herramienta.id}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="w-8 h-8 rounded mx-auto mb-2 flex items-center justify-center overflow-hidden bg-gray-100">
                          {herramienta.imagen ? (
                            <Image
                              src={herramienta.imagen}
                              alt={herramienta.nombre}
                              width={32}
                              height={32}
                              className="w-8 h-8 object-contain rounded"
                            />
                          ) : (
                            <div className={`w-full h-full ${herramienta.color} rounded flex items-center justify-center`}>
                              <Wrench className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{herramienta.nombre}</span>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.tipo_herramienta && (
                  <p className="text-sm text-red-600 mt-1">{errors.tipo_herramienta.message}</p>
                )}
              </div>

              {/* Credenciales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Username
                  </label>
                  <input
                    {...register('usuario_login')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="LuccaPESimon3"
                  />
                  {errors.usuario_login && (
                    <p className="text-sm text-red-600">{errors.usuario_login.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <input
                    {...register('password_actual')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Qwerty99s"
                  />
                  {errors.password_actual && (
                    <p className="text-sm text-red-600">{errors.password_actual.message}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Email de la cuenta
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="leonardocontreras1020@gmail.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Botones */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{editingRenta ? 'Actualizando...' : 'Creando...'}</span>
                    </div>
                  ) : (
                    editingRenta ? '✅ Actualizar Licencia' : '➕ Crear Licencia'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingRenta(null)
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

      {/* Modal para iniciar renta */}
      {showRentModal && rentingLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-slate-800 mb-6">
              🚀 Iniciar Renta
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden bg-white">
                  {getHerramientaInfo(rentingLicense.tipo_herramienta).imagen ? (
                    <Image
                      src={getHerramientaInfo(rentingLicense.tipo_herramienta).imagen!}
                      alt={getHerramientaInfo(rentingLicense.tipo_herramienta).nombre}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-contain rounded-lg"
                    />
                  ) : (
                    <div className={`w-full h-full ${getHerramientaInfo(rentingLicense.tipo_herramienta).color} rounded-lg flex items-center justify-center`}>
                      <Wrench className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">{rentingLicense.nombre_herramienta}</h4>
                  <p className="text-sm text-slate-600">Usuario: {rentingLicense.usuario_login}</p>
                  <p className="text-sm text-slate-500">{getHerramientaInfo(rentingLicense.tipo_herramienta).nombre}</p>
                </div>
              </div>

              {/* Fecha y Hora de Inicio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={selectedStartDate}
                    onChange={(e) => setSelectedStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Hora de Inicio
                  </label>
                  <input
                    type="time"
                    value={selectedStartTime}
                    onChange={(e) => setSelectedStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    required
                  />
                </div>
              </div>

              {/* Duración */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Duración de la Renta
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {DURACIONES_DISPONIBLES.map((duracion) => (
                    <label
                      key={duracion.horas}
                      className={`cursor-pointer border-2 rounded-lg p-3 transition-all ${
                        selectedDuration === duracion.horas
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value={duracion.horas}
                        checked={selectedDuration === duracion.horas}
                        onChange={(e) => setSelectedDuration(Number(e.target.value))}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <Timer className="w-4 h-4 mx-auto mb-1 text-slate-600" />
                        <span className="text-sm font-semibold text-slate-800">{duracion.texto}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Información calculada */}
              {selectedStartDate && selectedStartTime && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">📅 Resumen de la Renta</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Inicio:</strong> {new Date(`${selectedStartDate}T${selectedStartTime}`).toLocaleString('es-ES')}</p>
                    <p><strong>Fin:</strong> {new Date(new Date(`${selectedStartDate}T${selectedStartTime}`).getTime() + (selectedDuration * 60 * 60 * 1000)).toLocaleString('es-ES')}</p>
                    <p><strong>Duración:</strong> {selectedDuration} horas</p>
                  </div>
                </div>
              )}

              {/* Responsable */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Asignar Responsable (Opcional)
                </label>
                <select
                  value={selectedResponsible}
                  onChange={(e) => setSelectedResponsible(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Sin asignar</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botones */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={startRent}
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Iniciando...</span>
                    </div>
                  ) : (
                    '🚀 Iniciar Renta'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowRentModal(false)
                    setRentingLicense(null)
                    setSelectedDuration(24)
                    setSelectedResponsible('')
                    setSelectedStartDate('')
                    setSelectedStartTime('')
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Script Generado */}
      {showScriptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              📋 Script de Licencias Generado
            </h3>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-slate-600 mb-2">
                <strong>Licencias seleccionadas:</strong> {selectedLicenses.size}
              </p>
              <div className="bg-white p-3 rounded border font-mono text-sm max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-slate-800">{generateScript()}</pre>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={copyScript}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Copy className="w-5 h-5" />
                <span>📋 Copiar al Clipboard</span>
              </button>
              <button
                onClick={downloadScript}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>📄 Descargar TXT</span>
              </button>
              <button
                onClick={() => setShowScriptModal(false)}
                className="px-6 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 