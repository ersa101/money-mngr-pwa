import { useState, useMemo } from 'react'

export type PeriodType = 'monthly' | 'quarterly' | 'semi-annual' | 'annual' | 'custom'

export interface DateRange {
  startDate: Date
  endDate: Date
}

export function useDateFilter() {
  const [period, setPeriod] = useState<PeriodType>('monthly')
  const [customRange, setCustomRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
  })

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const today = new Date()
    let startDate: Date

    switch (period) {
      case 'monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        return { startDate, endDate: today }

      case 'quarterly':
        const quarter = Math.floor(today.getMonth() / 3)
        startDate = new Date(today.getFullYear(), quarter * 3, 1)
        return { startDate, endDate: today }

      case 'semi-annual':
        const half = today.getMonth() < 6 ? 0 : 6
        startDate = new Date(today.getFullYear(), half, 1)
        return { startDate, endDate: today }

      case 'annual':
        startDate = new Date(today.getFullYear(), 0, 1)
        return { startDate, endDate: today }

      case 'custom':
        return customRange

      default:
        return { startDate: new Date(today.getFullYear(), 0, 1), endDate: today }
    }
  }, [period, customRange])

  // Get all months between startDate and endDate
  const getMonthsInRange = () => {
    const months = []
    const current = new Date(dateRange.startDate)

    while (current <= dateRange.endDate) {
      months.push(new Date(current))
      current.setMonth(current.getMonth() + 1)
    }

    return months
  }

  // Get all dates between startDate and endDate
  const getDaysInRange = () => {
    const days = []
    const current = new Date(dateRange.startDate)

    while (current <= dateRange.endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Format month for display
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
    })
  }

  return {
    period,
    setPeriod,
    dateRange,
    customRange,
    setCustomRange,
    getMonthsInRange,
    getDaysInRange,
    formatDate,
    formatMonth,
  }
}
