'use client'

// SyncHeader — Phase 1.5
// Fixed top bar: app name | sync dot | user avatar
// Also owns the sync lifecycle: calls initSync on auth, cleans up on logout.

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSession, signIn, signOut } from 'next-auth/react'
import { initSync } from '@/lib/syncService'
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator'
import { AlertTriangle } from 'lucide-react'

export function SyncHeader() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const email = session?.user?.email ?? null
  const sessionExpired = session?.error === 'RefreshAccessTokenError'

  // Start sync lifecycle when authenticated; clean up on logout/unmount
  useEffect(() => {
    if (!email) return
    const cleanup = initSync(email)
    return cleanup
  }, [email])

  // Hide header entirely on the login page
  if (pathname === '/login') return null

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-14 md:h-16 flex items-center px-4 bg-white border-b border-gray-200 shadow-sm">
        {/* App name */}
        <span className="font-bold text-gray-900 text-sm tracking-wide">Money Mngr</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Sync status dot (only when signed in) */}
          {email && <SyncStatusIndicator />}

          {/* User avatar / sign-out */}
          {session?.user && (
            session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name ?? 'User'}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full cursor-pointer"
                title="Sign out"
                onClick={() => signOut({ callbackUrl: '/login' })}
              />
            ) : (
              <button
                className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium"
                title="Sign out"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                {(session.user.name ?? session.user.email ?? '?')[0].toUpperCase()}
              </button>
            )
          )}
        </div>
      </header>

      {/* Session expired banner — shown below header, non-blocking */}
      {sessionExpired && (
        <div className="fixed top-14 md:top-16 left-0 right-0 z-30 flex items-center justify-between gap-3 px-4 py-2.5 bg-red-600 text-white text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Session expired — your changes are saved locally but won&apos;t sync until you re-login.</span>
          </div>
          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="flex-shrink-0 px-3 py-1 rounded bg-white text-red-600 font-medium text-xs hover:bg-red-50 transition-colors"
          >
            Re-login
          </button>
        </div>
      )}
    </>
  )
}
