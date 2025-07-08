import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartConfig } from "@/components/ui/chart"
import { formatCurrencyAmount } from "@/utils/currency"
import { MonthlyExpense } from "@/lib/expense-analytics-api"
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
          <CardDescription>Monthly spending over time (Last 12 months)</CardDescription>
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
      <CardContent className="px-2 sm:px-6">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No expense data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] w-full overflow-hidden">
            <LineChart
              data={data}
              margin={{
                top: 30,
                right: 15,
                left: 5,
                bottom: 30 // Balanced margin for rotated labels
              }}
            >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  tickMargin={10}
                />
                <YAxis
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => formatCurrencyAmount(value, currency)}
                  width={60}
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
                                  {formatCurrencyAmount(data.amount, currency)}
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
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
