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
  const dateRange = useMemo(() => {
    const today = new Date()
    let startDate: Date

    switch (period) {
      case 'monthly':
        // Rolling 1 month: current month from 1st
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        return { startDate, endDate: today }

      case 'quarterly':
        // Rolling 3 months back from today
        startDate = new Date(today)
        startDate.setMonth(startDate.getMonth() - 3)
        startDate.setDate(1) // Start from 1st of that month
        return { startDate, endDate: today }

      case 'semi-annual':
        // Rolling 6 months back from today
        startDate = new Date(today)
        startDate.setMonth(startDate.getMonth() - 6)
        startDate.setDate(1) // Start from 1st of that month
        return { startDate, endDate: today }

      case 'annual':
        // Rolling 12 months back from today
        startDate = new Date(today)
        startDate.setMonth(startDate.getMonth() - 12)
        startDate.setDate(1) // Start from 1st of that month
        return { startDate, endDate: today }

      case 'custom':
        return customRange

      default:
        startDate = new Date(today)
        startDate.setMonth(startDate.getMonth() - 12)
        startDate.setDate(1)
        return { startDate, endDate: today }
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
