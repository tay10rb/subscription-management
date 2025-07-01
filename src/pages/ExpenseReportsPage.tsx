import { useState, useMemo } from 'react'
import { useSubscriptionStore } from "@/store/subscriptionStore"
import { useSettingsStore } from "@/store/settingsStore"
import { 
  getMonthlyExpenses, 
  getCategoryExpenses, 
  getExpenseMetrics,
  getExpensesByPaymentMethod,
  getDateRangePresets
} from "@/lib/expense-analytics"
import { ExpenseTrendChart } from "@/components/charts/ExpenseTrendChart"
import { CategoryPieChart } from "@/components/charts/CategoryPieChart"
import { ExpenseBarChart } from "@/components/charts/ExpenseBarChart"
import { ExpenseMetrics } from "@/components/charts/ExpenseMetrics"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Download, Filter, RefreshCw } from "lucide-react"
import { formatCurrency } from "@/lib/subscription-utils"

export function ExpenseReportsPage() {
  const { subscriptions, categories, paymentMethods } = useSubscriptionStore()
  const { currency: userCurrency } = useSettingsStore()
  
  // Filter states
  const [selectedDateRange, setSelectedDateRange] = useState('Last 12 Months')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('active')
  
  // Get date range presets
  const dateRangePresets = getDateRangePresets()
  const currentDateRange = dateRangePresets.find(preset => preset.label === selectedDateRange) 
    || dateRangePresets[2] // Default to Last 12 Months
  
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
      
      // Payment method filter
      if (selectedPaymentMethods.length > 0 && !selectedPaymentMethods.includes(subscription.paymentMethod)) {
        return false
      }
      
      return true
    })
  }, [subscriptions, selectedStatus, selectedCategories, selectedPaymentMethods])
  
  // Calculate expense data
  const monthlyExpenses = useMemo(() => 
    getMonthlyExpenses(filteredSubscriptions, currentDateRange.startDate, currentDateRange.endDate, userCurrency),
    [filteredSubscriptions, currentDateRange, userCurrency]
  )
  
  const categoryExpenses = useMemo(() => 
    getCategoryExpenses(filteredSubscriptions, currentDateRange.startDate, currentDateRange.endDate, userCurrency),
    [filteredSubscriptions, currentDateRange, userCurrency]
  )
  
  const paymentMethodExpenses = useMemo(() => 
    getExpensesByPaymentMethod(filteredSubscriptions, currentDateRange.startDate, currentDateRange.endDate, userCurrency),
    [filteredSubscriptions, currentDateRange, userCurrency]
  )
  
  const expenseMetrics = useMemo(() => 
    getExpenseMetrics(filteredSubscriptions, currentDateRange.startDate, currentDateRange.endDate, userCurrency),
    [filteredSubscriptions, currentDateRange, userCurrency]
  )
  
  // Helper functions
  const getCategoryLabel = (categoryValue: string) => {
    const category = categories.find(c => c.value === categoryValue)
    return category?.label || categoryValue
  }
  
  const getPaymentMethodLabel = (methodValue: string) => {
    const method = paymentMethods.find(m => m.value === methodValue)
    return method?.label || methodValue
  }
  
  const toggleCategoryFilter = (categoryValue: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryValue) 
        ? prev.filter(c => c !== categoryValue)
        : [...prev, categoryValue]
    )
  }
  
  const togglePaymentMethodFilter = (methodValue: string) => {
    setSelectedPaymentMethods(prev => 
      prev.includes(methodValue) 
        ? prev.filter(m => m !== methodValue)
        : [...prev, methodValue]
    )
  }
  
  const clearAllFilters = () => {
    setSelectedCategories([])
    setSelectedPaymentMethods([])
    setSelectedStatus('active')
  }
  
  const exportData = () => {
    // TODO: Implement export functionality
    console.log('Export expense data')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expense Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive analysis of your subscription expenses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={clearAllFilters}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Customize your expense analysis with filters
          </CardDescription>
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

            {/* Payment Methods */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Methods</label>
              <Select onValueChange={togglePaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Add payment filter" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods
                    .filter(method => !selectedPaymentMethods.includes(method.value))
                    .map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
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

          {/* Payment Method Filters */}
          {selectedPaymentMethods.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Selected Payment Methods</label>
              <div className="flex flex-wrap gap-2">
                {selectedPaymentMethods.map(methodValue => (
                  <Badge 
                    key={methodValue} 
                    variant="secondary" 
                    className="cursor-pointer"
                    onClick={() => togglePaymentMethodFilter(methodValue)}
                  >
                    {getPaymentMethodLabel(methodValue)} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Overview */}
      <ExpenseMetrics metrics={expenseMetrics} currency={userCurrency} />

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <ExpenseTrendChart 
            data={monthlyExpenses} 
            currency={userCurrency}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <CategoryPieChart
            data={categoryExpenses}
            currency={userCurrency}
          />
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <ExpenseBarChart 
            data={monthlyExpenses} 
            currency={userCurrency}
            title="Monthly Expense Analysis"
            description="Detailed monthly breakdown with statistics"
          />
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Method Analysis</CardTitle>
              <CardDescription>Expenses breakdown by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentMethodExpenses.map(method => (
                  <div key={method.paymentMethod} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="font-medium">{getPaymentMethodLabel(method.paymentMethod)}</div>
                      <div className="text-sm text-muted-foreground">
                        {method.subscriptionCount} subscription{method.subscriptionCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="font-medium">{formatCurrency(method.amount, userCurrency)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
