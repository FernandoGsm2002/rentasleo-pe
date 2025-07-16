import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Configuración experimental para Next.js 15.4.1
  experimental: {
    // Mejorar performance de compilación
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    // Optimizar para Vercel
    serverComponentsExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
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
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
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

  // Configuración de webpack
  webpack: (config, { isServer }) => {
    // Resolver problemas con Supabase en el servidor
    if (isServer) {
      config.externals.push({
        '@supabase/ssr': '@supabase/ssr',
        '@supabase/supabase-js': '@supabase/supabase-js'
      })
    }

    // Optimizar bundles
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        supabase: {
          test: /[\\/]node_modules[\\/]@supabase[\\/]/,
          name: 'supabase',
          chunks: 'all',
        },
      },
    }

    return config
  },

  // Configuración de variables de entorno
  env: {
    CUSTOM_KEY: 'vercel-production',
  },

  // Configurar páginas que pueden causar problemas de SSR
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Configuración de desarrollo
  ...(process.env.NODE_ENV === 'development' && {
    devIndicators: {
      buildActivity: true,
      buildActivityPosition: 'bottom-right',
    },
  }),

  // Configuración de producción específica para Vercel
  ...(process.env.NODE_ENV === 'production' && {
    compress: true,
    poweredByHeader: false,
    generateEtags: false,
  }),
}

export default nextConfig
