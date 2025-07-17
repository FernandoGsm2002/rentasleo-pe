'use client'

import { useState } from 'react'
import { Copy, Download, Trash2, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

export default function ScriptWebTrabajador() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [processing, setProcessing] = useState(false)
  const { addToast } = useToast()

  // Función para formatear las credenciales
  const formatCredentials = (text: string): string => {
    if (!text.trim()) return ''

    try {
      // Dividir por líneas y procesar cada una
      const lines = text.split('\n')
      const results: string[] = []

      let currentUsername = ''
      let currentPassword = ''

      for (let line of lines) {
        line = line.trim()
        if (!line) continue

        // Buscar username con diferentes formatos
        const usernamePatterns = [
          /username[=:>]+([^\s]+)/i,
          /user[=:>]+([^\s]+)/i,
          /login[=:>]+([^\s]+)/i
        ]

        // Buscar password con diferentes formatos
        const passwordPatterns = [
          /password[=:>]+([^\s]+)/i,
          /pass[=:>]+([^\s]+)/i,
          /pwd[=:>]+([^\s]+)/i
        ]

        // Buscar username
        for (const pattern of usernamePatterns) {
          const match = line.match(pattern)
          if (match) {
            currentUsername = match[1]
            break
          }
        }

        // Buscar password
        for (const pattern of passwordPatterns) {
          const match = line.match(pattern)
          if (match) {
            currentPassword = match[1]
            break
          }
        }

        // Si tenemos tanto username como password en la misma línea o hemos completado un par
        if (currentUsername && currentPassword) {
          results.push(`username=>${currentUsername}password=>${currentPassword}`)
          currentUsername = ''
          currentPassword = ''
        }
      }

      return results.join('\n')
    } catch (error) {
      console.error('Error formateando credenciales:', error)
      return 'Error procesando el texto'
    }
  }

  const handleFormat = () => {
    if (!inputText.trim()) {
      addToast({
        type: 'warning',
        title: 'Texto vacío',
        message: 'Por favor ingresa texto para formatear'
      })
      return
    }

    setProcessing(true)
    
    setTimeout(() => {
      const formatted = formatCredentials(inputText)
      setOutputText(formatted)
      setProcessing(false)
      
      if (formatted) {
        addToast({
          type: 'success',
          title: 'Formateo completado',
          message: `Se procesaron ${formatted.split('\n').filter(l => l.trim()).length} credenciales`
        })
      } else {
        addToast({
          type: 'warning',
          title: 'Sin resultados',
          message: 'No se encontraron credenciales válidas en el texto'
        })
      }
    }, 500)
  }

  const copyToClipboard = async () => {
    if (!outputText) {
      addToast({
        type: 'warning',
        title: 'Sin contenido',
        message: 'No hay texto formateado para copiar'
      })
      return
    }

    try {
      await navigator.clipboard.writeText(outputText)
      addToast({
        type: 'success',
        title: 'Copiado',
        message: 'Texto copiado al clipboard'
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'No se pudo copiar al clipboard'
      })
    }
  }

  const downloadFile = () => {
    if (!outputText) {
      addToast({
        type: 'warning',
        title: 'Sin contenido',
        message: 'No hay texto formateado para descargar'
      })
      return
    }

    const blob = new Blob([outputText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `credenciales_web_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addToast({
      type: 'success',
      title: 'Descargado',
      message: 'Archivo descargado exitosamente'
    })
  }

  const clearAll = () => {
    setInputText('')
    setOutputText('')
    addToast({
      type: 'info',
      title: 'Limpiado',
      message: 'Campos limpiados'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">🔧 Script Añadir Web</h1>
          <p className="text-slate-600">one click</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={clearAll}
            className="bg-slate-500 text-white px-4 py-2 rounded-lg hover:bg-slate-600 flex items-center space-x-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Limpiar</span>
          </button>
        </div>
      </div>



      {/* Área de trabajo principal */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Formatear Credenciales</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                📥 Texto Original
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Pega aquí "
                className="w-full h-80 p-4 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm text-slate-900"
              />
              <div className="mt-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <span className="text-sm text-slate-500">
                  {inputText.length} caracteres
                </span>
                <button
                  onClick={handleFormat}
                  disabled={processing || !inputText.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors w-full sm:w-auto"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Formatear</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Output */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                📤 Resultado para Web
              </label>
              <textarea
                value={outputText}
                readOnly
                placeholder="El resultado formateado aparecerá aquí...\n\nListo para copiar y pegar en páginas web."
                className="w-full h-80 p-4 border border-slate-300 rounded-lg bg-slate-50 resize-none font-mono text-sm text-slate-900"
              />
              <div className="mt-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <span className="text-sm text-slate-500">
                  {outputText ? `${outputText.split('\n').filter(l => l.trim()).length} credenciales` : 'Sin resultados'}
                </span>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={copyToClipboard}
                    disabled={!outputText}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </button>
                  <button
                    onClick={downloadFile}
                    disabled={!outputText}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  )
} 