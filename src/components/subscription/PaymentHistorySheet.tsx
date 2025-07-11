import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CurrencySelector } from "@/components/subscription/CurrencySelector"
import { PaymentRecord } from "@/utils/dataTransform"
import { getBaseCurrency } from "@/config/currency"

// Form data type for payment record
interface PaymentFormData {
  subscriptionId: number
  paymentDate: string
  amountPaid: number
  currency: string
  billingPeriodStart: string
  billingPeriodEnd: string
  status: string
  notes?: string
}

interface PaymentHistorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: PaymentRecord
  subscriptionId: number
  subscriptionName: string
  onSubmit: (data: PaymentFormData) => Promise<void>
}

// Form validation types
type FormErrors = {
  [key: string]: string
}

export function PaymentHistorySheet({
  open,
  onOpenChange,
  initialData,
  subscriptionId,
  subscriptionName,
  onSubmit
}: PaymentHistorySheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State for form data and validation errors
  const [form, setForm] = useState<PaymentFormData>({
    subscriptionId,
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    amountPaid: 0,
    currency: getBaseCurrency(),
    billingPeriodStart: format(new Date(), "yyyy-MM-dd"),
    billingPeriodEnd: format(new Date(), "yyyy-MM-dd"),
    status: "succeeded",
    notes: ""
  })

  const [errors, setErrors] = useState<FormErrors>({})

  // Initialize form with initial data when editing
  useEffect(() => {
    if (initialData) {
      setForm({
        subscriptionId: initialData.subscriptionId,
        paymentDate: format(new Date(initialData.paymentDate), "yyyy-MM-dd"),
        amountPaid: initialData.amountPaid,
        currency: initialData.currency,
        billingPeriodStart: format(new Date(initialData.billingPeriod.start), "yyyy-MM-dd"),
        billingPeriodEnd: format(new Date(initialData.billingPeriod.end), "yyyy-MM-dd"),
        status: initialData.status,
        notes: initialData.notes || ""
      })
    } else {
      // Reset form for new payment
      setForm({
        subscriptionId,
        paymentDate: format(new Date(), "yyyy-MM-dd"),
        amountPaid: 0,
        currency: getBaseCurrency(),
        billingPeriodStart: format(new Date(), "yyyy-MM-dd"),
        billingPeriodEnd: format(new Date(), "yyyy-MM-dd"),
        status: "succeeded",
        notes: ""
      })
    }
    setErrors({})
  }, [initialData, subscriptionId, open])

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!form.paymentDate) {
      newErrors.paymentDate = "Payment date is required"
    }

    if (!form.amountPaid || form.amountPaid <= 0) {
      newErrors.amountPaid = "Amount must be greater than 0"
    }

    if (!form.currency) {
      newErrors.currency = "Currency is required"
    }

    if (!form.billingPeriodStart) {
      newErrors.billingPeriodStart = "Billing period start is required"
    }

    if (!form.billingPeriodEnd) {
      newErrors.billingPeriodEnd = "Billing period end is required"
    }

    if (form.billingPeriodStart && form.billingPeriodEnd) {
      const startDate = new Date(form.billingPeriodStart)
      const endDate = new Date(form.billingPeriodEnd)
      if (startDate >= endDate) {
        newErrors.billingPeriodEnd = "End date must be after start date"
      }
    }

    if (!form.status) {
      newErrors.status = "Status is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(form)
      onOpenChange(false) // Close sheet on successful submission
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle form field changes
  const handleFieldChange = (field: keyof PaymentFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {initialData ? "Edit Payment" : "Add Payment"}
          </SheetTitle>
          <SheetDescription>
            {subscriptionName}
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4 py-4">
          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date *</Label>
            <Input
              id="paymentDate"
              type="date"
              value={form.paymentDate}
              onChange={(e) => handleFieldChange("paymentDate", e.target.value)}
              className={errors.paymentDate ? "border-destructive" : ""}
            />
            {errors.paymentDate && (
              <p className="text-sm text-destructive">{errors.paymentDate}</p>
            )}
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amountPaid">Amount *</Label>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                min="0"
                value={form.amountPaid}
                onChange={(e) => handleFieldChange("amountPaid", parseFloat(e.target.value) || 0)}
                className={errors.amountPaid ? "border-destructive" : ""}
              />
              {errors.amountPaid && (
                <p className="text-sm text-destructive">{errors.amountPaid}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <CurrencySelector
                value={form.currency}
                onValueChange={(value) => handleFieldChange("currency", value)}
                className={errors.currency ? "border-destructive" : ""}
              />
              {errors.currency && (
                <p className="text-sm text-destructive">{errors.currency}</p>
              )}
            </div>
          </div>

          {/* Billing Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billingPeriodStart">Billing Period Start *</Label>
              <Input
                id="billingPeriodStart"
                type="date"
                value={form.billingPeriodStart}
                onChange={(e) => handleFieldChange("billingPeriodStart", e.target.value)}
                className={errors.billingPeriodStart ? "border-destructive" : ""}
              />
              {errors.billingPeriodStart && (
                <p className="text-sm text-destructive">{errors.billingPeriodStart}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingPeriodEnd">Billing Period End *</Label>
              <Input
                id="billingPeriodEnd"
                type="date"
                value={form.billingPeriodEnd}
                onChange={(e) => handleFieldChange("billingPeriodEnd", e.target.value)}
                className={errors.billingPeriodEnd ? "border-destructive" : ""}
              />
              {errors.billingPeriodEnd && (
                <p className="text-sm text-destructive">{errors.billingPeriodEnd}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={form.status}
              onValueChange={(value) => handleFieldChange("status", value)}
            >
              <SelectTrigger className={errors.status ? "border-destructive" : ""}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="succeeded">Succeeded</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => handleFieldChange("notes", e.target.value)}
              placeholder="Optional notes about this payment..."
              rows={3}
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update Payment" : "Add Payment"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
