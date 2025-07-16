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
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast'
import { withRetry, logError } from '@/lib/supabase'

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

export default function RentasTrabajador() {
  const { usuario } = useAuth()
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
      const { data, error } = await supabase
        .from('rentas_herramientas')
        .select(`
          *,
          usuario_responsable:usuarios(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRentas(data || [])
    } catch (error) {
      console.error('Error cargando rentas:', error)
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

  const onSubmit = async (data: RentaFormData) => {
    try {
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
        const { error } = await supabase
          .from('rentas_herramientas')
          .update(rentaData)
          .eq('id', editingRenta.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('rentas_herramientas')
          .insert(rentaData)

        if (error) throw error
      }

      setShowModal(false)
      setEditingRenta(null)
      reset()
      loadRentas()
    } catch (error) {
      console.error('Error guardando licencia:', error)
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
      setSubmitting(true)
      console.log('🚀 Iniciando renta para:', rentingLicense.nombre_herramienta)

      // Combinar fecha y hora seleccionadas
      const fechaInicio = new Date(`${selectedStartDate}T${selectedStartTime}`)
      const fechaFin = new Date(fechaInicio.getTime() + (selectedDuration * 60 * 60 * 1000))

      const result = await withRetry(
        async () => {
          const response = await supabase
            .from('rentas_herramientas')
            .update({
              duracion_horas: selectedDuration,
              fecha_inicio: fechaInicio.toISOString(),
              fecha_fin: fechaFin.toISOString(),
              usuario_responsable_id: selectedResponsible || null,
              activa: true
            })
            .eq('id', rentingLicense.id)
          return response
        },
        3,
        1000
      )

      if (result.error) {
        throw result.error
      }

      console.log('✅ Renta iniciada exitosamente')
      addToast({
        type: 'success',
        title: 'Renta iniciada',
        message: `La renta de ${rentingLicense.nombre_herramienta} se inició correctamente`
      })

      setShowRentModal(false)
      setRentingLicense(null)
      setSelectedDuration(24)
      setSelectedResponsible('')
      setSelectedStartDate('')
      setSelectedStartTime('')
      await loadRentas()
    } catch (error) {
      logError('startRent', error, { licenseId: rentingLicense?.id, selectedDuration })
      addToast({
        type: 'error',
        title: 'Error al iniciar renta',
        message: 'No se pudo iniciar la renta. Por favor intenta nuevamente.'
      })
    } finally {
      setSubmitting(false)
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
    if (!confirm('¿Estás seguro de eliminar esta licencia?')) return

    try {
      const { error } = await supabase
        .from('rentas_herramientas')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadRentas()
    } catch (error) {
      console.error('Error eliminando renta:', error)
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
    if (!renta.activa) return 'bg-slate-100 text-slate-800'
    const now = new Date()
    const fin = new Date(renta.fecha_fin)
    if (fin < now) return 'bg-red-100 text-red-800'
    return 'bg-emerald-100 text-emerald-800'
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
      const allIds = new Set(filteredRentas.map(r => r.id))
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🛠️ Gestión de Licencias</h1>
          <p className="text-slate-600">Administra las licencias de herramientas y sus credenciales</p>
          {selectedLicenses.size > 0 && (
            <p className="text-sm text-slate-600 mt-1">
              📋 {selectedLicenses.size} licencia(s) seleccionada(s)
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {selectedLicenses.size > 0 && (
            <button
              onClick={() => setShowScriptModal(true)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 flex items-center space-x-2 transition-colors"
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
            className="bg-slate-600 text-white px-6 py-3 rounded-lg hover:bg-slate-700 flex items-center space-x-2 transition-colors"
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
                selectedTool === herramienta.id ? 'ring-2 ring-slate-500 border-slate-500' : 'hover:border-slate-300'
              }`}
            >
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 overflow-hidden bg-slate-100">
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
              <h3 className="font-medium text-slate-900">{herramienta.nombre}</h3>
              <p className="text-sm text-slate-600">{count} en uso / {total} total</p>
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
                ? 'bg-slate-800 text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📋 Todas ({rentas.length})
          </button>
          <button
            onClick={() => setSelectedStatus('disponible')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedStatus === 'disponible' 
                ? 'bg-slate-600 text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ⚪ Disponibles ({rentas.filter(r => getStatusText(r) === 'Disponible').length})
          </button>
          <button
            onClick={() => setSelectedStatus('en_uso')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedStatus === 'en_uso' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre, herramienta, usuario o contraseña..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-slate-500 focus:border-slate-500 text-slate-900"
          />
        </div>
        {(selectedTool || selectedStatus) && (
          <div className="mt-3 space-y-2">
            {selectedTool && (
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-800">
                    🔧 Herramienta: <strong>{getHerramientaInfo(selectedTool).nombre}</strong>
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTool('')}
                  className="text-slate-600 hover:text-slate-800 text-sm font-medium"
                >
                  ✕
                </button>
              </div>
            )}
            {selectedStatus && (
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-800">
                    📊 Estado: <strong>
                      {selectedStatus === 'disponible' && 'Disponibles'}
                      {selectedStatus === 'en_uso' && 'En Uso'}
                      {selectedStatus === 'vencida' && 'Vencidas'}
                    </strong>
                  </span>
                </div>
                <button
                  onClick={() => setSelectedStatus('')}
                  className="text-slate-600 hover:text-slate-800 text-sm font-medium"
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
                className="w-full bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                🗑️ Limpiar todos los filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Licencias Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-900">
            Licencias Disponibles ({filteredRentas.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedLicenses.size === filteredRentas.length && filteredRentas.length > 0}
                    onChange={(e) => handleSelectAllLicenses(e.target.checked)}
                    className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Herramienta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Credenciales
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Estado/Renta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Responsable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredRentas.map((renta) => {
                const herramientaInfo = getHerramientaInfo(renta.tipo_herramienta)
                const duracionInfo = getDuracionInfo(renta.duracion_horas)
                return (
                  <tr key={renta.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedLicenses.has(renta.id)}
                        onChange={(e) => handleLicenseSelection(renta.id, e.target.checked)}
                        className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3 overflow-hidden bg-slate-100">
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
                          <h4 className="font-medium text-slate-900">{renta.nombre_herramienta}</h4>
                          <p className="text-sm text-slate-500">{herramientaInfo.nombre}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm text-slate-900 flex items-center">
                          <span className="mr-1">👤</span>
                          {renta.usuario_login}
                        </div>
                        <div className="text-sm text-slate-900 flex items-center">
                          <span className="mr-1">🔑</span>
                          {renta.password_actual}
                        </div>
                        <a
                          href={getPasswordChangeUrl(renta.tipo_herramienta)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-600 hover:text-slate-800 underline flex items-center"
                        >
                          🔗 Cambiar contraseña aquí
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        📧 leonardocontreras1020@gmail.com
                      </div>
                      <div className="text-sm text-slate-500 flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(renta.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(renta)}`}>
                          {getStatusText(renta)}
                        </span>
                        {renta.activa && (
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${duracionInfo.color}`}>
                              ⏱️ {duracionInfo.texto}
                            </span>
                            {getStatusText(renta) === 'En Uso' && (
                              <div className="text-xs text-slate-600 mt-1">
                                <Timer className="w-3 h-3 inline mr-1" />
                                Fin: {new Date(renta.fecha_fin).toLocaleString()}
                              </div>
                            )}
                            {getStatusText(renta) === 'Vencida' && (
                              <button
                                onClick={() => handleExpiredRent(renta)}
                                className="block text-xs text-red-600 hover:text-red-800 underline mt-1"
                              >
                                ⚠️ Acción requerida
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renta.usuario_responsable ? (
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-slate-400 mr-2" />
                          <span className="text-sm text-slate-900">{renta.usuario_responsable.nombre}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {!renta.activa ? (
                          <button
                            onClick={() => handleRent(renta)}
                            className="text-emerald-600 hover:text-emerald-900 p-1 rounded"
                            title="Iniciar renta"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => stopRent(renta)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Detener renta"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(renta)}
                          className="text-slate-600 hover:text-slate-900 p-1 rounded"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(renta.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Eliminar"
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

      {/* Modal Script Generator */}
      {showScriptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">
              📋 Script de Licencias Generado
            </h3>
            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <pre className="text-sm text-slate-800 whitespace-pre-wrap font-mono">
                {generateScript()}
              </pre>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={copyScript}
                className="flex-1 bg-slate-600 text-white py-3 px-4 rounded-lg hover:bg-slate-700 font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Script</span>
              </button>
              <button
                onClick={downloadScript}
                className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 font-medium transition-colors"
              >
                📥 Descargar Script
              </button>
              <button
                onClick={() => setShowScriptModal(false)}
                className="flex-1 bg-slate-300 text-slate-700 py-3 px-4 rounded-lg hover:bg-slate-400 font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear/editar licencia */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold text-slate-800 mb-6">
              {editingRenta ? '✏️ Editar Licencia' : '➕ Nueva Licencia'}
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Selección de herramienta */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Selecciona la herramienta
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {HERRAMIENTAS_DISPONIBLES.slice(0, -1).map((herramienta) => (
                    <label
                      key={herramienta.id}
                      className={`cursor-pointer border-2 rounded-lg p-3 transition-all ${
                        watchedTool === herramienta.id
                          ? 'border-slate-500 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        {...register('tipo_herramienta')}
                        type="radio"
                        value={herramienta.id}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="w-8 h-8 rounded mx-auto mb-2 flex items-center justify-center overflow-hidden bg-slate-100">
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
                    Usuario/Username
                  </label>
                  <input
                    {...register('usuario_login')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-slate-500 focus:border-slate-500 text-slate-900"
                    placeholder="leonardocontrerascelular"
                  />
                  {errors.usuario_login && (
                    <p className="text-sm text-red-600">{errors.usuario_login.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Contraseña
                  </label>
                  <input
                    {...register('password_actual')}
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-slate-500 focus:border-slate-500 text-slate-900"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-slate-500 focus:border-slate-500 text-slate-900"
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
                  className="flex-1 bg-slate-600 text-white py-3 px-4 rounded-md hover:bg-slate-700 font-medium transition-colors"
                >
                  {editingRenta ? '✅ Actualizar Licencia' : '➕ Crear Licencia'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingRenta(null)
                    reset()
                  }}
                  className="flex-1 bg-slate-300 text-slate-700 py-3 px-4 rounded-md hover:bg-slate-400 font-medium transition-colors"
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
              <div className="bg-slate-50 p-4 rounded-lg flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden bg-slate-100">
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-slate-500 focus:border-slate-500 text-slate-900"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-slate-500 focus:border-slate-500 text-slate-900"
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
                          ? 'border-slate-500 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
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
                        <span className="text-sm font-semibold text-slate-800">{duracion.texto}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Responsable */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Responsable (Opcional)
                </label>
                <select
                  value={selectedResponsible}
                  onChange={(e) => setSelectedResponsible(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-slate-500 focus:border-slate-500 text-slate-900"
                >
                  <option value="">Sin asignar</option>
                  {usuarios.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botones */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={startRent}
                  className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-md hover:bg-emerald-700 font-medium transition-colors"
                >
                  🚀 Iniciar Renta
                </button>
                <button
                  onClick={() => {
                    setShowRentModal(false)
                    setRentingLicense(null)
                  }}
                  className="flex-1 bg-slate-300 text-slate-700 py-3 px-4 rounded-md hover:bg-slate-400 font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 