import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  
  console.log('🌐 [MIDDLEWARE] Procesando:', pathname)
  
  // BYPASS: No procesar archivos estáticos, APIs, ni auth callbacks
  if (
    pathname.startsWith('/_next/') || 
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname.startsWith('/auth/') ||
    pathname === '/favicon.ico'
  ) {
    console.log('⚪ [MIDDLEWARE] Bypass:', pathname)
    return NextResponse.next()
  }

  // Prevenir loops de redirección verificando headers
  const userAgent = request.headers.get('user-agent') || ''
  const isBot = userAgent.includes('bot') || userAgent.includes('crawler')
  
  if (isBot) {
    console.log('🤖 [MIDDLEWARE] Bot detectado, bypass')
    return NextResponse.next()
  }

  try {
    let response = NextResponse.next()

    // Timeout para operaciones de auth en middleware
    const authTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Auth timeout en middleware')), 2000)
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
              response.cookies.set(name, value, {
                ...options,
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 días
                path: '/',
              })
            })
          },
        },
      }
    )

    // Obtener usuario con timeout
    const authPromise = supabase.auth.getUser()
    const { data: { user } } = await Promise.race([authPromise, authTimeout]) as any

    console.log('👤 [MIDDLEWARE] Usuario:', user ? 'Autenticado' : 'No autenticado', 'Path:', pathname)

    // Rutas protegidas - requieren autenticación
    if (pathname.startsWith('/dashboard')) {
      if (!user) {
        console.log('🔒 [MIDDLEWARE] Redirigiendo a login desde:', pathname)
        const redirectUrl = new URL('/', request.url)
        if (pathname !== '/dashboard') {
          redirectUrl.searchParams.set('redirect', pathname + search)
        }
        return NextResponse.redirect(redirectUrl)
      }
    }

    // Homepage con usuario autenticado → ir al dashboard
    if (user && pathname === '/') {
      const redirectParam = request.nextUrl.searchParams.get('redirect')
      if (redirectParam && redirectParam.startsWith('/dashboard')) {
        console.log('🎯 [MIDDLEWARE] Redirigiendo a redirect param:', redirectParam)
        return NextResponse.redirect(new URL(redirectParam, request.url))
      } else {
        console.log('🏠 [MIDDLEWARE] Redirigiendo a dashboard')
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    console.log('✅ [MIDDLEWARE] Permitiendo acceso a:', pathname)
    return response

  } catch (error) {
    console.error('❌ [MIDDLEWARE] Error:', error)
    // En caso de error, permitir el acceso pero loggear
    console.log('🚨 [MIDDLEWARE] Error, permitiendo acceso sin validación')
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',],
} 