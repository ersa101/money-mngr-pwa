'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useDb } from '@/contexts/DbContext'

export type AIProvider = 'gemini' | 'claude' | 'openai'

export interface AIKeySlot {
  provider: AIProvider
  key: string
}

/**
 * Reads all 3 user AI key slots from IndexedDB and returns them as an ordered
 * array (blanks excluded) ready to pass to FAIN API routes.
 *
 * Storage keys: ai_slot_1_provider / ai_slot_1_key … ai_slot_3_provider / ai_slot_3_key
 */
export function useAIKeys(): { aiKeys: AIKeySlot[]; hasKey: boolean } {
  const db = useDb()

  const slot1Provider = useLiveQuery(() => db?.appSettings.get('ai_slot_1_provider'), [db])
  const slot1Key = useLiveQuery(() => db?.appSettings.get('ai_slot_1_key'), [db])
  const slot2Provider = useLiveQuery(() => db?.appSettings.get('ai_slot_2_provider'), [db])
  const slot2Key = useLiveQuery(() => db?.appSettings.get('ai_slot_2_key'), [db])
  const slot3Provider = useLiveQuery(() => db?.appSettings.get('ai_slot_3_provider'), [db])
  const slot3Key = useLiveQuery(() => db?.appSettings.get('ai_slot_3_key'), [db])

  const raw: AIKeySlot[] = [
    { provider: (slot1Provider?.value as AIProvider) || 'gemini', key: slot1Key?.value ?? '' },
    { provider: (slot2Provider?.value as AIProvider) || 'claude', key: slot2Key?.value ?? '' },
    { provider: (slot3Provider?.value as AIProvider) || 'openai', key: slot3Key?.value ?? '' },
  ]

  // Only pass non-empty slots to the API — blank slots are silently skipped
  const aiKeys = raw.filter(s => s.key.trim() !== '')
  const hasKey = aiKeys.length > 0

  return { aiKeys, hasKey }
}
