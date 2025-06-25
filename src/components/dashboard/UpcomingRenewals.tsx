import { Calendar, CalendarIcon } from "lucide-react"
import { Subscription } from "@/store/subscriptionStore"
import { formatCurrency, formatDate, daysUntil } from "@/lib/subscription-utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface UpcomingRenewalsProps {
  subscriptions: Subscription[]
  onViewAll?: () => void
}

export function UpcomingRenewals({ subscriptions, onViewAll }: UpcomingRenewalsProps) {
  const getBadgeVariant = (daysLeft: number) => {
    if (daysLeft <= 3) return "destructive"
    if (daysLeft <= 7) return "warning"
    return "secondary"
  }
  
  const getTimeLabel = (daysLeft: number) => {
    if (daysLeft === 0) return "Today"
    if (daysLeft === 1) return "Tomorrow"
    return `${daysLeft} days`
  }

  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Upcoming Renewals</CardTitle>
          <CardDescription>
            Subscriptions renewing in the next 30 days
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onViewAll}>
          View all
        </Button>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground opacity-50 mb-2" />
            <p className="text-muted-foreground">No upcoming renewals for the next 30 days</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((subscription) => {
              const daysRemaining = daysUntil(subscription.nextBillingDate)
              return (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex flex-col">
                    <div className="font-medium">{subscription.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {subscription.plan}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(subscription.amount, subscription.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {formatDate(subscription.nextBillingDate)}
                      </div>
                    </div>
                    <Badge variant={getBadgeVariant(daysRemaining)}>
                      {getTimeLabel(daysRemaining)}
                    </Badge>
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