import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Crear respuesta que se puede modificar
  let supabaseResponse = NextResponse.next({
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
            request.cookies.set(name, value)
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // CRÍTICO: No escribir lógica entre createServerClient y getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rutas que requieren autenticación
  const protectedRoutes = ['/dashboard']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Si no hay usuario y está intentando acceder a ruta protegida
  if (!user && isProtectedRoute) {
    const redirectUrl = new URL('/', request.url)
    // Preservar el parámetro redirect
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Si hay usuario y está en la página de login, redirigir al dashboard
  if (user && pathname === '/') {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard'
    const redirectUrl = new URL(redirectTo, request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // CRÍTICO: Devolver supabaseResponse tal como está
  // Esto es esencial para mantener las cookies sincronizadas
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - archivos públicos (png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 