import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/subscription-utils"
import { ExpenseMetrics as ExpenseMetricsType } from "@/lib/expense-analytics"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  Calendar,
  BarChart3
} from "lucide-react"

interface ExpenseMetricsProps {
  metrics: ExpenseMetricsType
  currency: string
  className?: string
}

export function ExpenseMetrics({ metrics, currency, className }: ExpenseMetricsProps) {
  const isPositiveGrowth = metrics.growthRate > 0
  const GrowthIcon = isPositiveGrowth ? TrendingUp : TrendingDown
  
  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {/* Total Spent */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(metrics.totalSpent, currency)}
          </div>
          <p className="text-xs text-muted-foreground">
            Across all subscriptions
          </p>
        </CardContent>
      </Card>

      {/* Average Monthly */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Average Monthly</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(metrics.averageMonthly, currency)}
          </div>
          <p className="text-xs text-muted-foreground">
            Monthly spending average
          </p>
        </CardContent>
      </Card>

      {/* Average Per Subscription */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Per Subscription</CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(metrics.averagePerSubscription, currency)}
          </div>
          <p className="text-xs text-muted-foreground">
            Average cost per service
          </p>
        </CardContent>
      </Card>

      {/* Growth Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
          <GrowthIcon className={`h-4 w-4 ${isPositiveGrowth ? 'text-red-500' : 'text-green-500'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isPositiveGrowth ? 'text-red-500' : 'text-green-500'}`}>
            {isPositiveGrowth ? '+' : ''}{metrics.growthRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            {isPositiveGrowth ? 'Increase' : 'Decrease'} from first month
          </p>
        </CardContent>
      </Card>

      {/* Highest Month */}
      {metrics.highestMonth && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Highest Month</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.highestMonth.amount, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.highestMonth.month} • {metrics.highestMonth.subscriptionCount} subscriptions
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lowest Month */}
      {metrics.lowestMonth && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lowest Month</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.lowestMonth.amount, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.lowestMonth.month} • {metrics.lowestMonth.subscriptionCount} subscriptions
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
