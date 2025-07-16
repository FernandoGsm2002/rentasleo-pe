import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Agregar headers de seguridad y CORS
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0
          })
        },
      },
      auth: {
        flowType: 'pkce'
      }
    }
  )

  // Solo verificar autenticación en rutas del dashboard
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    try {
      console.log('🔍 Verificando sesión para:', request.nextUrl.pathname)
      
      // Intentar obtener sesión con retry básico
      let session = null
      let attempts = 0
      const maxAttempts = 2
      
      while (attempts < maxAttempts && !session) {
        attempts++
        try {
          const { data: { session: sessionData }, error } = await supabase.auth.getSession()
          
          if (error) {
            console.warn(`⚠️ Error obteniendo sesión (intento ${attempts}):`, error.message)
            if (attempts >= maxAttempts) {
              throw error
            }
            // Esperar un poco antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 100))
            continue
          }
          
          session = sessionData
        } catch (err) {
          console.warn(`⚠️ Excepción obteniendo sesión (intento ${attempts}):`, err)
          if (attempts >= maxAttempts) {
            throw err
          }
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      if (!session) {
        // Usuario no autenticado, redirigir al login
        console.log('🚫 Usuario no autenticado, redirigiendo a login')
        const redirectUrl = new URL('/', request.url)
        redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Verificar que el token no haya expirado
      if (session.expires_at && Date.now() / 1000 > session.expires_at) {
        console.log('⏰ Token expirado, redirigiendo a login')
        const redirectUrl = new URL('/', request.url)
        redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Usuario autenticado, permitir acceso
      console.log('✅ Usuario autenticado, permitiendo acceso a:', request.nextUrl.pathname)
      console.log('👤 Usuario ID:', session.user.id)
      
    } catch (error) {
      console.error('❌ Error en middleware de autenticación:', error)
      // En caso de error, redirigir al login por seguridad
      const redirectUrl = new URL('/', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      redirectUrl.searchParams.set('error', 'auth_error')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 