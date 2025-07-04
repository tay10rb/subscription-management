import { useState, useMemo, useEffect } from 'react'
import { useSubscriptionStore } from "@/store/subscriptionStore"
import { useSettingsStore } from "@/store/settingsStore"
import {
  getCategoryExpenses,
  getDateRangePresets
} from "@/lib/expense-analytics"
import {
  getApiMonthlyExpenses,
  getApiExpenseMetricsWithSubscriptions,
  calculateYearlyExpensesFromMonthly,
  MonthlyExpense,
  ExpenseMetrics as ExpenseMetricsType,
  YearlyExpense
} from "@/lib/expense-analytics-api"
import { ExpenseTrendChart } from "@/components/charts/ExpenseTrendChart"
import { YearlyTrendChart } from "@/components/charts/YearlyTrendChart"
import { CategoryPieChart } from "@/components/charts/CategoryPieChart"

import { ExpenseMetrics } from "@/components/charts/ExpenseMetrics"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Filter, RefreshCw } from "lucide-react"


export function ExpenseReportsPage() {
  const { subscriptions, categories, fetchSubscriptions, fetchCategories } = useSubscriptionStore()
  const { currency: userCurrency, fetchSettings } = useSettingsStore()
  
  // Filter states
  const [selectedDateRange, setSelectedDateRange] = useState('Last 12 Months')
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
  }, [fetchSubscriptions, fetchCategories, fetchSettings])

  // Get date range presets
  const dateRangePresets = getDateRangePresets()
  const currentDateRange = useMemo(() => {
    return dateRangePresets.find(preset => preset.label === selectedDateRange)
      || dateRangePresets[2] // Default to Last 12 Months
  }, [selectedDateRange])
  
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
  const [expenseMetrics, setExpenseMetrics] = useState<ExpenseMetricsType | null>(null)
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false)
  const [expenseError, setExpenseError] = useState<string | null>(null)

  // Calculate category expenses (still using local calculation as it's subscription-based)
  const categoryExpenses = useMemo(() =>
    getCategoryExpenses(filteredSubscriptions, currentDateRange.startDate, currentDateRange.endDate, userCurrency),
    [filteredSubscriptions, currentDateRange, userCurrency]
  )

  // Load expense data from API
  useEffect(() => {
    const loadExpenseData = async () => {
      setIsLoadingExpenses(true)
      setExpenseError(null)

      try {
        // Fetch monthly expenses and metrics from API
        const monthlyData = await getApiMonthlyExpenses(currentDateRange.startDate, currentDateRange.endDate, userCurrency);

        // Calculate metrics using detailed payment data
        const metricsData = await getApiExpenseMetricsWithSubscriptions(
          currentDateRange.startDate,
          currentDateRange.endDate,
          userCurrency
        );

        setMonthlyExpenses(monthlyData)
        setExpenseMetrics(metricsData)

        // Calculate yearly expenses from monthly data
        const yearlyData = calculateYearlyExpensesFromMonthly(monthlyData)
        setYearlyExpenses(yearlyData)

      } catch (error) {
        console.error('Failed to load expense data:', error)
        setExpenseError(error instanceof Error ? error.message : 'Failed to load expense data')
      } finally {
        setIsLoadingExpenses(false)
      }
    }

    loadExpenseData()
  }, [currentDateRange, userCurrency])
  
  // Helper functions
  const getCategoryLabel = (categoryValue: string) => {
    const category = categories.find(c => c.value === categoryValue)
    return category?.label || categoryValue
  }
  

  
  const toggleCategoryFilter = (categoryValue: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryValue) 
        ? prev.filter(c => c !== categoryValue)
        : [...prev, categoryValue]
    )
  }
  

  
  const clearAllFilters = () => {
    setSelectedCategories([])
    setSelectedStatus('active')
  }
  


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

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>
                Customize your expense analysis with filters
              </CardDescription>
            </div>
            <Button variant="outline" onClick={clearAllFilters} size="sm" className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                <SelectTrigger>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRangePresets.map(preset => (
                    <SelectItem key={preset.label} value={preset.label}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscriptions</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="cancelled">Cancelled Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Categories</label>
              <Select onValueChange={toggleCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Add category filter" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(category => !selectedCategories.includes(category.value))
                    .map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>


          </div>

          {/* Category Filters */}
          {selectedCategories.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Selected Categories</label>
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map(categoryValue => (
                  <Badge 
                    key={categoryValue} 
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => toggleCategoryFilter(categoryValue)}
                  >
                    {getCategoryLabel(categoryValue)} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}


        </CardContent>
      </Card>

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

      {/* Metrics Overview */}
      {expenseMetrics && !isLoadingExpenses && (
        <ExpenseMetrics metrics={expenseMetrics} currency={userCurrency} />
      )}

      {/* Charts */}
      {!isLoadingExpenses && !expenseError && (
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4">
            <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
              <ExpenseTrendChart
                data={monthlyExpenses}
                currency={userCurrency}
              />
              <YearlyTrendChart
                data={yearlyExpenses}
                currency={userCurrency}
              />
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <CategoryPieChart
              data={categoryExpenses}
              currency={userCurrency}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
