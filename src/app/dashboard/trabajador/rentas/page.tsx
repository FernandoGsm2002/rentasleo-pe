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

export default function RentasTrabajador() {
  const { userData } = useAuth()
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
      console.log('📋 [RENTAS] Iniciando carga...')
      setLoading(true)
      
      // Timeout de 8 segundos para evitar carga infinita
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout cargando rentas')), 8000)
      })
      
      const dataPromise = supabase
        .from('rentas_herramientas')
        .select(`
          *,
          usuario_responsable:usuarios(*)
        `)
        .order('created_at', { ascending: false })

      const result = await Promise.race([dataPromise, timeoutPromise]) as any

      console.log('📋 [RENTAS] Respuesta recibida:', result.data?.length || 0, 'elementos')

      if (result.error) {
        console.error('❌ [RENTAS] Error en la consulta:', result.error)
        throw result.error
      }
      
      setRentas(result.data || [])
      console.log('✅ [RENTAS] Cargadas exitosamente')
      
    } catch (error: any) {
      console.error('❌ [RENTAS] Error:', error.message)
      
      // En caso de timeout, mostrar datos en caché si los hay
      if (error.message === 'Timeout cargando rentas' && rentas.length === 0) {
        console.warn('⚠️ [RENTAS] Timeout, intentando carga simple...')
        try {
          // Intento simple sin joins
          const { data } = await supabase
            .from('rentas_herramientas')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
          
          if (data) {
            setRentas(data)
            console.log('✅ [RENTAS] Carga simple exitosa:', data.length)
          }
        } catch (simpleError) {
          console.error('❌ [RENTAS] Error en carga simple:', simpleError)
        }
      }
      
    } finally {
      console.log('🏁 [RENTAS] Finalizando carga')
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
      const action = editingRenta ? 'update_license' : 'create_license'
      const payload = {
        action,
        ...(editingRenta && { id: editingRenta.id }),
        nombre_herramienta: data.usuario_login, // Usamos el username como nombre
        tipo_herramienta: data.tipo_herramienta,
        usuario_login: data.usuario_login,
        password_actual: data.password_actual
      }

      console.log('💾 [CLIENT] Guardando licencia:', action)
      
      const response = await fetch('/api/rentas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error guardando licencia')
      }

      console.log('✅ [CLIENT] Licencia guardada exitosamente')
      
      setShowModal(false)
      setEditingRenta(null)
      reset()
      loadRentas()
      
      addToast({
        type: 'success',
        title: editingRenta ? 'Licencia actualizada' : 'Licencia creada',
        message: `${data.usuario_login} guardado exitosamente`
      })
      
    } catch (error: any) {
      console.error('❌ [CLIENT] Error guardando licencia:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: error?.message || 'Error guardando licencia'
      })
    }
  }

  const startRent = async () => {
    // Validaciones básicas
    if (!rentingLicense) {
      console.error('❌ No hay licencia seleccionada')
      return
    }

    if (!selectedStartDate || !selectedStartTime) {
      addToast({
        type: 'warning',
        title: 'Campos requeridos',
        message: 'Por favor selecciona fecha y hora de inicio'
      })
      return
    }

    // Prevenir múltiples clicks
    if (submitting) {
      console.log('⚠️ Ya hay una operación en progreso')
      return
    }

    console.log('🚀 [CLIENT] Iniciando renta para:', rentingLicense.nombre_herramienta)
    setSubmitting(true)

    try {
      // Preparar datos
      const fechaInicio = new Date(`${selectedStartDate}T${selectedStartTime}`)
      const fechaFin = new Date(fechaInicio.getTime() + (selectedDuration * 60 * 60 * 1000))
      
      console.log('📅 [CLIENT] Fechas:', fechaInicio.toISOString(), '->', fechaFin.toISOString())

      // Llamar a la API route
      console.log('🌐 [CLIENT] Llamando API route...')
      const response = await fetch('/api/rentas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start_rent',
          id: rentingLicense.id,
          duracion_horas: selectedDuration,
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: fechaFin.toISOString(),
          usuario_responsable_id: selectedResponsible || null
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        console.error('❌ [CLIENT] Error de API:', result)
        throw new Error(result.error || 'Error en la API')
      }

      console.log('✅ [CLIENT] Renta iniciada exitosamente')

      // Cerrar modal y limpiar estado INMEDIATAMENTE
      setShowRentModal(false)
      setRentingLicense(null)
      setSelectedDuration(24)
      setSelectedResponsible('')
      setSelectedStartDate('')
      setSelectedStartTime('')

      // Mostrar toast de éxito
      addToast({
        type: 'success',
        title: '✅ Renta iniciada',
        message: `${rentingLicense.nombre_herramienta} está activa`
      })

      // Recargar datos
      console.log('🔄 [CLIENT] Recargando lista...')
      loadRentas()

    } catch (error: any) {
      console.error('❌ [CLIENT] Error en startRent:', error)
      
      addToast({
        type: 'error',
        title: 'Error al iniciar renta',
        message: error?.message || 'Error desconocido. Intenta nuevamente.'
      })
    } finally {
      console.log('🏁 [CLIENT] Limpiando estado')
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
      console.log('🗑️ [CLIENT] Eliminando licencia:', id)
      
      const response = await fetch('/api/rentas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete_license',
          id: id
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error eliminando licencia')
      }

      console.log('✅ [CLIENT] Licencia eliminada exitosamente')
      
      addToast({
        type: 'success',
        title: 'Licencia eliminada',
        message: 'La licencia fue eliminada correctamente'
      })
      
      loadRentas()
    } catch (error: any) {
      console.error('❌ [CLIENT] Error eliminando licencia:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: error?.message || 'Error eliminando licencia'
      })
    }
  }

  const stopRent = async (renta: RentaHerramienta) => {
    try {
      console.log('🛑 [CLIENT] Deteniendo renta:', renta.nombre_herramienta)
      
      const response = await fetch('/api/rentas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'stop_rent',
          id: renta.id
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error deteniendo renta')
      }

      console.log('✅ [CLIENT] Renta detenida exitosamente')
      
      addToast({
        type: 'success',
        title: 'Renta detenida',
        message: `${renta.nombre_herramienta} está ahora disponible`
      })
      
      loadRentas()
    } catch (error: any) {
      console.error('❌ [CLIENT] Error deteniendo renta:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: error?.message || 'Error deteniendo renta'
      })
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
  }).sort((a, b) => {
    // Ordenamiento por prioridad:
    // 1. En uso próximas a vencer (menos de 24 horas)
    // 2. En uso normales
    // 3. Vencidas
    // 4. Disponibles
    const statusA = getStatusText(a)
    const statusB = getStatusText(b)
    
    const getPriority = (renta: RentaHerramienta) => {
      const status = getStatusText(renta)
      if (status === 'En Uso') {
        const now = new Date()
        const fin = new Date(renta.fecha_fin)
        const hoursRemaining = (fin.getTime() - now.getTime()) / (1000 * 60 * 60)
        return hoursRemaining < 24 ? 1 : 2 // Próximas a vencer tienen prioridad 1
      }
      if (status === 'Vencida') return 3
      return 4 // Disponibles al final
    }
    
    const priorityA = getPriority(a)
    const priorityB = getPriority(b)
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }
    
    // Si tienen la misma prioridad, ordenar por fecha de fin (más próximas primero)
    if (statusA === 'En Uso' && statusB === 'En Uso') {
      return new Date(a.fecha_fin).getTime() - new Date(b.fecha_fin).getTime()
    }
    
    return 0
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando licencias...</p>
          <div className="mt-4 text-sm text-gray-500">
            Si esto tarda mucho,{' '}
            <button 
              onClick={() => window.location.reload()} 
              className="text-blue-600 hover:underline"
            >
              refrescar página
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
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
      <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-4">
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

      {/* Filtros por Estado - Reordenados por Prioridad */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Filtrar por Estado (ordenado por prioridad)</h3>
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
            onClick={() => setSelectedStatus('en_uso')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedStatus === 'en_uso' 
                ? 'bg-emerald-600 text-white' 
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
          >
            🟢 En Uso ({rentas.filter(r => getStatusText(r) === 'En Uso').length})
            {rentas.filter(r => {
              const status = getStatusText(r)
              if (status === 'En Uso') {
                const now = new Date()
                const fin = new Date(r.fecha_fin)
                const hoursRemaining = (fin.getTime() - now.getTime()) / (1000 * 60 * 60)
                return hoursRemaining < 24
              }
              return false
            }).length > 0 && (
              <span className="ml-1 text-xs bg-orange-500 text-white px-1 rounded-full animate-pulse">
                ⚠️ {rentas.filter(r => {
                  const status = getStatusText(r)
                  if (status === 'En Uso') {
                    const now = new Date()
                    const fin = new Date(r.fecha_fin)
                    const hoursRemaining = (fin.getTime() - now.getTime()) / (1000 * 60 * 60)
                    return hoursRemaining < 24
                  }
                  return false
                }).length} próximas a vencer
              </span>
            )}
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

      {/* Licencias - Vista Responsiva */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-slate-900">
            Licencias Disponibles ({filteredRentas.length})
          </h3>
          {/* Selector para seleccionar todo - Solo desktop */}
          <div className="hidden md:block">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedLicenses.size === filteredRentas.length && filteredRentas.length > 0}
                onChange={(e) => handleSelectAllLicenses(e.target.checked)}
                className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
              />
              <span className="text-sm text-slate-600">Seleccionar todas</span>
            </label>
          </div>
        </div>

        {/* Vista Desktop - Tabla */}
        <div className="hidden md:block overflow-x-auto">
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
                const status = getStatusText(renta)
                const isExpiringSoon = status === 'En Uso' && (() => {
                  const now = new Date()
                  const fin = new Date(renta.fecha_fin)
                  const hoursRemaining = (fin.getTime() - now.getTime()) / (1000 * 60 * 60)
                  return hoursRemaining < 24
                })()
                
                return (
                  <tr key={renta.id} className={`hover:bg-slate-50 ${isExpiringSoon ? 'bg-orange-50 border-l-4 border-orange-400' : ''}`}>
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
                          <h4 className="font-medium text-slate-900 flex items-center">
                            {renta.nombre_herramienta}
                            {isExpiringSoon && (
                              <span className="ml-2 text-orange-600 animate-pulse">⚠️</span>
                            )}
                          </h4>
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
                          {status}
                          {isExpiringSoon && (
                            <span className="ml-1 text-orange-600">⏰</span>
                          )}
                        </span>
                        {renta.activa && (
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${duracionInfo.color}`}>
                              ⏱️ {duracionInfo.texto}
                            </span>
                            {status === 'En Uso' && (
                              <div className="text-xs text-slate-600 mt-1">
                                <Timer className="w-3 h-3 inline mr-1" />
                                Fin: {new Date(renta.fecha_fin).toLocaleString()}
                              </div>
                            )}
                            {status === 'Vencida' && (
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

        {/* Vista Móvil - Cards */}
        <div className="md:hidden divide-y divide-slate-200">
          {filteredRentas.map((renta) => {
            const herramientaInfo = getHerramientaInfo(renta.tipo_herramienta)
            const duracionInfo = getDuracionInfo(renta.duracion_horas)
            const status = getStatusText(renta)
            const isExpiringSoon = status === 'En Uso' && (() => {
              const now = new Date()
              const fin = new Date(renta.fecha_fin)
              const hoursRemaining = (fin.getTime() - now.getTime()) / (1000 * 60 * 60)
              return hoursRemaining < 24
            })()
            
            return (
              <div key={renta.id} className={`p-4 ${isExpiringSoon ? 'bg-orange-50 border-l-4 border-orange-400' : ''}`}>
                {/* Header de la card */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedLicenses.has(renta.id)}
                      onChange={(e) => handleLicenseSelection(renta.id, e.target.checked)}
                      className="rounded border-slate-300 text-slate-600 focus:ring-slate-500 mt-1"
                    />
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden bg-slate-100">
                      {herramientaInfo.imagen ? (
                        <Image
                          src={herramientaInfo.imagen}
                          alt={herramientaInfo.nombre}
                          width={48}
                          height={48}
                          className="w-12 h-12 object-contain rounded-lg"
                        />
                      ) : (
                        <div className={`w-full h-full ${herramientaInfo.color} rounded-lg flex items-center justify-center`}>
                          <Wrench className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 flex items-center">
                        {herramientaInfo.nombre}
                        {isExpiringSoon && (
                          <span className="ml-2 text-orange-600 animate-pulse">⚠️</span>
                        )}
                      </h4>
                      <p className="text-sm text-slate-600">{renta.nombre_herramienta}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {!renta.activa ? (
                      <button
                        onClick={() => handleRent(renta)}
                        className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50"
                        title="Iniciar renta"
                      >
                        <Play className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => stopRent(renta)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                        title="Detener renta"
                      >
                        <Pause className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(renta)}
                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-50"
                      title="Editar licencia"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(renta.id)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                      title="Eliminar licencia"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Credenciales */}
                <div className="bg-slate-50 rounded-lg p-3 mb-3">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <span className="mr-2">👤</span>
                      <span className="font-medium text-slate-700">Usuario:</span>
                      <span className="ml-2 font-mono text-slate-900">{renta.usuario_login}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="mr-2">🔑</span>
                      <span className="font-medium text-slate-700">Password:</span>
                      <span className="ml-2 font-mono text-slate-900">{renta.password_actual}</span>
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
                </div>

                {/* Estado y detalles */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(renta)}`}>
                      {status}
                      {isExpiringSoon && (
                        <span className="ml-1 text-orange-600">⏰</span>
                      )}
                    </span>
                    {renta.activa && renta.duracion_horas > 0 && (
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${duracionInfo.color}`}>
                        <Timer className="w-3 h-3 mr-1" />
                        {duracionInfo.texto}
                      </span>
                    )}
                  </div>
                  
                  {renta.activa && (
                    <div className="text-xs text-slate-600">
                      <Timer className="w-3 h-3 inline mr-1" />
                      Hasta: {new Date(renta.fecha_fin).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                  
                  <div className="text-xs text-slate-600">
                    <span className="font-medium">Responsable:</span> {renta.usuario_responsable?.nombre || 'Sin asignar'}
                  </div>
                  
                  <div className="text-xs text-slate-600">
                    📧 leonardocontreras1020@gmail.com
                  </div>
                  
                  {status === 'Vencida' && (
                    <button
                      onClick={() => handleExpiredRent(renta)}
                      className="w-full mt-2 bg-red-100 text-red-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                    >
                      ⚠️ Acción requerida - Cambiar contraseña
                    </button>
                  )}
                </div>
              </div>
            )
          })}
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
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-md hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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