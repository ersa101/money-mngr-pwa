// Shared chart color palette — used across all stats chart components
// Order: blue, emerald, amber, red, violet, pink, teal, orange
export const CHART_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#14B8A6', // teal-500
  '#F97316', // orange-500
]

// Income / expense semantic colors
export const INCOME_COLOR = '#10B981'   // emerald-500
export const EXPENSE_COLOR = '#EF4444' // red-500

// Recharts axis / grid styling for dark backgrounds
export const CHART_AXIS_STYLE = { fill: '#94a3b8', fontSize: 11 } // slate-400
export const CHART_GRID_COLOR = '#1e293b' // slate-800

// Dark card tooltip style (inline style object for Recharts CustomTooltip)
export const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: 12,
}
