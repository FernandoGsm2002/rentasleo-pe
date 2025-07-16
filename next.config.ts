import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Optimización para SSR con cookies
    serverComponentsExternalPackages: ['@supabase/ssr']
  },
  // Optimizaciones para producción
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
  },
  // Headers de seguridad para cookies
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
