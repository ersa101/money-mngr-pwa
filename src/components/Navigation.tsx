'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { LayoutGrid, Landmark, BarChart3, Settings, LogOut } from 'lucide-react'
import { SyncStatusIndicator } from './SyncStatusIndicator'
import { useSync } from '@/hooks/useSync'

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userId = session?.user?.id || session?.user?.email || null
  const { syncState, isOnline, sync, forceSync } = useSync(userId)

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Don't show navigation on login page
  if (pathname === '/login') return null

  return (
    <nav className="border-b border-border bg-card">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="font-bold text-lg flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded text-primary">
            <LayoutGrid className="w-5 h-5" />
          </div>
          Money Mngr
        </Link>

        <div className="flex gap-1 items-center">
          <Link
            href="/transactions"
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive('/transactions')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Transactions
          </Link>
          <Link
            href="/accounts"
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              isActive('/accounts')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Landmark className="w-4 h-4" />
            Accounts
          </Link>
          <Link
            href="/stats"
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              isActive('/stats')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Stats
          </Link>
          <Link
            href="/settings"
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              isActive('/settings')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>

          {/* Sync status indicator */}
          <div className="ml-4">
            <SyncStatusIndicator
              syncState={syncState}
              isOnline={isOnline}
              onRetry={sync}
              onForceSync={forceSync}
            />
          </div>

          {/* User avatar and sign-out */}
          {session?.user && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-8 h-8 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                  {(session.user.name || session.user.email || '?')[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
