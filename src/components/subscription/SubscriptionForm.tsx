import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Settings } from "lucide-react"
import { format } from "date-fns"
import { useNavigate } from "react-router-dom"
import { getBaseCurrency } from '@/config/currency'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { CurrencySelector } from "@/components/subscription/CurrencySelector"
import { calculateNextBillingDateFromStart } from "@/lib/subscription-utils"

import { Subscription, useSubscriptionStore } from "@/store/subscriptionStore"



// Form data type - excludes auto-calculated fields and optional display fields
type SubscriptionFormData = Omit<Subscription, "id" | "lastBillingDate" | "nextBillingDate" | "category" | "paymentMethod">

interface SubscriptionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Subscription
  onSubmit: (data: SubscriptionFormData & { nextBillingDate: string }) => void
}

// Form validation types
type FormErrors = {
  [key: string]: string
}

export function SubscriptionForm({
  open,
  onOpenChange,
  initialData,
  onSubmit
}: SubscriptionFormProps) {
  const navigate = useNavigate()

  // Get categories, payment methods and plan options from store
  const {
    categories,
    paymentMethods
  } = useSubscriptionStore()

  // State for form data and validation errors
  const [form, setForm] = useState<SubscriptionFormData>({
    name: "",
    plan: "",
    billingCycle: "monthly",
    amount: 0,
    currency: getBaseCurrency(),
    paymentMethodId: 0,
    startDate: format(new Date(), "yyyy-MM-dd"),
    status: "active",
    categoryId: 0,
    renewalType: "manual",
    notes: "",
    website: ""
  })

  // State for form errors
  const [errors, setErrors] = useState<FormErrors>({})



  // Popover open states
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)

  // Initialize form with initial data if provided
  useEffect(() => {
    if (initialData) {
      const { lastBillingDate, category, paymentMethod, ...formData } = initialData
      setForm(formData)
    }
  }, [initialData])

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      if (!initialData) {
        setForm({
          name: "",
          plan: "",
          billingCycle: "monthly",
          amount: 0,
          currency: "USD",
          paymentMethodId: 0,
          startDate: format(new Date(), "yyyy-MM-dd"),
          status: "active",
          categoryId: 0,
          renewalType: "manual",
          notes: "",
          website: ""
        })
      }
      setErrors({})
    }
  }, [open, initialData])

  // Handle basic input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field if any
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Handle number input changes
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numValue = parseFloat(value)
    
    setForm(prev => ({
      ...prev,
      [name]: isNaN(numValue) ? 0 : numValue
    }))
    
    // Clear error for this field if any
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field if any
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Handle category selection
  const handleCategorySelect = (value: string) => {
    const category = categories.find(cat => cat.value === value)
    if (category) {
      setForm(prev => ({ ...prev, categoryId: category.id }))
    }
    setCategoryOpen(false)

    // Clear error for this field if any
    if (errors.categoryId) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.categoryId
        return newErrors
      })
    }
  }

  // Handle payment method selection
  const handlePaymentMethodSelect = (value: string) => {
    const paymentMethod = paymentMethods.find(pm => pm.value === value)
    if (paymentMethod) {
      setForm(prev => ({ ...prev, paymentMethodId: paymentMethod.id }))
    }
    setPaymentOpen(false)

    // Clear error for this field if any
    if (errors.paymentMethodId) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.paymentMethodId
        return newErrors
      })
    }
  }



  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const newErrors: FormErrors = {}

    if (!form.name) newErrors.name = "Name is required"
    if (!form.plan) newErrors.plan = "Subscription plan is required"
    if (!form.categoryId || form.categoryId === 0) newErrors.categoryId = "Category is required"
    if (!form.paymentMethodId || form.paymentMethodId === 0) newErrors.paymentMethodId = "Payment method is required"
    if (form.amount <= 0) newErrors.amount = "Amount must be greater than 0"

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Calculate next billing date based on start date, current date and billing cycle
    const nextBillingDate = calculateNextBillingDateFromStart(
      new Date(form.startDate),
      new Date(),
      form.billingCycle
    )

    // Submit the form with calculated next billing date
    onSubmit({
      ...form,
      nextBillingDate
    })
    onOpenChange(false)
  }



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{initialData ? "Edit Subscription" : "Add New Subscription"}</DialogTitle>
            <DialogDescription>
              {initialData 
                ? "Update your subscription details below" 
                : "Enter the details of your subscription below"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Subscription name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-destructive text-xs mt-1">{errors.name}</p>
                )}
              </div>
            </div>

            {/* Subscription plan */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Plan
              </Label>
              <div className="col-span-3">
                <Input
                  id="plan"
                  value={form.plan}
                  onChange={(e) => {
                    setForm(prev => ({ ...prev, plan: e.target.value }))
                    // Clear error for this field if any
                    if (errors.plan) {
                      setErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.plan
                        return newErrors
                      })
                    }
                  }}
                  placeholder="e.g., Premium, Family, Basic..."
                  className={errors.plan ? "border-destructive" : ""}
                />
                {errors.plan && (
                  <p className="text-destructive text-xs mt-1">{errors.plan}</p>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Category
              </Label>
              <div className="col-span-3">
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryOpen}
                      className={cn(
                        "w-full justify-between",
                        errors.categoryId ? "border-destructive" : ""
                      )}
                    >
                      {form.categoryId
                        ? categories.find(category => category.id === form.categoryId)?.label || "Unknown category"
                        : "Select category..."
                      }
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search category..." />
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandList className="max-h-[300px] overflow-auto">
                        <CommandGroup>
                          <div className="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            <span>Categories</span>
                            <Settings
                              className="h-4 w-4 cursor-pointer hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation()
                                setCategoryOpen(false)
                                navigate('/settings?tab=options')
                              }}
                            />
                          </div>
                          {categories.map((category) => (
                            <CommandItem
                              key={category.value}
                              value={category.value}
                              onSelect={handleCategorySelect}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.categoryId === category.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {category.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.categoryId && (
                  <p className="text-destructive text-xs mt-1">{errors.categoryId}</p>
                )}
              </div>
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Amount
              </Label>
              <div className="col-span-3 grid grid-cols-5 gap-2">
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    id="amount"
                    name="amount"
                    value={form.amount || ""}
                    onChange={handleNumberChange}
                    className={errors.amount ? "border-destructive" : ""}
                  />
                  {errors.amount && (
                    <p className="text-destructive text-xs mt-1">{errors.amount}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <CurrencySelector
                    value={form.currency}
                    onValueChange={(value) => handleSelectChange("currency", value)}
                  />
                </div>
              </div>
            </div>

            {/* Billing Cycle */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="billingCycle" className="text-right">
                Billing Cycle
              </Label>
              <Select 
                value={form.billingCycle} 
                onValueChange={(value) => handleSelectChange("billingCycle", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select billing cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>



            {/* Payment Method */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Payment Method
              </Label>
              <div className="col-span-3">
                <Popover open={paymentOpen} onOpenChange={setPaymentOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={paymentOpen}
                      className={cn(
                        "w-full justify-between",
                        errors.paymentMethodId ? "border-destructive" : ""
                      )}
                    >
                      {form.paymentMethodId
                        ? paymentMethods.find(method => method.id === form.paymentMethodId)?.label || "Unknown payment method"
                        : "Select payment method..."
                      }
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search payment method..." />
                      <CommandEmpty>No payment method found.</CommandEmpty>
                      <CommandList className="max-h-[300px] overflow-auto">
                        <CommandGroup>
                          <div className="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            <span>Payment Methods</span>
                            <Settings
                              className="h-4 w-4 cursor-pointer hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation()
                                setPaymentOpen(false)
                                navigate('/settings?tab=options')
                              }}
                            />
                          </div>
                          {paymentMethods.map((method) => (
                            <CommandItem
                              key={method.value}
                              value={method.value}
                              onSelect={handlePaymentMethodSelect}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.paymentMethodId === method.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {method.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.paymentMethodId && (
                  <p className="text-destructive text-xs mt-1">{errors.paymentMethodId}</p>
                )}
              </div>
            </div>

            {/* Start Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Start Date
              </Label>
              <div className="col-span-3">
                <DatePicker
                  value={form.startDate ? new Date(form.startDate) : undefined}
                  onChange={(date) => {
                    if (date) {
                      setForm(prev => ({ ...prev, startDate: format(date, "yyyy-MM-dd") }))
                    }
                  }}
                  placeholder="Pick a date"
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={form.status}
                onValueChange={(value: "active" | "trial" | "cancelled") => handleSelectChange("status", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Renewal Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="renewalType" className="text-right">
                Renewal Type
              </Label>
              <Select
                value={form.renewalType}
                onValueChange={(value: "auto" | "manual") => handleSelectChange("renewalType", value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select renewal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatic Renewal</SelectItem>
                  <SelectItem value="manual">Manual Renewal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Website */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="website" className="text-right">
                Website
              </Label>
              <Input
                id="website"
                name="website"
                value={form.website || ""}
                onChange={handleChange}
                placeholder="https://example.com"
                className="col-span-3"
              />
            </div>

            {/* Notes */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={form.notes || ""}
                onChange={handleChange}
                placeholder="Any additional information..."
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Update" : "Add"} Subscription
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}