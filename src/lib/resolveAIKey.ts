'use client'

// Shared AI key resolution utility — Phase 2
// Priority order:
//   1. User's Gemini key from IndexedDB appSettings
//   2. User's Claude key from IndexedDB appSettings
//   3. NEXT_PUBLIC_GEMINI_API_KEY env var (developer fallback)
//   4. NEXT_PUBLIC_CLAUDE_API_KEY env var (developer fallback)
//   5. null — caller must show "Add API key in Settings"

export type AIProvider = 'gemini' | 'claude'

export interface ResolvedKey {
  key: string | null
  provider: AIProvider | null
  showSettingsPrompt: boolean
}

async function readFromIndexedDB(settingKey: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('moneyMngrDB')
      req.onerror = () => resolve(null)
      req.onsuccess = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('appSettings')) {
          db.close()
          return resolve(null)
        }
        try {
          const tx = db.transaction('appSettings', 'readonly')
          const store = tx.objectStore('appSettings')
          const getReq = store.get(settingKey)
          getReq.onsuccess = () => {
            db.close()
            const record = getReq.result as { key: string; value: string } | undefined
            resolve(record?.value?.trim() || null)
          }
          getReq.onerror = () => {
            db.close()
            resolve(null)
          }
        } catch {
          db.close()
          resolve(null)
        }
      }
    } catch {
      resolve(null)
    }
  })
}

export async function resolveAIKey(): Promise<ResolvedKey> {
  // 1. User's Gemini key from IndexedDB
  const userGemini = await readFromIndexedDB('gemini_api_key')
  if (userGemini) {
    return { key: userGemini, provider: 'gemini', showSettingsPrompt: false }
  }

  // 2. User's Claude key from IndexedDB
  const userClaude = await readFromIndexedDB('claude_api_key')
  if (userClaude) {
    return { key: userClaude, provider: 'claude', showSettingsPrompt: false }
  }

  // 3. Developer's Gemini key from env vars
  const envGemini = process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim()
  if (envGemini) {
    return { key: envGemini, provider: 'gemini', showSettingsPrompt: false }
  }

  // 4. Developer's Claude key from env vars
  const envClaude = process.env.NEXT_PUBLIC_CLAUDE_API_KEY?.trim()
  if (envClaude) {
    return { key: envClaude, provider: 'claude', showSettingsPrompt: false }
  }

  // 5. No key available
  return { key: null, provider: null, showSettingsPrompt: true }
}
