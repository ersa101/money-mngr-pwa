'use client'

import React, { createContext, useContext } from 'react'
import { db, MySubClassedDB } from '@/lib/db'

interface DbContextValue {
  db: MySubClassedDB
  isReady: boolean
}

const DbContext = createContext<DbContextValue>({
  db: db,
  isReady: true,
})

export function DbProvider({ children }: { children: React.ReactNode }) {
  // Simple single-user database - always ready
  const value = {
    db: db,
    isReady: true,
  }

  return (
    <DbContext.Provider value={value}>
      {children}
    </DbContext.Provider>
  )
}

// Hook to access the database - always returns the db instance
export function useDb(): MySubClassedDB {
  const { db } = useContext(DbContext)
  return db
}

// Hook to check if database is ready (for compatibility)
export function useDbStatus() {
  const { db, isReady } = useContext(DbContext)
  return { db, isReady, hasDb: true }
}
