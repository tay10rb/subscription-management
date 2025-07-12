import { useState, useEffect } from "react"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Calendar,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Copy
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { useSettingsStore } from "@/store/settingsStore"
import { PaymentRecord, transformPaymentsFromApi } from "@/utils/dataTransform"
import { formatWithUserCurrency } from "@/utils/currency"
import { formatDate } from "@/lib/subscription-utils"
import { PaymentHistorySheet } from "./PaymentHistorySheet"


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

interface PaymentHistorySectionProps {
  subscriptionId: number
  subscriptionName: string
}

export function PaymentHistorySection({ subscriptionId, subscriptionName }: PaymentHistorySectionProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null)
  const { toast } = useToast()
  const { apiKey } = useSettingsStore()

  // Helper function to get headers with authentication
  const getHeaders = () => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (apiKey) {
      headers['X-API-KEY'] = apiKey
    }
    return headers
  }

  // Fetch payment history for this subscription
  const fetchPaymentHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/payment-history?subscription_id=${subscriptionId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch payment history: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.success && result.data) {
        const transformedPayments = transformPaymentsFromApi(result.data)
        setPayments(transformedPayments)
      } else {
        throw new Error(result.message || 'Failed to fetch payment history')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payment history'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load payment history when component mounts
  useEffect(() => {
    fetchPaymentHistory()
  }, [subscriptionId])

  // Handle adding new payment
  const handleAddPayment = async (paymentData: any) => {
    if (!apiKey) {
      toast({
        title: "Error",
        description: "API key not configured. Please set your API key in Settings.",
        variant: "destructive",
      })
      throw new Error('API key not configured')
    }

    try {
      const response = await fetch(`${API_BASE_URL}/protected/payment-history`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(paymentData),
      })

      if (!response.ok) {
        throw new Error(`Failed to create payment: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.success) {
        toast({
          title: "Success",
          description: "Payment record created successfully",
        })
        setShowAddForm(false)
        fetchPaymentHistory() // Refresh the list
      } else {
        throw new Error(result.message || 'Failed to create payment')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }

  // Handle editing payment
  const handleEditPayment = async (paymentData: any) => {
    if (!editingPayment) return
    
    if (!apiKey) {
      toast({
        title: "Error",
        description: "API key not configured. Please set your API key in Settings.",
        variant: "destructive",
      })
      throw new Error('API key not configured')
    }

    try {
      const response = await fetch(`${API_BASE_URL}/protected/payment-history/${editingPayment.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(paymentData),
      })

      if (!response.ok) {
        throw new Error(`Failed to update payment: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.success) {
        toast({
          title: "Success",
          description: "Payment record updated successfully",
        })
        setEditingPayment(null)
        fetchPaymentHistory() // Refresh the list
      } else {
        throw new Error(result.message || 'Failed to update payment')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update payment'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    }
  }

  // Handle copying payment details
  const handleCopyPaymentDetails = (payment: PaymentRecord) => {
    const paymentDetails = `Payment: ${formatWithUserCurrency(payment.amountPaid, payment.currency)}
Date: ${formatDate(payment.paymentDate)}
Status: ${payment.status}
Period: ${formatDate(payment.billingPeriod.start)} - ${formatDate(payment.billingPeriod.end)}`
    navigator.clipboard.writeText(paymentDetails)
    toast({
      title: "Copied",
      description: "Payment details copied to clipboard",
    })
  }

  // Handle deleting payment
  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm('Are you sure you want to delete this payment record?')) {
      return
    }

    if (!apiKey) {
      toast({
        title: "Error",
        description: "API key not configured. Please set your API key in Settings.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/protected/payment-history/${paymentId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Failed to delete payment: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.success) {
        toast({
          title: "Success",
          description: "Payment record deleted successfully",
        })
        fetchPaymentHistory() // Refresh the list
      } else {
        throw new Error(result.message || 'Failed to delete payment')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete payment'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // Filter payments based on search term
  const filteredPayments = payments.filter(payment =>
    payment.paymentDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.amountPaid.toString().includes(searchTerm)
  )

  // Get status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'refunded':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button and Search */}
      <div className="flex flex-col gap-3 sm:gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Payment History</span>
            <Badge variant="outline" className="text-xs">
              {filteredPayments.length} records
            </Badge>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            size="sm"
            className="gap-1.5 text-xs h-8 w-full sm:w-auto"
          >
            <Plus className="h-3 w-3" />
            Add Payment
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm h-8"
          />
        </div>
      </div>

      {/* Payment List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-sm">Loading payments...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive mb-2">{error}</p>
            <Button variant="outline" onClick={fetchPaymentHistory} size="sm">
              Retry
            </Button>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {searchTerm ? 'No payments found matching your search' : 'No payment records found'}
            </p>
          </div>
        ) : (
          filteredPayments.map((payment) => (
            <Card key={payment.id} className="group hover:bg-muted/50 transition-all duration-200 border hover:border-muted-foreground/20">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="font-semibold text-base">
                        {formatWithUserCurrency(payment.amountPaid, payment.currency)}
                      </span>
                      <Badge 
                        variant={getStatusBadgeVariant(payment.status)} 
                        className="text-xs h-5 px-2 w-fit font-medium"
                      >
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Paid: {formatDate(payment.paymentDate)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Billing Period:</span>
                        <br className="sm:hidden" />
                        <span className="sm:ml-2">
                          {formatDate(payment.billingPeriod.start)} - {formatDate(payment.billingPeriod.end)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-end sm:justify-start">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-60 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setEditingPayment(payment)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Edit className="h-4 w-4" />
                          Edit Payment
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleCopyPaymentDetails(payment)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Copy className="h-4 w-4" />
                          Copy Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeletePayment(payment.id)}
                          className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Payment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Payment History Sheet */}
      <PaymentHistorySheet
        open={showAddForm || editingPayment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false)
            setEditingPayment(null)
          }
        }}
        initialData={editingPayment || undefined}
        subscriptionId={subscriptionId}
        subscriptionName={subscriptionName}
        onSubmit={editingPayment ? handleEditPayment : handleAddPayment}
      />
    </div>
  )
}
