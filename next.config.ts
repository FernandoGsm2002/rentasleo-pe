import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Configuración de external packages (movido desde experimental)
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],

  // Configuración experimental para Next.js 15.4.1
  experimental: {
    // Deshabilitar features que pueden causar 103 Early Hints
    ppr: false,
  },

  // Configuración del compilador
  compiler: {
    // Eliminar console.log en producción
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Configuración de headers globales
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ],
      },
      {
        // Headers específicos para dashboard
        source: '/dashboard/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, proxy-revalidate'
          },
          {
            key: 'CDN-Cache-Control',
            value: 'no-cache'
          },
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'no-cache'
          }
        ],
      }
    ]
  },

  // Configuración de redirects
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/',
        permanent: false,
      },
    ]
  },

  // Optimización de imágenes
  images: {
    domains: ['leope-staff.vercel.app'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Configuración para Vercel específica
  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  // Configuración de output para Vercel
  output: 'standalone',

  // Configuración de producción específica para Vercel
  ...(process.env.NODE_ENV === 'production' && {
    compress: true,
    poweredByHeader: false,
    generateEtags: false,
  }),
}

export default nextConfig
