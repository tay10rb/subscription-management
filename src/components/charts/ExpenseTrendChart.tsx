import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { formatCurrency } from "@/lib/subscription-utils"
import { MonthlyExpense } from "@/lib/expense-analytics"
import { TrendingUp, TrendingDown } from "lucide-react"

interface ExpenseTrendChartProps {
  data: MonthlyExpense[]
  currency: string
  className?: string
}

const chartConfig = {
  amount: {
    label: "Amount",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function ExpenseTrendChart({ data, currency, className }: ExpenseTrendChartProps) {
  // Calculate trend
  const trend = data.length >= 2 
    ? ((data[data.length - 1].amount - data[0].amount) / data[0].amount) * 100
    : 0
  
  const isPositiveTrend = trend > 0
  const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-lg">Expense Trends</CardTitle>
          <CardDescription>Monthly spending over time</CardDescription>
        </div>
        {data.length >= 2 && (
          <div className="flex items-center gap-2 text-sm">
            <TrendIcon className={`h-4 w-4 ${isPositiveTrend ? 'text-red-500' : 'text-green-500'}`} />
            <span className={isPositiveTrend ? 'text-red-500' : 'text-green-500'}>
              {Math.abs(trend).toFixed(1)}%
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No expense data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => formatCurrency(value, currency, false)}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as MonthlyExpense
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-md">
                          <div className="grid gap-2">
                            <div className="font-medium">{label}</div>
                            <div className="grid gap-1 text-sm">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-muted-foreground">Amount:</span>
                                <span className="font-medium">
                                  {formatCurrency(data.amount, currency)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-muted-foreground">Subscriptions:</span>
                                <span className="font-medium">{data.subscriptionCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-amount)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-amount)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "var(--color-amount)", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
