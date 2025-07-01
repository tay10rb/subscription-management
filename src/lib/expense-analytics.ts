import { Subscription, BillingCycle } from "@/store/subscriptionStore"
import { convertCurrency } from "@/utils/currency"
import { useSettingsStore } from "@/store/settingsStore"

export interface ExpenseData {
  date: string
  amount: number
  category: string
  subscription: Subscription
}

export interface MonthlyExpense {
  month: string
  year: number
  amount: number
  subscriptionCount: number
}

export interface YearlyExpense {
  year: number
  amount: number
  subscriptionCount: number
}

export interface CategoryExpense {
  category: string
  amount: number
  percentage: number
  subscriptionCount: number
}

export interface ExpenseTrend {
  period: string
  amount: number
  change: number
  changePercentage: number
}

export interface ExpenseMetrics {
  totalSpent: number
  averageMonthly: number
  averagePerSubscription: number
  highestMonth: MonthlyExpense | null
  lowestMonth: MonthlyExpense | null
  growthRate: number
}

/**
 * Calculate the monthly cost of a subscription in user's preferred currency
 */
export function calculateMonthlyAmount(subscription: Subscription, targetCurrency: string): number {
  const convertedAmount = convertCurrency(subscription.amount, subscription.currency, targetCurrency)
  
  switch (subscription.billingCycle) {
    case 'monthly':
      return convertedAmount
    case 'yearly':
      return convertedAmount / 12
    case 'quarterly':
      return convertedAmount / 3
    default:
      return convertedAmount
  }
}

/**
 * Generate expense data for a subscription over a date range
 */
export function generateExpenseData(
  subscription: Subscription,
  startDate: Date,
  endDate: Date,
  targetCurrency: string
): ExpenseData[] {
  const expenses: ExpenseData[] = []
  const monthlyAmount = calculateMonthlyAmount(subscription, targetCurrency)
  
  // Only include active subscriptions
  if (subscription.status !== 'active') {
    return expenses
  }
  
  const subscriptionStart = new Date(subscription.startDate)
  const current = new Date(Math.max(subscriptionStart.getTime(), startDate.getTime()))
  
  while (current <= endDate) {
    expenses.push({
      date: current.toISOString().split('T')[0],
      amount: monthlyAmount,
      category: subscription.category,
      subscription
    })
    
    // Move to next month
    current.setMonth(current.getMonth() + 1)
  }
  
  return expenses
}

/**
 * Get monthly expense summary for a given period
 */
export function getMonthlyExpenses(
  subscriptions: Subscription[],
  startDate: Date,
  endDate: Date,
  targetCurrency: string
): MonthlyExpense[] {
  const monthlyMap = new Map<string, { amount: number; subscriptions: Set<number> }>()

  subscriptions.forEach(subscription => {
    const expenseData = generateExpenseData(subscription, startDate, endDate, targetCurrency)

    expenseData.forEach(expense => {
      const date = new Date(expense.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { amount: 0, subscriptions: new Set() })
      }

      const monthData = monthlyMap.get(monthKey)!
      monthData.amount += expense.amount
      monthData.subscriptions.add(subscription.id)
    })
  })

  return Array.from(monthlyMap.entries())
    .map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-')
      return {
        month: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        }),
        year: parseInt(year),
        amount: data.amount,
        subscriptionCount: data.subscriptions.size
      }
    })
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return new Date(a.month + ' 1, ' + a.year).getMonth() - new Date(b.month + ' 1, ' + b.year).getMonth()
    })
}

/**
 * Get yearly expense summary for a given period
 */
export function getYearlyExpenses(
  subscriptions: Subscription[],
  startDate: Date,
  endDate: Date,
  targetCurrency: string
): YearlyExpense[] {
  const yearlyMap = new Map<number, { amount: number; subscriptions: Set<number> }>()

  subscriptions.forEach(subscription => {
    const expenseData = generateExpenseData(subscription, startDate, endDate, targetCurrency)

    expenseData.forEach(expense => {
      const date = new Date(expense.date)
      const year = date.getFullYear()

      if (!yearlyMap.has(year)) {
        yearlyMap.set(year, { amount: 0, subscriptions: new Set() })
      }

      const yearData = yearlyMap.get(year)!
      yearData.amount += expense.amount
      yearData.subscriptions.add(subscription.id)
    })
  })

  return Array.from(yearlyMap.entries())
    .map(([year, data]) => ({
      year,
      amount: data.amount,
      subscriptionCount: data.subscriptions.size
    }))
    .sort((a, b) => a.year - b.year)
}

/**
 * Get expense breakdown by category
 */
