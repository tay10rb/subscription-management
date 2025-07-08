import {
  Calendar,
  CreditCard,
  ExternalLink,
  Tag,
  RotateCcw,
  Hand,
  DollarSign,
  User,
  FileText,
  Globe
} from "lucide-react"

import { Subscription, useSubscriptionStore } from "@/store/subscriptionStore"
import {
  formatDate,
  daysUntil,
  getBillingCycleLabel,
  getCategoryLabel,
  getPaymentMethodLabel
} from "@/lib/subscription-utils"
import { formatWithUserCurrency } from "@/utils/currency"
import { useIsMobile } from "@/hooks/use-mobile"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface SubscriptionDetailDialogProps {
  subscription: Subscription | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (id: number) => void
  onManualRenew?: (id: number) => void
}

export function SubscriptionDetailDialog({
  subscription,
  open,
  onOpenChange,
  onEdit,
  onManualRenew
}: SubscriptionDetailDialogProps) {
  const isMobile = useIsMobile()

  // Get options from the store - must be called before any early returns
  const { categories, paymentMethods } = useSubscriptionStore()

  // Early return after all hooks have been called
  if (!subscription) return null

  const {
    id,
    name,
    plan,
    amount,
    currency,
    nextBillingDate,
    lastBillingDate,
    billingCycle,
    paymentMethod,
    status,
    category,
    renewalType,
    startDate,
    notes,
    website
  } = subscription

  // Get the category and payment method labels using unified utility functions
  const categoryLabel = getCategoryLabel(subscription, categories)
  const paymentMethodLabel = getPaymentMethodLabel(subscription, paymentMethods)

  const daysLeft = daysUntil(nextBillingDate)
  const isExpiringSoon = daysLeft <= 7

  // Helper function to determine badge color based on urgency
  const getBadgeVariant = () => {
    if (status === 'cancelled') return "secondary"
    if (daysLeft <= 3) return "destructive"
    if (daysLeft <= 7) return "default"
    return "secondary"
  }

  // Helper function to get billing cycle badge variant
  const getBillingCycleBadgeVariant = () => {
    switch (billingCycle) {
      case 'monthly':
        return "default"
      case 'yearly':
        return "secondary"
      case 'quarterly':
        return "outline"
      default:
        return "secondary"
    }
  }

  // Content component that will be used in both Dialog and Drawer
  const ContentComponent = () => (
    <div className="space-y-3 sm:space-y-4">

      {/* Basic Information */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Subscription Plan</span>
        </div>
        <div className="pl-6">
          <p className="text-sm">{plan}</p>
        </div>
      </div>

      <Separator />

      {/* Pricing Information */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Pricing</span>
        </div>
        <div className="pl-6 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Amount:</span>
            <span className="font-semibold text-sm">
              {formatWithUserCurrency(amount, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Billing Cycle:</span>
            <Badge variant={getBillingCycleBadgeVariant()} className="text-xs h-5">
              {getBillingCycleLabel(billingCycle)}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Payment Information */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Payment Details</span>
        </div>
        <div className="pl-6 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Payment Method:</span>
            <span className="text-sm">{paymentMethodLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Renewal Type:</span>
            <div className="flex items-center gap-1.5">
              {renewalType === 'auto' ? (
                <RotateCcw className="h-3 w-3" />
              ) : (
                <Hand className="h-3 w-3" />
              )}
              <span className="text-sm">{renewalType === 'auto' ? 'Automatic' : 'Manual'}</span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Date Information */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Important Dates</span>
        </div>
        <div className="pl-6 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Start Date:</span>
            <span className="text-sm">{formatDate(startDate)}</span>
          </div>
          {lastBillingDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Payment:</span>
              <span className="text-sm">{formatDate(lastBillingDate)}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm">Next Payment:</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm ${isExpiringSoon ? "text-destructive font-medium" : ""}`}>
                {formatDate(nextBillingDate)}
              </span>
              {isExpiringSoon && status === 'active' && (
                <Badge variant={getBadgeVariant()} className="text-xs h-5">
                  {daysLeft === 0 ? "Today" : `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Category */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Category</span>
        </div>
        <div className="pl-6">
          <Badge variant="outline" className="text-xs h-5">{categoryLabel}</Badge>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Notes</span>
            </div>
            <div className="pl-6">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {notes}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Website */}
      {website && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Website</span>
            </div>
            <div className="pl-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(website, '_blank')}
                className="gap-1.5 text-xs h-7"
              >
                <ExternalLink className="h-3 w-3" />
                Visit Website
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Action Buttons */}
      <Separator />
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        {onEdit && (
          <Button
            onClick={() => {
              onEdit(id)
              onOpenChange(false)
            }}
            className="flex-1 text-xs h-8"
            size="sm"
          >
            Edit Subscription
          </Button>
        )}
        {renewalType === 'manual' && status === 'active' && onManualRenew && (
          <Button
            variant="outline"
            onClick={() => {
              onManualRenew(id)
              onOpenChange(false)
            }}
            className="flex-1 gap-1.5 text-xs h-8"
            size="sm"
          >
            <RotateCcw className="h-3 w-3" />
            Renew Now
          </Button>
        )}
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="flex flex-col gap-1">
              <span className="text-base">{name}</span>
              <Badge variant={status === 'active' ? 'default' : 'secondary'} className="self-start text-xs">
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <ContentComponent />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto p-4">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-base sm:text-lg">{name}</span>
            <Badge variant={status === 'active' ? 'default' : 'secondary'} className="self-start sm:self-auto text-xs">
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <ContentComponent />
      </DialogContent>
    </Dialog>
  )
}
