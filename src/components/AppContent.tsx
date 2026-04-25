'use client'

import { useDbStatus } from '@/contexts/DbContext'
import { useSidebar } from '@/contexts/SidebarContext'
import { useInsightsCacheBoot } from '@/hooks/useInsightsCacheBoot'
import { useTriStateMigration } from '@/hooks/useTriStateMigration'
import { usePathname } from 'next/navigation'

export function AppContent({ children }: { children: React.ReactNode }) {
  const { isReady, hasDb } = useDbStatus()
  const { expanded } = useSidebar()
  const pathname = usePathname()

  // V2.7.4 D043 — one-shot computedInsights clear on app boot if build is newer
  // than user's last cleared marker. Silent. Idempotent.
  useInsightsCacheBoot()
  // V2.7.4 D040 — one-shot tri-state migration: resolve "both flags ON" anomaly.
  // Liability wins. Idempotent.
  useTriStateMigration()

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
