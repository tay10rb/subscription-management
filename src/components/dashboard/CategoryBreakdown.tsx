import { useSubscriptionStore } from "@/store/subscriptionStore"
import { useSettingsStore } from "@/store/settingsStore"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency } from "@/lib/subscription-utils"

interface CategoryBreakdownProps {
  data: Record<string, number>
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  // Get categories from the store for labels
  const { categories } = useSubscriptionStore()
  // Get user's preferred currency
  const { currency: userCurrency } = useSettingsStore()
  
  // Calculate total
  const total = Object.values(data).reduce((sum, value) => sum + value, 0)
  
  // Sort categories by amount (descending)
  const sortedCategories = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .filter(([, value]) => value > 0)
    .map(([category]) => category)
  
  // Get appropriate label for a category
  const getCategoryLabel = (categoryValue: string) => {
    const category = categories.find(c => c.value === categoryValue)
    return category?.label || categoryValue
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Spending by Category</CardTitle>
        <CardDescription>Annual breakdown by category</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedCategories.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">
            No spending data available
          </p>
        ) : (
          <div className="space-y-4">
            {sortedCategories.map((category) => {
              const value = data[category]
              const percentage = total > 0 ? (value / total) * 100 : 0
              
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{getCategoryLabel(category)}</span>
                    <span className="font-medium">
                      {formatCurrency(value, userCurrency)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-secondary overflow-hidden rounded-full">
                    <div 
                      className="h-full bg-primary"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}