'use client'

import { useEffect } from 'react'

export default function DevInstanceCheck() {
  useEffect(() => {
    // Only run in development on localhost
    if (typeof window === 'undefined') return
    if (!window.location.hostname.includes('localhost') && window.location.hostname !== '127.0.0.1') return

    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/instance')
        if (!res.ok) return
        const data = await res.json()
        const serverStart = String(data.serverStart)
        const key = 'dev:serverStart'
        const last = window.localStorage.getItem(key)

        if (!last) {
          window.localStorage.setItem(key, serverStart)
          // Clear CSV files on first load
          if (mounted) {
            await fetch('/api/data?table=accounts', { method: 'DELETE' })
            await fetch('/api/data?table=categories', { method: 'DELETE' })
            await fetch('/api/data?table=transactions', { method: 'DELETE' })
            window.location.reload()
          }
          return
        }

        if (last !== serverStart && mounted) {
          // Server restarted — clear CSV files
          try {
            await fetch('/api/data?table=accounts', { method: 'DELETE' })
            await fetch('/api/data?table=categories', { method: 'DELETE' })
            await fetch('/api/data?table=transactions', { method: 'DELETE' })
          } catch (err) {
            console.error('Error clearing CSV files:', err)
          }
          window.localStorage.setItem(key, serverStart)
          // Reload to re-initialize a clean client state
          window.location.reload()
        }
      } catch (err) {
        // ignore failures
        console.error('DevInstanceCheck error', err)
      }
    })()

    return () => { mounted = false }
  }, [])

  return null
}
