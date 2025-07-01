import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { formatCurrency } from "@/lib/subscription-utils"
import { CategoryExpense } from "@/lib/expense-analytics"
import { useSubscriptionStore } from "@/store/subscriptionStore"

interface CategoryPieChartProps {
  data: CategoryExpense[]
  currency: string
  className?: string
}

// Define colors for different categories
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(12 76% 61%)",
  "hsl(173 58% 39%)",
  "hsl(197 37% 24%)",
  "hsl(43 74% 66%)",
  "hsl(27 87% 67%)",
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
        <CardDescription>Breakdown of expenses by subscription category</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No category data available
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            {/* Chart */}
            <div className="flex items-center min-h-[400px]">
              <ChartContainer config={chartConfig} className="h-[400px] w-full max-w-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 30, right: 40, bottom: 30, left: 40 }}>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentage }) => `${percentage.toFixed(1)}%`}
                      outerRadius={140}
                      innerRadius={0}
                      fill="#8884d8"
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
                                      {formatCurrency(data.amount, currency)}
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
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-col justify-center">
              <h4 className="font-medium text-sm text-muted-foreground mb-4">Category Breakdown</h4>
              <div className="space-y-3">
                {chartData.map((item) => (
                  <div key={item.category} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <div className="font-medium text-sm">{item.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.subscriptionCount} service{item.subscriptionCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">
                        {formatCurrency(item.amount, currency)}
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
