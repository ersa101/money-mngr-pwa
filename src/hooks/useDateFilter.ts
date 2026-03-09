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
  // Using ROLLING periods (not calendar-based)
  // NOTE: Use new Date(year, month - N, 1) instead of setMonth() to avoid
  // day-of-month overflow bugs (e.g. Aug 31 → setMonth(1) → "Feb 31" → Mar 3).
  const dateRange = useMemo(() => {
    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth() // 0-based

    switch (period) {
      case 'monthly':
        // Current month from the 1st
        return { startDate: new Date(y, m, 1), endDate: today }

      case 'quarterly':
        // Rolling 3 calendar months back, anchored to 1st
        return { startDate: new Date(y, m - 3, 1), endDate: today }

      case 'semi-annual':
        // Rolling 6 calendar months back, anchored to 1st
        return { startDate: new Date(y, m - 6, 1), endDate: today }

      case 'annual':
        // Rolling 12 calendar months back, anchored to 1st
        return { startDate: new Date(y, m - 12, 1), endDate: today }

      case 'custom':
        return customRange

      default:
        return { startDate: new Date(y, m - 12, 1), endDate: today }
    }
  }, [period, customRange])

  // Get all months between startDate and endDate
  const getMonthsInRange = () => {
    const months = []
    // Always start from the 1st of the start month to avoid day-of-month overflow
    // when incrementing (e.g. Jan 31 → setMonth(1) → "Feb 31" → Mar 3, skipping Feb).
    let y = dateRange.startDate.getFullYear()
    let mo = dateRange.startDate.getMonth()

    while (true) {
      const current = new Date(y, mo, 1)
      if (current > dateRange.endDate) break
      months.push(current)
      mo++
      if (mo > 11) { mo = 0; y++ }
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
