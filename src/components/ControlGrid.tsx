import React from 'react'

export function ControlGrid({ income = 0, expenses = 0, total = 0, safe = 0 }: { income?: number; expenses?: number; total?: number; safe?: number }) {
  const cols = [
    { label: 'Income', value: income, color: '#10B981' },
    { label: 'Expenses', value: expenses, color: '#EF4444' },
    { label: 'Total', value: total, color: '#0EA5E9' },
    { label: 'Safe Balance', value: safe, color: '#F59E0B' }
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
      {cols.map((c) => (
        <div key={c.label} style={{ padding: 10, borderRadius: 6, background: '#0b1220', color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{c.label}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>${(c.value || 0).toFixed(2)}</div>
        </div>
      ))}
    </div>
  )
}

export default ControlGrid
