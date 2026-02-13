'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Landmark, BarChart3, CreditCard } from 'lucide-react'

export function BottomTabNavigation() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const tabs = [
    { href: '/transactions', label: 'Transactions', icon: CreditCard },
    { href: '/accounts', label: 'Accounts', icon: Landmark },
    { href: '/stats', label: 'Stats', icon: BarChart3 },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-slate-700 bg-slate-900 z-50">
      <div className="max-w-4xl mx-auto px-4 flex justify-around h-16">
        {tabs.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive(href)
                ? 'text-blue-400 bg-blue-600/10'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Icon size={24} />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
