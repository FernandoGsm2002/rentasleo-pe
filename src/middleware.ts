import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  
  // BYPASS: Evitar procesamiento en rutas API y archivos estáticos
  if (
    pathname.startsWith('/api/') || 
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  try {
    // Crear respuesta base
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Configurar cookies con opciones optimizadas para producción
              const cookieOptions = {
                ...options,
                secure: process.env.NODE_ENV === 'production',
                httpOnly: false, // Para permitir acceso desde JavaScript
                sameSite: 'lax' as const,
                maxAge: 60 * 60 * 24 * 7, // 7 días
                path: '/',
              }
              
              response.cookies.set(name, value, cookieOptions)
            })
          },
        },
      }
    )

    // Obtener usuario
    const { data: { user }, error } = await supabase.auth.getUser()

    // Log para debugging en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [Middleware]', {
        path: pathname,
        user: user?.email || 'none',
        error: error?.message || 'none'
      })
    }

    // Definir rutas protegidas
    const protectedRoutes = ['/dashboard']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    
    // Definir rutas públicas
    const publicRoutes = ['/auth']
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    // CASO 1: Ruta protegida sin usuario → Login
    if (!user && isProtectedRoute) {
      const loginUrl = new URL('/', request.url)
      // Solo agregar redirect si no es la página principal
      if (pathname !== '/') {
        loginUrl.searchParams.set('redirect', pathname)
      }
      
      // Agregar headers anti-cache
      const redirectResponse = NextResponse.redirect(loginUrl)
      redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      redirectResponse.headers.set('Pragma', 'no-cache')
      redirectResponse.headers.set('Expires', '0')
      
      return redirectResponse
    }

    // CASO 2: Usuario autenticado en página principal → Dashboard
    if (user && pathname === '/') {
      const redirectTo = searchParams.get('redirect')
      
      // CRÍTICO: Evitar bucles de redirección
      let targetUrl = '/dashboard'
      
      if (redirectTo && 
          redirectTo !== '/' && 
          !redirectTo.includes('auth') &&
          redirectTo.startsWith('/')) {
        targetUrl = redirectTo
      }
      
      const dashboardUrl = new URL(targetUrl, request.url)
      
      // Agregar headers anti-cache
      const redirectResponse = NextResponse.redirect(dashboardUrl)
      redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      redirectResponse.headers.set('Pragma', 'no-cache')
      redirectResponse.headers.set('Expires', '0')
      
      return redirectResponse
    }

    // CASO 3: Todas las demás rutas → Continuar
    // Agregar headers anti-cache para rutas del dashboard
    if (pathname.startsWith('/dashboard')) {
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('X-Content-Type-Options', 'nosniff')
    }

    return response

  } catch (error) {
    console.error('❌ [Middleware] Error:', error)
    // En caso de error, continuar sin redirección
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes) 
     * - favicon.ico (favicon)
     * - archivos con extensión
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]*$).*)',
  ],
} 