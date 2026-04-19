'use client'
// Client-side AI key utilities only.
// Server-side waterfall lives in resolveAIKeyServer.ts (no directive).
// Re-exports AIProvider + AIKeySlot so existing client imports don't break.

export type { AIProvider, AIKeySlot } from '@/lib/resolveAIKeyServer'

// ─── Client-side compat helper ────────────────────────────────────────────────
// Used by legacy stats components (e.g. UncomfortableTruth) that call resolveAIKey()
// imperatively. Reads from the new 3-slot system in IndexedDB.

import type { AIProvider } from '@/lib/resolveAIKeyServer'

export interface ResolvedKey {
  key: string | null
  provider: AIProvider | null
  showSettingsPrompt: boolean
}

async function readSetting(settingKey: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('moneyMngrDB')
      req.onerror = () => resolve(null)
      req.onsuccess = () => {
        const idb = req.result
        if (!idb.objectStoreNames.contains('appSettings')) { idb.close(); return resolve(null) }
        try {
          const tx = idb.transaction('appSettings', 'readonly')
          const store = tx.objectStore('appSettings')
          const getReq = store.get(settingKey)
          getReq.onsuccess = () => {
            idb.close()
            const record = getReq.result as { key: string; value: string } | undefined
            resolve(record?.value?.trim() || null)
          }
          getReq.onerror = () => { idb.close(); resolve(null) }
        } catch { idb.close(); resolve(null) }
      }
    } catch { resolve(null) }
  })
}

export async function resolveAIKey(): Promise<ResolvedKey> {
  for (let n = 1; n <= 3; n++) {
    const [providerVal, keyVal] = await Promise.all([
      readSetting(`ai_slot_${n}_provider`),
      readSetting(`ai_slot_${n}_key`),
    ])
    if (keyVal) {
      return { key: keyVal, provider: (providerVal as AIProvider) || 'gemini', showSettingsPrompt: false }
    }
  }
  return { key: null, provider: null, showSettingsPrompt: true }
}
