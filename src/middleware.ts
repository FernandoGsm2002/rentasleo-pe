import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // BYPASS: No procesar archivos estáticos ni APIs
  if (
    pathname.startsWith('/_next/') || 
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname.startsWith('/auth/')
  ) {
    return NextResponse.next()
  }

  try {
    let response = NextResponse.next()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              response.cookies.set(name, value, {
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

    const { data: { user } } = await supabase.auth.getUser()

    // Si intenta acceder al dashboard sin usuario → redirigir a login
    if (pathname.startsWith('/dashboard') && !user) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Si tiene usuario y está en homepage → ir al dashboard
    if (user && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response

  } catch (error) {
    console.error('❌ [Middleware] Error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',],
} 