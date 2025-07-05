import { useState, useMemo, useEffect } from 'react'
import { useSubscriptionStore } from "@/store/subscriptionStore"
import { useSettingsStore } from "@/store/settingsStore"
import {
  getCategoryExpenses,
  getDateRangePresets
} from "@/lib/expense-analytics"
import {
  getApiMonthlyExpenses,
  calculateYearlyExpensesFromMonthly,
  MonthlyExpense,
  YearlyExpense
} from "@/lib/expense-analytics-api"
import { ExpenseTrendChart } from "@/components/charts/ExpenseTrendChart"
import { YearlyTrendChart } from "@/components/charts/YearlyTrendChart"
import { CategoryPieChart } from "@/components/charts/CategoryPieChart"


import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


export function ExpenseReportsPage() {
  const { subscriptions, categories, fetchSubscriptions, fetchCategories } = useSubscriptionStore()
  const { currency: userCurrency, fetchSettings } = useSettingsStore()
  
  // Filter states
  const [selectedDateRange, setSelectedDateRange] = useState('Last 12 Months')
  const [selectedYearlyDateRange, setSelectedYearlyDateRange] = useState(() => {
    const currentYear = new Date().getFullYear()
    return `${currentYear - 2} - ${currentYear}`
  })
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const [selectedStatus, setSelectedStatus] = useState<string>('active')

  // Fetch data when component mounts
  useEffect(() => {
    const initializeData = async () => {
      await fetchSubscriptions()
      await fetchCategories()
      await fetchSettings()
    }

    initializeData()
  }, []) // Remove dependencies to prevent infinite re-renders

  // Get date range presets
  const dateRangePresets = getDateRangePresets()
  const currentDateRange = useMemo(() => {
    return dateRangePresets.find(preset => preset.label === selectedDateRange)
      || dateRangePresets[2] // Default to Last 12 Months
  }, [selectedDateRange])

  // Get yearly date range presets (fixed recent 3 years)
  const yearlyDateRangePresets = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return [
      {
        label: `${currentYear - 2} - ${currentYear}`,
        startDate: new Date(currentYear - 2, 0, 1), // January 1st of 3 years ago
        endDate: new Date(currentYear, 11, 31) // December 31st of current year
      }
    ]
  }, [])

  const currentYearlyDateRange = useMemo(() => {
    return yearlyDateRangePresets.find(preset => preset.label === selectedYearlyDateRange)
      || yearlyDateRangePresets[0] // Default to Recent 3 Years
  }, [selectedYearlyDateRange, yearlyDateRangePresets])
  
  // Filter subscriptions based on selected filters
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter(subscription => {
      // Status filter
      if (selectedStatus !== 'all' && subscription.status !== selectedStatus) {
        return false
      }
      
      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(subscription.category)) {
        return false
      }
      

      
      return true
    })
  }, [subscriptions, selectedStatus, selectedCategories])
  
  // State for API data
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([])
  const [yearlyExpenses, setYearlyExpenses] = useState<YearlyExpense[]>([])


  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false)
  const [isLoadingYearlyExpenses, setIsLoadingYearlyExpenses] = useState(false)
  const [expenseError, setExpenseError] = useState<string | null>(null)
  const [yearlyExpenseError, setYearlyExpenseError] = useState<string | null>(null)

  // Calculate category expenses (still using local calculation as it's subscription-based)
  const categoryExpenses = useMemo(() =>
    getCategoryExpenses(filteredSubscriptions, currentDateRange.startDate, currentDateRange.endDate, userCurrency),
    [filteredSubscriptions, currentDateRange, userCurrency]
  )

  // Load monthly expense data from API
  useEffect(() => {
    const loadMonthlyExpenseData = async () => {
      setIsLoadingExpenses(true)
      setExpenseError(null)

      try {
        // Fetch monthly expenses and metrics from API
        const monthlyData = await getApiMonthlyExpenses(currentDateRange.startDate, currentDateRange.endDate, userCurrency);

        setMonthlyExpenses(monthlyData)

      } catch (error) {
        console.error('Failed to load monthly expense data:', error)
        setExpenseError(error instanceof Error ? error.message : 'Failed to load monthly expense data')
      } finally {
        setIsLoadingExpenses(false)
      }
    }

    loadMonthlyExpenseData()
  }, [currentDateRange, userCurrency])

  // Load yearly expense data from API (using separate date range)
  useEffect(() => {
    const loadYearlyExpenseData = async () => {
      setIsLoadingYearlyExpenses(true)
      setYearlyExpenseError(null)

      try {
        // Fetch yearly expenses using the 3-year date range
        const yearlyMonthlyData = await getApiMonthlyExpenses(
          currentYearlyDateRange.startDate,
          currentYearlyDateRange.endDate,
          userCurrency
        );

        // Calculate yearly expenses from monthly data
        const yearlyData = calculateYearlyExpensesFromMonthly(yearlyMonthlyData)
        setYearlyExpenses(yearlyData)



      } catch (error) {
        console.error('Failed to load yearly expense data:', error)
        setYearlyExpenseError(error instanceof Error ? error.message : 'Failed to load yearly expense data')
      } finally {
        setIsLoadingYearlyExpenses(false)
      }
    }

    loadYearlyExpenseData()
  }, [currentYearlyDateRange, userCurrency])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Expense Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive analysis of your subscription expenses
          </p>
        </div>
      </div>



      {/* Loading and Error States */}
      {isLoadingExpenses && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading expense data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {expenseError && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-sm text-destructive mb-2">Failed to load expense data</p>
              <p className="text-xs text-muted-foreground">{expenseError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {!isLoadingExpenses && !expenseError && (
        <div className="space-y-4">
          <Tabs defaultValue="monthly" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>

            <TabsContent value="monthly" className="space-y-4">
              <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                <ExpenseTrendChart
                  data={monthlyExpenses}
                  currency={userCurrency}
                />
                <CategoryPieChart
                  data={categoryExpenses}
                  currency={userCurrency}
                />
              </div>
            </TabsContent>

            <TabsContent value="yearly" className="space-y-4">
              {isLoadingYearlyExpenses ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading yearly data...</p>
                  </div>
                </div>
              ) : yearlyExpenseError ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <p className="text-sm text-destructive mb-2">Failed to load yearly data</p>
                    <p className="text-xs text-muted-foreground">{yearlyExpenseError}</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                  <YearlyTrendChart
                    data={yearlyExpenses}
                    currency={userCurrency}
                  />
                  <CategoryPieChart
                    data={categoryExpenses}
                    currency={userCurrency}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
