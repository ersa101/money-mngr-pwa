import React from 'react'

// Mock lucide-react icon types - return React components
export function X(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }), React.createElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' }))
}

export function Plus(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('line', { x1: '12', y1: '5', x2: '12', y2: '19' }), React.createElement('line', { x1: '5', y1: '12', x2: '19', y2: '12' }))
}

export function ArrowUpRight(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('polyline', { points: '7 17 17 7' }), React.createElement('polyline', { points: '7 7 17 7 17 17' }))
}

export function ArrowDownLeft(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('polyline', { points: '17 7 7 17' }), React.createElement('polyline', { points: '17 17 7 17 7 7' }))
}

export function TrendingUp(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('polyline', { points: '23 6 13.5 15.5 8.5 10.5 1 17' }), React.createElement('polyline', { points: '17 6 23 6 23 12' }))
}

export function Zap(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' }))
}

export function AlertCircle(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('circle', { cx: '12', cy: '12', r: '10' }), React.createElement('line', { x1: '12', y1: '8', x2: '12', y2: '12' }), React.createElement('line', { x1: '12', y1: '16', x2: '12.01', y2: '16' }))
}

export function Landmark(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('line', { x1: '3', y1: '21', x2: '21', y2: '21' }), React.createElement('line', { x1: '6', y1: '21', x2: '6', y2: '5' }), React.createElement('line', { x1: '12', y1: '21', x2: '12', y2: '9' }), React.createElement('line', { x1: '18', y1: '21', x2: '18', y2: '7' }), React.createElement('polyline', { points: '6 12 12 7 18 12' }))
}

export function Wallet(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('rect', { x: '1', y: '4', width: '22', height: '16', rx: '2', ry: '2' }), React.createElement('path', { d: 'M1 10h22' }), React.createElement('circle', { cx: '17', cy: '15', r: '1' }))
}

export function Trash2(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('polyline', { points: '3 6 5 6 21 6' }), React.createElement('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }), React.createElement('line', { x1: '10', y1: '11', x2: '10', y2: '17' }), React.createElement('line', { x1: '14', y1: '11', x2: '14', y2: '17' }))
}

export function Edit2(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('path', { d: 'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' }))
}

export function LayoutGrid(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('rect', { x: '3', y: '3', width: '7', height: '7' }), React.createElement('rect', { x: '14', y: '3', width: '7', height: '7' }), React.createElement('rect', { x: '14', y: '14', width: '7', height: '7' }), React.createElement('rect', { x: '3', y: '14', width: '7', height: '7' }))
}

export function BarChart3(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('line', { x1: '12', y1: '3', x2: '12', y2: '21' }), React.createElement('line', { x1: '18', y1: '9', x2: '18', y2: '21' }), React.createElement('line', { x1: '6', y1: '12', x2: '6', y2: '21' }))
}

export function Calendar(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('rect', { x: '3', y: '4', width: '18', height: '18', rx: '2', ry: '2' }), React.createElement('line', { x1: '16', y1: '2', x2: '16', y2: '6' }), React.createElement('line', { x1: '8', y1: '2', x2: '8', y2: '6' }), React.createElement('line', { x1: '3', y1: '10', x2: '21', y2: '10' }))
}

export function CreditCard(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('rect', { x: '1', y: '4', width: '22', height: '16', rx: '2', ry: '2' }), React.createElement('line', { x1: '1', y1: '10', x2: '23', y2: '10' }))
}

export function Upload(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }), React.createElement('polyline', { points: '17 8 12 3 7 8' }), React.createElement('line', { x1: '12', y1: '3', x2: '12', y2: '15' }))
}

export function CheckCircle(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('path', { d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' }), React.createElement('polyline', { points: '22 4 12 14.01 9 11.01' }))
}

export function Download(props: any): React.ReactElement {
  const { size = 24, ...rest } = props
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', ...rest }, React.createElement('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }), React.createElement('polyline', { points: '7 10 12 15 17 10' }), React.createElement('line', { x1: '12', y1: '15', x2: '12', y2: '3' }))
}
