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
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-200 bg-white sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900 mb-3">
          🧠 <span className="text-blue-600">FAIN</span>
          <span className="text-gray-500 text-sm font-normal ml-2">Financial AI Native</span>
        </h1>

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
