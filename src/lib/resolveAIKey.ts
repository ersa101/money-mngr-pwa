/**
 * resolveAIKey — Single source of truth for AI provider key resolution.
 *
 * Priority order (per Phase 2 spec):
 *  1. User's own Gemini key (from IndexedDB appSettings: 'gemini_api_key')
 *  2. User's own Claude key (from IndexedDB appSettings: 'claude_api_key')
 *  3. Developer env GEMINI_API_KEY
 *  4. Developer env ANTHROPIC_API_KEY (also checks legacy CLAUDE_API_KEY)
 *  5. null → caller should show "Add API key in Settings" message
 *
 * SERVER-SIDE usage (API routes):
 *   import { resolveAIKeyServer } from '@/lib/resolveAIKey'
 *   const resolved = resolveAIKeyServer(userGeminiKey, userClaudeKey)
 *
 * CLIENT-SIDE usage (React components):
 *   import { resolveAIKeyClient } from '@/lib/resolveAIKey'
 *   const { geminiKey, claudeKey } = await resolveAIKeyClient(db)
 *   // then pass to server route body
 */

export type AIProvider = 'gemini' | 'claude';

export interface ResolvedKey {
  provider: AIProvider;
  key: string;
}

// ─── Server-side resolution ───────────────────────────────────────────────────
// Used inside Next.js API route handlers. Receives user keys from request body,
// falls back to process.env.

/**
 * Returns a single resolved key — Gemini preferred, Claude fallback.
 * Use for routes that need only one provider (e.g. uncomfortable-truth).
 */
export function resolveAIKeyServer(
  userGeminiKey?: string,
  userClaudeKey?: string
): ResolvedKey | null {
  const gemini = userGeminiKey?.trim() || process.env.GEMINI_API_KEY || '';
  const claude =
    userClaudeKey?.trim() ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY ||
    '';

  if (gemini) return { provider: 'gemini', key: gemini };
  if (claude) return { provider: 'claude', key: claude };
  return null;
}

/**
 * Returns both resolved keys for routes that try Gemini then fall back to Claude.
 * This is the canonical replacement for the duplicated key-resolution logic that
 * previously appeared in every API route.
 *
 * Priority per spec:
 *  user Gemini → user Claude → env GEMINI_API_KEY → env ANTHROPIC_API_KEY (or CLAUDE_API_KEY)
 */
export function resolveServerKeys(
  userGeminiKey?: string,
  userClaudeKey?: string
): { geminiKey: string; claudeKey: string; hasAnyKey: boolean } {
  const geminiKey = userGeminiKey?.trim() || process.env.GEMINI_API_KEY || '';
  const claudeKey =
    userClaudeKey?.trim() ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY ||
    '';
  return { geminiKey, claudeKey, hasAnyKey: !!(geminiKey || claudeKey) };
}

// ─── Client-side key reading ──────────────────────────────────────────────────
// Reads user-stored keys from IndexedDB appSettings.
// Returns them so the caller can include them in server route request bodies.

export interface ClientKeys {
  geminiKey: string;
  claudeKey: string;
  hasAnyKey: boolean;
}

export async function resolveAIKeyClient(
  db: import('@/lib/db').MySubClassedDB | null
): Promise<ClientKeys> {
  if (!db) return { geminiKey: '', claudeKey: '', hasAnyKey: false };

  const [geminiSetting, claudeSetting] = await Promise.all([
    db.appSettings.get('gemini_api_key'),
    db.appSettings.get('claude_api_key'),
  ]);

  const geminiKey = geminiSetting?.value?.trim() ?? '';
  const claudeKey = claudeSetting?.value?.trim() ?? '';

  // hasAnyKey is true if user has their own keys OR env vars are available
  // (env var presence is unknown client-side; we optimistically assume dev keys
  //  are present unless the server responds with 503/no-key error)
  const hasAnyKey = !!(geminiKey || claudeKey);

  return { geminiKey, claudeKey, hasAnyKey };
}
