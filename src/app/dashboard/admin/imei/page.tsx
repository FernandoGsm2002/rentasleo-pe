'use client'

// Deshabilitar prerenderizado para esta página
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { ImeiJustificado, Usuario } from '@/types/supabase'
import { 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  ExternalLink,
  Copy
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const imeiSchema = z.object({
  imei: z.string().min(15, 'IMEI debe tener al menos 15 caracteres').max(17, 'IMEI muy largo'),
  modelo_descripcion: z.string().min(1, 'Descripción requerida'),
  modelo_nombre: z.string().min(1, 'Nombre del modelo requerido'),
  modelo_mercado: z.string().optional(),
  codigo_modelo: z.string().optional(),
  memoria: z.string().optional(),
  serial: z.string().optional(),
  estado_osiptel: z.enum(['apto', 'no_apto', 'pendiente']).optional(),
  usuario_procesado_id: z.string().optional(),
  notas: z.string().optional(),
})

type ImeiFormData = z.infer<typeof imeiSchema>

interface ImeiConUsuario extends ImeiJustificado {
  usuario_procesado?: Usuario | null
}

export default function ImeiAdmin() {
  const [imeis, setImeis] = useState<ImeiConUsuario[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingImei, setEditingImei] = useState<ImeiJustificado | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createSupabaseBrowserClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<ImeiFormData>({
    resolver: zodResolver(imeiSchema),
  })

  const watchedImei = watch('imei')

  useEffect(() => {
    loadImeis()
    loadUsuarios()
  }, [])

  const loadImeis = async () => {
    try {
      const { data, error } = await supabase
        .from('imei_justificado')
        .select(`
          *,
          usuario_procesado:usuarios(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setImeis(data || [])
    } catch (error) {
      console.error('Error cargando IMEIs:', error)
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

  const parseImeiInfo = (input: string) => {
    const lines = input.trim().split('\n')
    const result: Partial<ImeiFormData> = {}
    
    // Detectar IMEI: 15 dígitos que empiecen con 86, 35 o 01
    const imeiRegex = /\b(86|35|01)\d{13}\b/g
    // Fallback: cualquier número de 15 dígitos
    const generalImeiRegex = /\b\d{15}\b/g
    
    // Función para extraer IMEI de una línea
    const extractImei = (text: string) => {
      // Primero buscar IMEIs que empiecen con 86, 35 o 01
      const specificMatch = text.match(imeiRegex)
      if (specificMatch) return specificMatch[0]
      
      // Si no encuentra, buscar cualquier 15 dígitos
      const generalMatch = text.match(generalImeiRegex)
      if (generalMatch) return generalMatch[0]
      
      return null
    }
    
    lines.forEach((line, index) => {
      const cleanLine = line.trim()
      const lowerLine = cleanLine.toLowerCase()
      
      // Primero intentar extraer IMEI de cualquier línea
      if (!result.imei) {
        const detectedImei = extractImei(cleanLine)
        if (detectedImei) {
          result.imei = detectedImei
        }
      }
      
      // Formato 1: Con etiquetas específicas
      if (lowerLine.includes('marca:')) {
        const marca = line.split(':')[1]?.trim()
        result.modelo_descripcion = marca || ''
      } else if (lowerLine.includes('nombre del tlf') || lowerLine.includes('nombre del telefono') || (lowerLine.includes('nombre:') && !lowerLine.includes('del tlf'))) {
        result.modelo_nombre = line.split(':')[1]?.trim()
      } else if (lowerLine.includes('imei:') || lowerLine.includes('imei ')) {
        const imeiPart = line.split(/imei:?\s*/i)[1]?.trim()
        if (imeiPart) {
          const extractedImei = extractImei(imeiPart)
          if (extractedImei) result.imei = extractedImei
        }
      } else if (lowerLine.includes('modelo:') || lowerLine.includes('model code:') || lowerLine.includes('model number:')) {
        result.codigo_modelo = line.split(':')[1]?.trim()
      } else if (lowerLine.includes('origen:') || lowerLine.includes('serie:') || lowerLine.includes('sn:') || lowerLine.includes('serial number:')) {
        result.serial = line.split(':')[1]?.trim()
      } else if (lowerLine.startsWith('origen ') && !lowerLine.includes(':')) {
        result.serial = line.substring(6).trim()
      }
      
      // Detectar nombres de modelo más flexibles
      else if (lowerLine.includes('model name:') || lowerLine.includes('sku name:') || lowerLine.includes('model full description:')) {
        const modelName = line.split(':')[1]?.trim()
        if (modelName && !result.modelo_nombre) {
          result.modelo_nombre = modelName
          // Extraer marca de la primera palabra si no la tenemos
          if (!result.modelo_descripcion) {
            const firstWord = modelName.split(' ')[0]
            result.modelo_descripcion = firstWord
          }
        }
      }
      
      // Formato 2: Sin etiquetas (primera línea como nombre del dispositivo)
      else if (index === 0 && !lowerLine.includes(':') && !extractImei(cleanLine)) {
        result.modelo_nombre = cleanLine
        const firstWord = cleanLine.split(' ')[0]
        result.modelo_descripcion = firstWord
      }
      
      // Detectar códigos de modelo por patrones
      else if (cleanLine.match(/^[A-Z]{2,}-[A-Z0-9]+/) || cleanLine.match(/^[A-Z]+\d+[A-Z]*\d*$/)) {
        if (!result.codigo_modelo) {
          result.codigo_modelo = cleanLine
        }
      }
      
      // Detectar seriales por patrones (evitar IMEIs)
      else if (cleanLine.length > 8 && cleanLine.length < 20 && cleanLine.match(/^[A-Z0-9\/]+$/) && !extractImei(cleanLine)) {
        if (!result.serial) {
          result.serial = cleanLine
        }
      }
      
      // Para compatibilidad con formato anterior
      else if (line.includes('Model Description:')) {
        result.modelo_descripcion = line.split('Model Description:')[1]?.trim()
      } else if (line.includes('Model Name:')) {
        result.modelo_nombre = line.split('Model Name:')[1]?.trim()
      } else if (line.includes('Market Model:')) {
        result.modelo_mercado = line.split('Market Model:')[1]?.trim()
      } else if (line.includes('Model Code:')) {
        result.codigo_modelo = line.split('Model Code:')[1]?.trim()
      } else if (line.includes('Memory:')) {
        result.memoria = line.split('Memory:')[1]?.trim()
      } else if (line.includes('IMEI:')) {
        result.imei = line.split('IMEI:')[1]?.trim()
      } else if (line.includes('Serial:')) {
        result.serial = line.split('Serial:')[1]?.trim()
      }
    })

    return result
  }

  const handleParseInfo = () => {
    const modeloDescripcion = watch('modelo_descripcion')
    if (modeloDescripcion) {
      const parsed = parseImeiInfo(modeloDescripcion)
      Object.entries(parsed).forEach(([key, value]) => {
        if (value) {
          setValue(key as keyof ImeiFormData, value)
        }
      })
    }
  }

  const [pendingImeiData, setPendingImeiData] = useState<ImeiFormData | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const onSubmit = async (data: ImeiFormData) => {
    if (editingImei) {
      // Si estamos editando, guardar directamente
      await saveImeiData(data)
    } else {
      // Si es nuevo, primero verificar en OSIPTEL
      setPendingImeiData(data)
      setShowModal(false)
      
      // Copiar IMEI al clipboard
      if (data.imei) {
        try {
          await navigator.clipboard.writeText(data.imei)
          console.log('IMEI copiado al clipboard:', data.imei)
        } catch (error) {
          console.error('Error copiando IMEI:', error)
        }
      }
      
      // Abrir OSIPTEL en nueva ventana
      const osiptelUrl = 'https://checatuimei.renteseg.osiptel.gob.pe/consultaIMEI.xhtml'
      window.open(osiptelUrl, '_blank')
      
      // Mostrar modal de confirmación
      setShowConfirmModal(true)
    }
  }

  const saveImeiData = async (data: ImeiFormData) => {
    try {
      const imeiData = {
        ...data,
        monto_cobrado: 140, // Monto fijo de 140 soles
        usuario_procesado_id: data.usuario_procesado_id || null,
        fecha_verificacion: data.estado_osiptel !== 'pendiente' ? new Date().toISOString().split('T')[0] : null
      }

      if (editingImei) {
        const { error } = await supabase
          .from('imei_justificado')
          .update(imeiData)
          .eq('id', editingImei.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('imei_justificado')
          .insert(imeiData)

        if (error) throw error
      }

      setShowModal(false)
      setEditingImei(null)
      reset()
      loadImeis()
    } catch (error) {
      console.error('Error guardando IMEI:', error)
    }
  }

  const handleOsiptelConfirmation = async (isJustified: boolean) => {
    if (!pendingImeiData) return

    const finalData: ImeiFormData = {
      ...pendingImeiData,
      estado_osiptel: isJustified ? ('apto' as const) : ('no_apto' as const)
    }

    if (isJustified) {
      await saveImeiData(finalData)
    }

    setShowConfirmModal(false)
    setPendingImeiData(null)
  }

  const copyDeviceInfoWithWhitelist = async (imei: ImeiConUsuario) => {
    try {
      // Usar el texto original completo de modelo_descripcion + agregar estado de lista blanca
      const originalText = imei.modelo_descripcion || ''
      const finalText = `${originalText}
IMEI NO SE ENCUENTRA EN LISTA BLANCA✅`

      await navigator.clipboard.writeText(finalText.trim())
      
      // Mostrar notificación temporal (opcional)
      alert('✅ Información copiada al clipboard con estado de lista blanca')
    } catch (error) {
      console.error('Error copiando información:', error)
      alert('❌ Error al copiar la información')
    }
  }

  const handleEdit = (imei: ImeiJustificado) => {
    setEditingImei(imei)
    setValue('imei', imei.imei)
    setValue('modelo_descripcion', imei.modelo_descripcion)
    setValue('modelo_nombre', imei.modelo_nombre)
    setValue('modelo_mercado', imei.modelo_mercado || '')
    setValue('codigo_modelo', imei.codigo_modelo || '')
    setValue('memoria', imei.memoria || '')
    setValue('serial', imei.serial || '')
    setValue('estado_osiptel', imei.estado_osiptel || 'pendiente')

    setValue('usuario_procesado_id', imei.usuario_procesado_id || '')
    setValue('notas', imei.notas || '')
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este IMEI?')) return

    try {
      const { error } = await supabase
        .from('imei_justificado')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadImeis()
    } catch (error) {
      console.error('Error eliminando IMEI:', error)
    }
  }

  const filteredImeis = imeis.filter(imei =>
    imei.imei.includes(searchTerm) ||
    imei.modelo_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    imei.modelo_descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (estado: string | null) => {
    switch (estado) {
      case 'apto': return 'bg-green-100 text-green-800'
      case 'no_apto': return 'bg-red-100 text-red-800'
      case 'pendiente': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (estado: string | null) => {
    switch (estado) {
      case 'apto': return <CheckCircle className="w-4 h-4" />
      case 'no_apto': return <XCircle className="w-4 h-4" />
      case 'pendiente': return <Clock className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📱 IMEI Justificado</h1>
          <p className="text-gray-600">Gestión de dispositivos procesados con verificación OSIPTEL</p>
        </div>
        <button
          onClick={() => {
            setEditingImei(null)
            reset()
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo IMEI</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por IMEI, modelo o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: imeis.length, color: 'bg-blue-500' },
          { label: 'Aptos', value: imeis.filter(i => i.estado_osiptel === 'apto').length, color: 'bg-green-500' },
          { label: 'No Aptos', value: imeis.filter(i => i.estado_osiptel === 'no_apto').length, color: 'bg-red-500' },
          { label: 'Pendientes', value: imeis.filter(i => i.estado_osiptel === 'pendiente').length, color: 'bg-yellow-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className={`${stat.color} w-3 h-3 rounded-full mr-3`}></div>
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* IMEIs Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            IMEIs Registrados ({filteredImeis.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IMEI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dispositivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado OSIPTEL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Procesado por
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredImeis.map((imei) => (
                <tr key={imei.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {imei.imei}
                    </div>
                    <div className="text-sm text-gray-500">
                      {imei.serial && `Serial: ${imei.serial}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {imei.modelo_nombre}
                    </div>
                    <div className="text-sm text-gray-500">
                      {imei.modelo_mercado || imei.codigo_modelo}
                    </div>
                    {imei.memoria && (
                      <div className="text-sm text-gray-500">
                        {imei.memoria}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(imei.estado_osiptel)}`}>
                        {getStatusIcon(imei.estado_osiptel)}
                        <span className="ml-1 capitalize">
                          {imei.estado_osiptel || 'pendiente'}
                        </span>
                      </span>
                    </div>
                    {imei.estado_osiptel !== 'pendiente' && (
                      <a
                        href={`https://consultaimei.osiptel.gob.pe/Consulta_IMEI/views/consulta.xhtml`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs flex items-center mt-1"
                      >
                        Verificar en OSIPTEL <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {imei.usuario_procesado?.nombre || 'No asignado'}
                    </div>
                    {imei.fecha_verificacion && (
                      <div className="text-sm text-gray-500">
                        {new Date(imei.fecha_verificacion).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${imei.monto_cobrado.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {imei.estado_osiptel === 'apto' && (
                        <button
                          onClick={() => copyDeviceInfoWithWhitelist(imei)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title="Copiar información con estado de lista blanca"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(imei)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Editar IMEI"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(imei.id)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Eliminar IMEI"
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingImei ? 'Editar IMEI' : 'Nuevo IMEI'}
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📱 Información del Dispositivo
                </label>

                                  <textarea
                    {...register('modelo_descripcion')}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm text-gray-900 placeholder-gray-500"
                    placeholder="Pega la información del dispositivo:&#10;&#10;Marca: Honor&#10;Nombre del tlf: X7B&#10;Imei: 864414074675206&#10;Modelo: CLK-LX3&#10;Origen: AM4U9X4904G06824&#10;&#10;o formato simple:&#10;Samsung S24 ultra&#10;351123965542967&#10;SM-S928BZKKTPA&#10;Serie RFCXA1533XA"
                  />
                <button
                  type="button"
                  onClick={handleParseInfo}
                  className="mt-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 text-sm font-medium transition-colors"
                >
                  🔄 Extraer información automáticamente
                </button>
                {errors.modelo_descripcion && (
                  <p className="text-sm text-red-600 mt-1">{errors.modelo_descripcion.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IMEI
                  </label>
                  <input
                    {...register('imei')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="353299486335368"
                  />
                  {errors.imei && (
                    <p className="text-sm text-red-600">{errors.imei.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo
                  </label>
                  <input
                    {...register('modelo_nombre')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Infinix X678B"
                  />
                  {errors.modelo_nombre && (
                    <p className="text-sm text-red-600">{errors.modelo_nombre.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo de Mercado
                  </label>
                  <input
                    {...register('modelo_mercado')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Infinix NOTE 30 Pro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código del Modelo
                  </label>
                  <input
                    {...register('codigo_modelo')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="X678B"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Memoria
                  </label>
                  <input
                    {...register('memoria')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="256+8 GB"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial
                  </label>
                  <input
                    {...register('serial')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="10269253BU000578"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Procesado por
                </label>
                <select
                  {...register('usuario_procesado_id')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Seleccionar usuario</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas (Opcional)
                </label>
                                  <input
                    {...register('notas')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Información adicional del dispositivo..."
                  />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  {editingImei ? '✅ Actualizar IMEI' : '🔍 Verificar en OSIPTEL'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingImei(null)
                    reset()
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación OSIPTEL */}
      {showConfirmModal && pendingImeiData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-medium text-gray-900 mb-4">
              🔍 Verificación OSIPTEL
            </h3>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-blue-900 mb-2">IMEI a verificar:</h4>
              <p className="text-blue-800 font-mono">{pendingImeiData.imei}</p>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Dispositivo:</strong> {pendingImeiData.modelo_descripcion} {pendingImeiData.modelo_nombre}
              </p>
              <div className="mt-2 text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                ✅ IMEI copiado al clipboard - Solo pégalo en OSIPTEL
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700">
                Se ha abierto la página de OSIPTEL para verificar el IMEI. 
                Después de consultar, ¿el IMEI tiene <strong>motivo justificado</strong>?
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleOsiptelConfirmation(true)}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>✅ SÍ - Justificado</span>
                </button>
                <button
                  onClick={() => handleOsiptelConfirmation(false)}
                  className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <XCircle className="w-5 h-5" />
                  <span>❌ NO - Rechazar</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setPendingImeiData(null)
                  setShowModal(true) // Volver al modal principal
                }}
                className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                🔙 Volver al formulario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 