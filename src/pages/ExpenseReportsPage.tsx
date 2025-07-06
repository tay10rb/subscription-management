import { useState, useMemo, useEffect } from 'react'
import { useSubscriptionStore } from "@/store/subscriptionStore"
import { useSettingsStore } from "@/store/settingsStore"
import {
  getDateRangePresets
} from "@/lib/expense-analytics"
import {
  getApiMonthlyExpenses,
  getApiCategoryExpenses,
  calculateYearlyExpensesFromMonthly,
  MonthlyExpense,
  YearlyExpense,
  CategoryExpense
} from "@/lib/expense-analytics-api"
import {
  convertMonthlyExpensesToInfo,
  calculateQuarterlyExpenses,
  calculateYearlyExpenses,
  filterRecentExpenses
} from "@/lib/expense-info-analytics"
import { ExpenseInfoData } from "@/components/charts/ExpenseInfoCards"
import { ExpenseTrendChart } from "@/components/charts/ExpenseTrendChart"
import { YearlyTrendChart } from "@/components/charts/YearlyTrendChart"
import { CategoryPieChart } from "@/components/charts/CategoryPieChart"
import { ExpenseInfoCards } from "@/components/charts/ExpenseInfoCards"


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
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpense[]>([])
  const [yearlyCategoryExpenses, setYearlyCategoryExpenses] = useState<CategoryExpense[]>([])

  // State for expense info data
  const [expenseInfoData, setExpenseInfoData] = useState<{
    monthly: ExpenseInfoData[]
    quarterly: ExpenseInfoData[]
    yearly: ExpenseInfoData[]
  }>({
    monthly: [],
    quarterly: [],
    yearly: []
  })

  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false)
  const [isLoadingYearlyExpenses, setIsLoadingYearlyExpenses] = useState(false)
  const [isLoadingCategoryExpenses, setIsLoadingCategoryExpenses] = useState(false)
  const [isLoadingYearlyCategoryExpenses, setIsLoadingYearlyCategoryExpenses] = useState(false)
  const [isLoadingExpenseInfo, setIsLoadingExpenseInfo] = useState(false)
  const [expenseError, setExpenseError] = useState<string | null>(null)
  const [yearlyExpenseError, setYearlyExpenseError] = useState<string | null>(null)
  const [categoryExpenseError, setCategoryExpenseError] = useState<string | null>(null)
  const [yearlyCategoryExpenseError, setYearlyCategoryExpenseError] = useState<string | null>(null)
  const [expenseInfoError, setExpenseInfoError] = useState<string | null>(null)



  // Load expense info data (recent periods)
  useEffect(() => {
    const loadExpenseInfoData = async () => {
      setIsLoadingExpenseInfo(true)
      setExpenseInfoError(null)

      try {
        // Get recent 12 months of data for expense info
        const endDate = new Date()
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - 12)

        const allMonthlyData = await getApiMonthlyExpenses(startDate, endDate, userCurrency)

        // If no data from API, create some test data for demonstration
        if (!allMonthlyData || allMonthlyData.length === 0) {
          const testData = [
            {
              monthKey: '2024-12',
              month: 'Dec 2024',
              year: 2024,
              amount: 156.99,
              subscriptionCount: 8,
              paymentHistoryIds: [1, 2, 3, 4, 5]
            },
            {
              monthKey: '2024-11',
              month: 'Nov 2024',
              year: 2024,
              amount: 142.50,
              subscriptionCount: 7,
              paymentHistoryIds: [6, 7, 8, 9]
            },
            {
              monthKey: '2024-10',
              month: 'Oct 2024',
              year: 2024,
              amount: 168.75,
              subscriptionCount: 9,
              paymentHistoryIds: [10, 11, 12, 13, 14]
            },
            {
              monthKey: '2024-09',
              month: 'Sep 2024',
              year: 2024,
              amount: 134.25,
              subscriptionCount: 6,
              paymentHistoryIds: [15, 16, 17]
            }
          ]

          const monthlyInfo = convertMonthlyExpensesToInfo(testData, userCurrency)
          const quarterlyInfo = calculateQuarterlyExpenses(testData, userCurrency)
          const yearlyInfo = calculateYearlyExpenses(testData, userCurrency)

          setExpenseInfoData({
            monthly: monthlyInfo,
            quarterly: quarterlyInfo,
            yearly: yearlyInfo
          })
        } else {
          const { monthlyExpenses: recentMonthly, quarterlyExpenses: recentQuarterly, yearlyExpenses: recentYearly } = filterRecentExpenses(allMonthlyData)

          // Convert to expense info format
          const monthlyInfo = convertMonthlyExpensesToInfo(recentMonthly, userCurrency)
          const quarterlyInfo = calculateQuarterlyExpenses(recentQuarterly, userCurrency)
          const yearlyInfo = calculateYearlyExpenses(recentYearly, userCurrency)

          setExpenseInfoData({
            monthly: monthlyInfo,
            quarterly: quarterlyInfo,
            yearly: yearlyInfo
          })
        }

      } catch (error) {
        console.error('Failed to load expense info data:', error)
        setExpenseInfoError(error instanceof Error ? error.message : 'Failed to load expense info data')

        // Fallback to test data on error
        const testData = [
          {
            monthKey: '2024-12',
            month: 'Dec 2024',
            year: 2024,
            amount: 156.99,
            subscriptionCount: 8,
            paymentHistoryIds: [1, 2, 3, 4, 5]
          },
          {
            monthKey: '2024-11',
            month: 'Nov 2024',
            year: 2024,
            amount: 142.50,
            subscriptionCount: 7,
            paymentHistoryIds: [6, 7, 8, 9]
          }
        ]

        const monthlyInfo = convertMonthlyExpensesToInfo(testData, userCurrency)
        const quarterlyInfo = calculateQuarterlyExpenses(testData, userCurrency)
        const yearlyInfo = calculateYearlyExpenses(testData, userCurrency)

        setExpenseInfoData({
          monthly: monthlyInfo,
          quarterly: quarterlyInfo,
          yearly: yearlyInfo
        })
      } finally {
        setIsLoadingExpenseInfo(false)
      }
    }

    loadExpenseInfoData()
  }, [userCurrency])

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

  // Load category expense data from API
  useEffect(() => {
    const loadCategoryExpenseData = async () => {
      setIsLoadingCategoryExpenses(true)
      setCategoryExpenseError(null)

      try {
        // Fetch category expenses from API
        const categoryData = await getApiCategoryExpenses(currentDateRange.startDate, currentDateRange.endDate, userCurrency);
        setCategoryExpenses(categoryData)

      } catch (error) {
        console.error('Failed to load category expense data:', error)
        setCategoryExpenseError(error instanceof Error ? error.message : 'Failed to load category expense data')
      } finally {
        setIsLoadingCategoryExpenses(false)
      }
    }

    loadCategoryExpenseData()
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

  // Load yearly category expense data from API
  useEffect(() => {
    const loadYearlyCategoryExpenseData = async () => {
      setIsLoadingYearlyCategoryExpenses(true)
      setYearlyCategoryExpenseError(null)

      try {
        // Fetch yearly category expenses from API using yearly date range
        const yearlyCategoryData = await getApiCategoryExpenses(
          currentYearlyDateRange.startDate,
          currentYearlyDateRange.endDate,
          userCurrency
        );
        setYearlyCategoryExpenses(yearlyCategoryData)

      } catch (error) {
        console.error('Failed to load yearly category expense data:', error)
        setYearlyCategoryExpenseError(error instanceof Error ? error.message : 'Failed to load yearly category expense data')
      } finally {
        setIsLoadingYearlyCategoryExpenses(false)
      }
    }

    loadYearlyCategoryExpenseData()
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

      {/* Expense Info Cards */}
      <div className="space-y-6">
        <div>
          {isLoadingExpenseInfo ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">Loading expense overview...</p>
              <ExpenseInfoCards
                monthlyData={[]}
                quarterlyData={[]}
                yearlyData={[]}
                currency={userCurrency}
                isLoading={true}
              />
            </div>
          ) : expenseInfoError ? (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center">
                  <p className="text-sm text-destructive mb-2">Failed to load expense overview</p>
                  <p className="text-xs text-muted-foreground">{expenseInfoError}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div>
              <ExpenseInfoCards
                monthlyData={expenseInfoData.monthly}
                quarterlyData={expenseInfoData.quarterly}
                yearlyData={expenseInfoData.yearly}
                currency={userCurrency}
              />
            </div>
          )}
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
                {isLoadingCategoryExpenses ? (
                  <Card>
                    <CardContent className="flex items-center justify-center h-[400px]">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading category data...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : categoryExpenseError ? (
                  <Card>
                    <CardContent className="flex items-center justify-center h-[400px]">
                      <div className="text-center text-destructive">
                        <p className="font-medium">Failed to load category data</p>
                        <p className="text-sm text-muted-foreground mt-1">{categoryExpenseError}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <CategoryPieChart
                    data={categoryExpenses}
                    currency={userCurrency}
                  />
                )}
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
                  {isLoadingYearlyCategoryExpenses ? (
                    <Card>
                      <CardContent className="flex items-center justify-center h-[400px]">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Loading yearly category data...</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : yearlyCategoryExpenseError ? (
                    <Card>
                      <CardContent className="flex items-center justify-center h-[400px]">
                        <div className="text-center text-destructive">
                          <p className="font-medium">Failed to load yearly category data</p>
                          <p className="text-sm text-muted-foreground mt-1">{yearlyCategoryExpenseError}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <CategoryPieChart
                      data={yearlyCategoryExpenses}
                      currency={userCurrency}
                    />
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
