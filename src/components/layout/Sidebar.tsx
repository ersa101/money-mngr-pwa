'use client'

// Sidebar — desktop only (hidden on mobile, which uses BottomTabNavigation)
// Collapsible: icon-only (w-16) ↔ icons + labels (w-56)

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  CreditCard,
  BarChart3,
  Brain,
  Settings,
  ChevronRight,
} from 'lucide-react'
import { useSidebar } from '@/contexts/SidebarContext'

const NAV_ITEMS = [
  { href: '/home',         icon: Home,        label: 'BRIEF' },
  { href: '/transactions', icon: CreditCard,  label: 'TALLY' },
  { href: '/stats',        icon: BarChart3,   label: 'RADAR' },
  { href: '/fain',         icon: Brain,       label: 'SAGE' },
  { href: '/settings',     icon: Settings,    label: 'HUB' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { expanded, setExpanded } = useSidebar()

  if (pathname === '/login') return null

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-16 bottom-0 z-30
        bg-white border-r border-gray-200 transition-all duration-200
        ${expanded ? 'w-56' : 'w-16'}`}
    >
      {/* Nav links */}
      <nav className="flex-1 py-3 space-y-1 overflow-hidden">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-colors min-h-[44px]
              ${isActive(href)
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            <Icon size={20} className="flex-shrink-0" />
            {expanded && (
              <span className="text-sm font-medium whitespace-nowrap">{label}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-center h-12 border-t border-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
        title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <ChevronRight
          size={18}
          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
    </aside>
  )
}
