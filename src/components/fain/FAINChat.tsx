'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { useFAINContext } from '@/hooks/useFAINContext';
import { buildSystemPrompt } from '@/lib/fainUtils';
import { FeedbackButtons } from './FeedbackButtons';
import { useAIKeys } from '@/hooks/useAIKeys';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

export function FAINChat() {
  const fainContext = useFAINContext();
  const { aiKeys } = useAIKeys();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

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
          aiKeys,
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
  }, [input, loading, messages, fainContext, aiKeys]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center mt-8">
            <Bot className="w-10 h-10 text-blue-400/50 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Ask me anything about your finances.</p>
            <div className="mt-4 flex flex-col gap-2 items-center">
              {[
                'How much did I spend last month?',
                "What's my biggest expense category?",
                'Am I saving enough?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1.5 hover:border-blue-500 hover:text-blue-600 transition"
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
              msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-100'
            }`}>
              {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-blue-600" />}
            </div>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div
                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
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
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-blue-600" />
            </div>
            <div className="px-3 py-2 bg-gray-100 rounded-2xl rounded-tl-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input — pinned to bottom, respects iOS keyboard safe area */}
      <div className="p-3 border-t border-gray-200 bg-white pb-safe flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your finances…"
            rows={1}
            className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 resize-none leading-snug"
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
