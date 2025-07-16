'use client'

import Link from 'next/link'
import { AlertCircle, Home } from 'lucide-react'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Error de Autenticación
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Hubo un problema al procesar tu inicio de sesión. Por favor, intenta nuevamente.
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <Link
            href="/"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Home className="h-4 w-4 mr-2" />
            Volver al Inicio
          </Link>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Si el problema persiste, contacta al administrador del sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 