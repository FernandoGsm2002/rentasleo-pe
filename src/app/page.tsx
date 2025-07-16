'use client'

import dynamic from 'next/dynamic'

// Deshabilitar SSR para toda la página
const DynamicHomePage = dynamic(() => import('@/components/HomePage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
})

export default function Home() {
  return <DynamicHomePage />
}
