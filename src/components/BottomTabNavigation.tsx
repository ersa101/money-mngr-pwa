'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CreditCard, BarChart3, Brain, Settings } from 'lucide-react'

export function BottomTabNavigation() {
  const pathname = usePathname()

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
    <div className="fixed bottom-0 left-0 right-0 border-t border-slate-700 bg-slate-900 z-50">
      <div className="max-w-4xl mx-auto flex justify-around h-16">
        {tabs.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={`flex-1 flex flex-col items-center justify-center transition-colors min-h-[44px] ${
              isActive(href)
                ? 'text-blue-400 bg-blue-600/10'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Icon size={22} />
          </Link>
        ))}
      </div>
    </div>
  )
}
