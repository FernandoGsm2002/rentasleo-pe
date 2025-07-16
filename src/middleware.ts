import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Solo aplicar middleware a rutas del dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // Por simplicidad, permitimos acceso a todas las rutas del dashboard
    // La verificación de roles se hace en el lado del cliente
    return response
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*']
} 