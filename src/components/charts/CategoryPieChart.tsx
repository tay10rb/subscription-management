import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { formatCurrencyAmount } from "@/utils/currency"
import { CategoryExpense } from "@/lib/expense-analytics-api"
import { useSubscriptionStore } from "@/store/subscriptionStore"

interface CategoryPieChartProps {
  data: CategoryExpense[]
  currency: string
  className?: string
}

// Define colors for different categories - using CSS variables for theme support
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  // Fallback colors that work in both light and dark modes
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function CategoryPieChart({ data, currency, className }: CategoryPieChartProps) {
  const { categories } = useSubscriptionStore()
  
  // Get category label
  const getCategoryLabel = (categoryValue: string) => {
    const category = categories.find(c => c.value === categoryValue)
    return category?.label || categoryValue
  }
  
  // Prepare chart data with colors
  const chartData = data.map((item, index) => ({
    ...item,
    label: getCategoryLabel(item.category),
    color: COLORS[index % COLORS.length]
  }))
  
  const chartConfig = chartData.reduce((config, item, index) => {
    config[item.category] = {
      label: item.label,
      color: COLORS[index % COLORS.length],
    }
    return config
  }, {} as ChartConfig)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Spending by Category</CardTitle>
        <CardDescription>Breakdown of expenses by subscription category (Last 12 months)</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] sm:h-[250px] lg:h-[300px] text-muted-foreground">
            No category data available
          </div>
        ) : (
          <div className="space-y-6 lg:space-y-0 lg:grid lg:gap-8 lg:grid-cols-[1fr_1fr]">
            {/* Chart */}
            <div className="flex items-center justify-center min-h-[250px] sm:min-h-[300px] lg:min-h-[350px] w-full">
              <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] lg:h-[350px] w-full max-w-[320px] mx-auto overflow-hidden">
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={chartData}
                      cx="45%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentage }) => `${percentage.toFixed(1)}%`}
                      outerRadius="80%"
                      innerRadius={0}
                      fill="hsl(var(--chart-1))"
                      dataKey="amount"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as CategoryExpense & { label: string }
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-md">
                              <div className="grid gap-2">
                                <div className="font-medium">{data.label}</div>
                                <div className="grid gap-1 text-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span className="font-medium">
                                      {formatCurrencyAmount(data.amount, currency)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">Percentage:</span>
                                    <span className="font-medium">{data.percentage.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">Services:</span>
                                    <span className="font-medium">
                                      {data.subscriptionCount} service{data.subscriptionCount !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                </PieChart>
              </ChartContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-col justify-center w-full min-w-0">
              <div className="space-y-3">
                {chartData.map((item) => (
                  <div key={item.category} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors min-w-0">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{item.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.subscriptionCount} service{item.subscriptionCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="font-semibold text-sm">
                        {formatCurrencyAmount(item.amount, currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