export function getCategoryExpenses(
  subscriptions: Subscription[],
  startDate: Date,
  endDate: Date,
  targetCurrency: string
): CategoryExpense[] {
  const categoryMap = new Map<string, { amount: number; subscriptions: Set<number> }>()
  let totalAmount = 0
  
  subscriptions.forEach(subscription => {
    const expenseData = generateExpenseData(subscription, startDate, endDate, targetCurrency)
    const subscriptionTotal = expenseData.reduce((sum, expense) => sum + expense.amount, 0)
    
    if (subscriptionTotal > 0) {
      if (!categoryMap.has(subscription.category)) {
        categoryMap.set(subscription.category, { amount: 0, subscriptions: new Set() })
      }
      
      const categoryData = categoryMap.get(subscription.category)!
      categoryData.amount += subscriptionTotal
      categoryData.subscriptions.add(subscription.id)
      totalAmount += subscriptionTotal
    }
  })
  
  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      subscriptionCount: data.subscriptions.size
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Calculate expense trends over time
 */
export function getExpenseTrends(
  subscriptions: Subscription[],
  startDate: Date,
  endDate: Date,
  targetCurrency: string
): ExpenseTrend[] {
  const monthlyExpenses = getMonthlyExpenses(subscriptions, startDate, endDate, targetCurrency)

  return monthlyExpenses.map((current, index) => {
    const previous = index > 0 ? monthlyExpenses[index - 1] : null
    const change = previous ? current.amount - previous.amount : 0
    const changePercentage = previous && previous.amount > 0
      ? ((current.amount - previous.amount) / previous.amount) * 100
      : 0

    return {
      period: current.month,
      amount: current.amount,
      change,
      changePercentage
    }
  })
}

/**
 * Calculate comprehensive expense metrics
 */
export function getExpenseMetrics(
  subscriptions: Subscription[],
  startDate: Date,
  endDate: Date,
  targetCurrency: string
): ExpenseMetrics {
  const monthlyExpenses = getMonthlyExpenses(subscriptions, startDate, endDate, targetCurrency)
  const totalSpent = monthlyExpenses.reduce((sum, month) => sum + month.amount, 0)
  const averageMonthly = monthlyExpenses.length > 0 ? totalSpent / monthlyExpenses.length : 0

  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active')
  const averagePerSubscription = activeSubscriptions.length > 0
    ? totalSpent / activeSubscriptions.length / monthlyExpenses.length
    : 0

  const highestMonth = monthlyExpenses.length > 0
    ? monthlyExpenses.reduce((max, month) => month.amount > max.amount ? month : max)
    : null

  const lowestMonth = monthlyExpenses.length > 0
    ? monthlyExpenses.reduce((min, month) => month.amount < min.amount ? month : min)
    : null

  // Calculate growth rate (first month vs last month)
  const growthRate = monthlyExpenses.length >= 2
    ? ((monthlyExpenses[monthlyExpenses.length - 1].amount - monthlyExpenses[0].amount) / monthlyExpenses[0].amount) * 100
    : 0

  return {
    totalSpent,
    averageMonthly,
    averagePerSubscription,
    highestMonth,
    lowestMonth,
    growthRate
  }
}

/**
 * Get expense data filtered by payment method
 */
export function getExpensesByPaymentMethod(
  subscriptions: Subscription[],
  startDate: Date,
  endDate: Date,
  targetCurrency: string
): Array<{ paymentMethod: string; amount: number; subscriptionCount: number }> {
  const paymentMethodMap = new Map<string, { amount: number; subscriptions: Set<number> }>()

  subscriptions.forEach(subscription => {
    const expenseData = generateExpenseData(subscription, startDate, endDate, targetCurrency)
    const subscriptionTotal = expenseData.reduce((sum, expense) => sum + expense.amount, 0)

    if (subscriptionTotal > 0) {
      if (!paymentMethodMap.has(subscription.paymentMethod)) {
        paymentMethodMap.set(subscription.paymentMethod, { amount: 0, subscriptions: new Set() })
      }

      const methodData = paymentMethodMap.get(subscription.paymentMethod)!
      methodData.amount += subscriptionTotal
      methodData.subscriptions.add(subscription.id)
    }
  })

  return Array.from(paymentMethodMap.entries())
    .map(([paymentMethod, data]) => ({
      paymentMethod,
      amount: data.amount,
      subscriptionCount: data.subscriptions.size
    }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Get date range presets for filtering
 */
export function getDateRangePresets(): Array<{ label: string; startDate: Date; endDate: Date }> {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  return [
    {
      label: 'Last 3 Months',
      startDate: new Date(currentYear, currentMonth - 2, 1),
      endDate: now
    },
    {
      label: 'Last 6 Months',
      startDate: new Date(currentYear, currentMonth - 5, 1),
      endDate: now
    },
    {
      label: 'Last 12 Months',
      startDate: new Date(currentYear - 1, currentMonth, 1),
      endDate: now
    },
    {
      label: 'This Year',
      startDate: new Date(currentYear, 0, 1),
      endDate: now
    },
    {
      label: 'Last Year',
      startDate: new Date(currentYear - 1, 0, 1),
      endDate: new Date(currentYear - 1, 11, 31)
    }
  ]
}
