'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CreditCard, BarChart3, Brain, Settings } from 'lucide-react'

export function BottomTabNavigation() {
  const pathname = usePathname()

  // Hide on login page and on desktop (sidebar handles desktop nav)
  if (pathname === '/login') return null

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const tabs = [
    { href: '/home', icon: Home, label: 'Home' },
    { href: '/transactions', icon: CreditCard, label: 'Transactions' },
    { href: '/stats', icon: BarChart3, label: 'Stats' },
    { href: '/fain', icon: Brain, label: 'FAIN' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div
      className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white z-50 md:hidden shadow-[0_-1px_3px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around h-16">
        {tabs.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={`flex-1 flex flex-col items-center justify-center transition-colors min-h-[44px] ${
              isActive(href)
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={22} />
          </Link>
        ))}
      </div>
    </div>
  )
}
