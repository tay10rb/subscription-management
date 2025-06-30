import { useState, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { format } from "date-fns"

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
  CommandSeparator,
  CommandList,
} from "@/components/ui/command"
import { CurrencySelector } from "@/components/subscription/CurrencySelector"

import { Subscription, useSubscriptionStore } from "@/store/subscriptionStore"

// Form data type - excludes auto-calculated fields
type SubscriptionFormData = Omit<Subscription, "id" | "lastBillingDate">

interface SubscriptionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Subscription
  onSubmit: (data: SubscriptionFormData) => void
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
  // Get categories, payment methods and plan options from store
  const { 
    categories, 
    addCategory, 
    paymentMethods, 
    addPaymentMethod, 
    subscriptionPlans, 
    addSubscriptionPlan 
  } = useSubscriptionStore()

  // State for form data and validation errors
  const [form, setForm] = useState<SubscriptionFormData>({
    name: "",
    plan: "",
    billingCycle: "monthly",
    nextBillingDate: format(new Date(), "yyyy-MM-dd"),
    amount: 0,
    currency: "USD",
    paymentMethod: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    status: "active",
    category: "",
    notes: "",
    website: ""
  })

  // State for form errors
  const [errors, setErrors] = useState<FormErrors>({})

  // State for custom dropdown values
  const [customCategory, setCustomCategory] = useState("")
  const [customPaymentMethod, setCustomPaymentMethod] = useState("")
  const [customPlan, setCustomPlan] = useState("")

  // Popover open states
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)

  // Initialize form with initial data if provided
  useEffect(() => {
    if (initialData) {
      const { lastBillingDate, ...formData } = initialData
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
          nextBillingDate: format(new Date(), "yyyy-MM-dd"),
          amount: 0,
          currency: "USD",
          paymentMethod: "",
          startDate: format(new Date(), "yyyy-MM-dd"),
          status: "active",
          category: "",
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

  // Handle category selection or creation
  const handleCategorySelect = (value: string) => {
    if (value === 'create-new' && customCategory) {
      // Create a new category
      const formattedCategory = customCategory.toLowerCase().replace(/\s+/g, '-')
      const newCategory = {
        value: formattedCategory,
        label: customCategory.trim()
      }
      
      addCategory(newCategory)
      setForm(prev => ({ ...prev, category: formattedCategory }))
      setCustomCategory("")
    } else {
      setForm(prev => ({ ...prev, category: value }))
    }
    
    setCategoryOpen(false)
    
    // Clear error for this field if any
    if (errors.category) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.category
        return newErrors
      })
    }
  }
  
  // Handle payment method selection or creation
  const handlePaymentMethodSelect = (value: string) => {
    if (value === 'create-new' && customPaymentMethod) {
      // Create a new payment method
      const formattedPaymentMethod = customPaymentMethod.toLowerCase().replace(/\s+/g, '-')
      const newPaymentMethod = {
        value: formattedPaymentMethod,
        label: customPaymentMethod.trim()
      }
      
      addPaymentMethod(newPaymentMethod)
      setForm(prev => ({ ...prev, paymentMethod: formattedPaymentMethod }))
      setCustomPaymentMethod("")
    } else {
      setForm(prev => ({ ...prev, paymentMethod: value }))
    }
    
    setPaymentOpen(false)
    
    // Clear error for this field if any
    if (errors.paymentMethod) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.paymentMethod
        return newErrors
      })
    }
  }

  // Handle plan selection or creation
  const handlePlanSelect = (value: string) => {
    if (value === 'create-new' && customPlan) {
      // Create a new plan
      const formattedPlan = form.name 
        ? `${form.name.toLowerCase()}-${customPlan.toLowerCase().replace(/\s+/g, '-')}` 
        : customPlan.toLowerCase().replace(/\s+/g, '-')
      
      const newPlan = {
        value: formattedPlan,
        label: customPlan.trim(),
        service: form.name || undefined
      }
      
      addSubscriptionPlan(newPlan)
      setForm(prev => ({ ...prev, plan: customPlan.trim() }))
      setCustomPlan("")
    } else {
      // Find the plan label
      const plan = subscriptionPlans.find(p => p.value === value)
      setForm(prev => ({ ...prev, plan: plan ? plan.label : value }))
    }
    
    setPlanOpen(false)
    
    // Clear error for this field if any
    if (errors.plan) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.plan
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
    if (!form.category) newErrors.category = "Category is required"
    if (!form.paymentMethod) newErrors.paymentMethod = "Payment method is required"
    if (form.amount <= 0) newErrors.amount = "Amount must be greater than 0"
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    // Submit the form
    onSubmit(form)
    onOpenChange(false)
  }

  // Get relevant subscription plans for the current service
  const getRelevantPlans = () => {
    if (!form.name) return subscriptionPlans
    
    const nameLower = form.name.toLowerCase()
    const servicePlans = subscriptionPlans.filter(
      plan => plan.service && plan.service.toLowerCase().includes(nameLower)
    )
    
    return servicePlans.length > 0
      ? servicePlans
      : subscriptionPlans.filter(plan => !plan.service)
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
                <Popover open={planOpen} onOpenChange={setPlanOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={planOpen}
                      className={cn(
                        "w-full justify-between",
                        errors.plan ? "border-destructive" : ""
                      )}
                    >
                      {form.plan || "Select plan..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search plan..." />
                      <CommandEmpty>No plan found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup heading="Options">
                          {getRelevantPlans().map((plan) => (
                            <CommandItem
                              key={plan.value}
                              value={plan.value}
                              onSelect={handlePlanSelect}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.plan === plan.label ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {plan.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                          <div className="flex items-center border-t px-3 py-2">
                            <Input
                              placeholder="Add custom plan..."
                              value={customPlan}
                              onChange={(e) => setCustomPlan(e.target.value)}
                              className="flex-1 mr-2"
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={!customPlan}
                              onClick={() => handlePlanSelect('create-new')}
                            >
                              Add
                            </Button>
                          </div>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                        errors.category ? "border-destructive" : ""
                      )}
                    >
                      {form.category 
                        ? categories.find(category => category.value === form.category)?.label || form.category
                        : "Select category..."
                      }
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search category..." />
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup heading="Categories">
                          {categories.map((category) => (
                            <CommandItem
                              key={category.value}
                              value={category.value}
                              onSelect={handleCategorySelect}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.category === category.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {category.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                          <div className="flex items-center border-t px-3 py-2">
                            <Input
                              placeholder="Add custom category..."
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              className="flex-1 mr-2"
                            />
                            <Button 
                              type="button"
                              size="sm"
                              disabled={!customCategory}
                              onClick={() => handleCategorySelect('create-new')}
                            >
                              Add
                            </Button>
                          </div>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.category && (
                  <p className="text-destructive text-xs mt-1">{errors.category}</p>
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

            {/* Next Billing Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Next Billing Date
              </Label>
              <div className="col-span-3">
                <DatePicker
                  value={form.nextBillingDate ? new Date(form.nextBillingDate) : undefined}
                  onChange={(date) => {
                    if (date) {
                      setForm(prev => ({ ...prev, nextBillingDate: format(date, "yyyy-MM-dd") }))
                    }
                  }}
                  placeholder="Pick a date"
                />
              </div>
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
                        errors.paymentMethod ? "border-destructive" : ""
                      )}
                    >
                      {form.paymentMethod 
                        ? paymentMethods.find(method => method.value === form.paymentMethod)?.label || form.paymentMethod
                        : "Select payment method..."
                      }
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search payment method..." />
                      <CommandEmpty>No payment method found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup heading="Payment Methods">
                          {paymentMethods.map((method) => (
                            <CommandItem
                              key={method.value}
                              value={method.value}
                              onSelect={handlePaymentMethodSelect}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.paymentMethod === method.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {method.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup>
                          <div className="flex items-center border-t px-3 py-2">
                            <Input
                              placeholder="Add custom payment method..."
                              value={customPaymentMethod}
                              onChange={(e) => setCustomPaymentMethod(e.target.value)}
                              className="flex-1 mr-2"
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={!customPaymentMethod}
                              onClick={() => handlePaymentMethodSelect('create-new')}
                            >
                              Add
                            </Button>
                          </div>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.paymentMethod && (
                  <p className="text-destructive text-xs mt-1">{errors.paymentMethod}</p>
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