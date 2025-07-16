import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración de external packages para Supabase
  serverExternalPackages: ['@supabase/ssr'],
  
  // Headers de seguridad y cache control
  async headers() {
    return [
      {
        // Aplicar headers a todas las rutas del dashboard
        source: '/dashboard/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires', 
            value: '0'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      },
      {
        // Headers para API routes
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }
        ]
      }
    ]
  },

  // Optimizaciones para producción (swcMinify habilitado por defecto en Next.js 15)
  
  // Configuración de imágenes
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'development'
  },

  // Evitar problemas de cache en desarrollo
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 60 * 1000,
      pagesBufferLength: 2,
    }
  }),

  // Configuración de redirects para manejar auth
  async redirects() {
    return [
      // Redirigir /login a / (usamos la página principal como login)
      {
        source: '/login',
        destination: '/',
        permanent: false,
      }
    ];
  },

  // Configuración de rewrites si es necesario
  async rewrites() {
    return [
      // Mantener compatibilidad con rutas legacy si las hay
      {
        source: '/auth/:path*',
        destination: '/api/auth/:path*',
      }
    ];
  },

  // Configuración de compresión
  compress: true,
  
  // Configuración de generación estática
  trailingSlash: false,
  
  // Configuración de PoweredByHeader
  poweredByHeader: false,

  // Configuración de ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Configuración de TypeScript
  typescript: {
    ignoreBuildErrors: false,
  }
};

export default nextConfig;
