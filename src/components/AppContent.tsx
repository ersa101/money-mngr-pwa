'use client'

import { useDbStatus } from '@/contexts/DbContext'
import { usePathname } from 'next/navigation'

export function AppContent({ children }: { children: React.ReactNode }) {
  const { isReady, hasDb } = useDbStatus()
  const pathname = usePathname()

  // Login page doesn't need database
  if (pathname === '/login') {
    return <>{children}</>
  }

  // Show loading while database is initializing
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated and not on login page, middleware will redirect
  // But just in case, show a message
  if (!hasDb && pathname !== '/login') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please sign in to continue.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
