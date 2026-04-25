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
    <div className="h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] bg-gray-50 flex flex-col">
      {/* Header — matches HUB/RADAR layout: icon block + h1 + subtitle stacked */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-100 rounded-lg flex items-center justify-center" style={{ width: '40px', height: '40px' }}>
            <span className="text-2xl leading-none">🧠</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SAGE</h1>
            <p className="text-sm text-gray-500">
              Spend Analysis & Guidance Engine
            </p>
          </div>
        </div>

        {/* Segmented control */}
        <div className="flex bg-gray-100 rounded-full p-1 gap-1">
          {segments.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-sm font-medium transition-all ${
                active === id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-500 hover:text-gray-700'
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
