'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useDbStatus } from '@/contexts/DbContext'
import { usePathname } from 'next/navigation'
import { pullFromCloud } from '@/lib/sync'

export function AppContent({ children }: { children: React.ReactNode }) {
  const { isReady, hasDb } = useDbStatus()
  const { data: session, status } = useSession()
  const pathname = usePathname()

  // Pull from cloud on app open, once authenticated and DB is ready
  useEffect(() => {
    if (status !== 'authenticated' || !isReady || pathname === '/login') return
    const userId = session?.user?.id || session?.user?.email || ''
    pullFromCloud(userId)
  }, [status, isReady, pathname, session?.user?.id, session?.user?.email])

  if (pathname === '/login') {
    return <>{children}</>
  }

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

  if (!hasDb && pathname !== '/login') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Please sign in to continue.</p>
        </div>
      </div>
    )
  }

  return <div className="pb-20">{children}</div>
}
