'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { useFAINContext } from '@/hooks/useFAINContext';
import { buildSystemPrompt } from '@/lib/fainUtils';
import { FeedbackButtons } from './FeedbackButtons';
import { useDb } from '@/contexts/DbContext';
import { useLiveQuery } from 'dexie-react-hooks';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

export function FAINChat() {
  const db = useDb();
  const fainContext = useFAINContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Read API key from IndexedDB appSettings
  const geminiKeySetting = useLiveQuery(
    () => db?.appSettings.get('gemini_api_key'),
    [db]
  );
  const claudeKeySetting = useLiveQuery(
    () => db?.appSettings.get('claude_api_key'),
    [db]
  );

  const geminiKey = geminiKeySetting?.value ?? '';
  const claudeKey = claudeKeySetting?.value ?? '';
  const hasKey = !!(geminiKey || claudeKey);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !hasKey) return;

    const userMsg: ChatMessage = { role: 'user', content: text, id: Date.now().toString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const systemPrompt = fainContext ? buildSystemPrompt(fainContext) : '';
      const response = await fetch('/api/fain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          systemPrompt,
          geminiKey,
          claudeKey,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'AI call failed');

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.text, id: Date.now().toString() + '_ai' },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Analysis failed. Check your API key in Settings or try again.',
          id: Date.now().toString() + '_err',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, hasKey, messages, fainContext, geminiKey, claudeKey]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-6 text-center gap-3">
        <Bot className="w-10 h-10 text-slate-500" />
        <p className="text-slate-400 text-sm">
          Add your Gemini API key in <span className="text-blue-400">⚙️ Settings</span> to use FAIN Chat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ maxHeight: 'calc(100vh - 180px)' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-8">
            <Bot className="w-10 h-10 text-blue-400/50 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Ask me anything about your finances.</p>
            <div className="mt-4 flex flex-col gap-2 items-center">
              {[
                'How much did I spend last month?',
                "What's my biggest expense category?",
                'Am I saving enough?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-xs text-slate-400 border border-slate-700 rounded-full px-3 py-1.5 hover:border-blue-500 hover:text-blue-400 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
              msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'
            }`}>
              {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-blue-400" />}
            </div>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div
                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'assistant' && (
                <FeedbackButtons
                  featureId="FAIN_CHAT"
                  insightType="CHAT_RESPONSE"
                  insightSummary={msg.content}
                />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-blue-400" />
            </div>
            <div className="px-3 py-2 bg-slate-800 rounded-2xl rounded-tl-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700 bg-slate-900">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your finances…"
            rows={1}
            className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 resize-none leading-snug"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0"
            title="Send"
          >
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
