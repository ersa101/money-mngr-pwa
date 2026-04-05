/**
 * Shared AI key resolution utility — used by SMS parser, FAIN, and Phase 2.
 * Resolution order:
 *  1. User's Gemini key from IndexedDB appSettings
 *  2. User's Claude key from IndexedDB appSettings
 *  3. GEMINI_API_KEY from env (developer fallback)
 *  4. ANTHROPIC_API_KEY from env (last resort)
 *  5. null → caller must show "Add API key in Settings"
 */

import { db } from '@/lib/db';

export type AIProvider = 'gemini' | 'claude';

export interface ResolvedKey {
  provider: AIProvider;
  key: string;
  source: 'user_settings' | 'env';
}

export async function resolveAIKey(): Promise<ResolvedKey | null> {
  // 1. User's own Gemini key
  const geminiSetting = await db.appSettings.get('gemini_api_key');
  if (geminiSetting?.value?.trim()) {
    return { provider: 'gemini', key: geminiSetting.value.trim(), source: 'user_settings' };
  }

  // 2. User's own Claude key
  const claudeSetting = await db.appSettings.get('claude_api_key');
  if (claudeSetting?.value?.trim()) {
    return { provider: 'claude', key: claudeSetting.value.trim(), source: 'user_settings' };
  }

  // 3. Developer Gemini env key
  const envGemini = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (envGemini?.trim()) {
    return { provider: 'gemini', key: envGemini.trim(), source: 'env' };
  }

  // 4. Developer Anthropic env key
  const envClaude = process.env.ANTHROPIC_API_KEY;
  if (envClaude?.trim()) {
    return { provider: 'claude', key: envClaude.trim(), source: 'env' };
  }

  // 5. No key available
  return null;
}
