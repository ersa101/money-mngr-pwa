'use client'

import { useDbStatus } from '@/contexts/DbContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { usePathname } from 'next/navigation'

export function AppContent({ children }: { children: React.ReactNode }) {
  const { isReady, hasDb } = useDbStatus()
  const { expanded } = useSidebar()
  const pathname = usePathname()

  // Login page: no sidebar/header offsets
  if (pathname === '/login') {
    return <>{children}</>
  }

  const wrapClass = `pt-14 md:pt-16 pb-20 md:pb-0 transition-all duration-200 ${
    expanded ? 'md:ml-56' : 'md:ml-16'
  }`

  if (!isReady) {
    return (
      <div className={`${wrapClass} flex items-center justify-center min-h-screen bg-gray-50`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!hasDb) {
    return (
      <div className={`${wrapClass} flex items-center justify-center min-h-screen bg-gray-50`}>
        <div className="text-center">
          <p className="text-gray-500">Please sign in to continue.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={wrapClass}>
      {children}
    </div>
  )
}
