'use client';

import { useState } from 'react';
import { MessageCircle, TrendingUp, Bell } from 'lucide-react';
import { FAINChat } from '@/components/fain/FAINChat';
import { FAINInsights } from '@/components/fain/FAINInsights';
import { FAINAlerts } from '@/components/fain/FAINAlerts';

type Segment = 'chat' | 'insights' | 'alerts';

const segments: { id: Segment; label: string; icon: typeof MessageCircle }[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'insights', label: 'Insights', icon: TrendingUp },
  { id: 'alerts', label: 'Alerts', icon: Bell },
];

export default function FAINPage() {
  const [active, setActive] = useState<Segment>('insights');

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col pb-16">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-slate-700 bg-slate-900 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-white mb-3">
          🧠 <span className="text-blue-400">FAIN</span>
          <span className="text-slate-400 text-sm font-normal ml-2">Financial AI Native</span>
        </h1>

        {/* Segmented control */}
        <div className="flex bg-slate-800 rounded-full p-1 gap-1">
          {segments.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-sm font-medium transition-all ${
                active === id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {active === 'chat' && <FAINChat />}
        {active === 'insights' && <FAINInsights />}
        {active === 'alerts' && <FAINAlerts />}
      </div>
    </div>
  );
}
