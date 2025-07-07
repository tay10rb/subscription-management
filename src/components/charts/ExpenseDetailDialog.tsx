import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { formatCurrency } from "@/lib/subscription-utils"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api')
import {
  Search,
  Calendar,
  DollarSign,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react"
import { ExpenseInfoData } from "./ExpenseInfoCards"

// 生成指定日期范围内的所有月份键（只到当前月份）
function generateMonthKeys(startDate: string, endDate: string): string[] {
  const monthKeys: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  const now = new Date()

  // 确保结束日期不超过当前月份
  const actualEnd = new Date(Math.min(end.getTime(), now.getTime()))

  const current = new Date(start.getFullYear(), start.getMonth(), 1)

  while (current <= actualEnd) {
    const year = current.getFullYear()
    const month = current.getMonth() + 1
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`
    monthKeys.push(monthKey)
    current.setMonth(current.getMonth() + 1)
  }

  return monthKeys
}

// 按订阅ID合并支付详情，累加分配金额（仅针对yearly和quarterly订阅）
function mergePaymentDetailsBySubscriptionWithCount(paymentDetails: PaymentRecord[]): {
  mergedPayments: PaymentRecord[],
  allocatedCount: number
} {
  const mergedMap = new Map<number, PaymentRecord>()
  const monthlyPayments: PaymentRecord[] = []
  let allocatedCount = 0

  paymentDetails.forEach(payment => {
    const subscriptionId = payment.subscriptionId
    const billingCycle = payment.billingCycle?.toLowerCase()

    // 只对yearly和quarterly订阅进行合并，monthly订阅保持原样
    if (billingCycle === 'yearly' || billingCycle === 'quarterly') {
      allocatedCount++ // 每次遇到yearly/quarterly订阅就计数

      if (!mergedMap.has(subscriptionId)) {
        // 首次遇到此订阅，直接存储
        mergedMap.set(subscriptionId, {
          ...payment,
          allocatedAmount: payment.allocatedAmount || payment.amountPaid
        })
      } else {
        // 已存在此订阅，累加分配金额
        const existing = mergedMap.get(subscriptionId)!
        existing.allocatedAmount = (existing.allocatedAmount || existing.amountPaid) +
                                  (payment.allocatedAmount || payment.amountPaid)
      }
    } else {
      // monthly订阅直接添加到结果中，不进行合并
      monthlyPayments.push(payment)
    }
  })

  // 合并yearly/quarterly订阅和monthly订阅
  return {
    mergedPayments: [...Array.from(mergedMap.values()), ...monthlyPayments],
    allocatedCount
  }
}

interface PaymentRecord {
  id: number
  subscriptionId: number
  subscriptionName: string
  subscriptionPlan: string
  paymentDate: string
  amountPaid: number
  allocatedAmount?: number
  currency: string
  billingPeriod: {
    start: string
    end: string
  }
  billingCycle?: string
  isActualPaymentMonth?: boolean
  status: string
  notes?: string
}

interface PaymentHistoryResponse {
  payments: PaymentRecord[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
  filters: {
    startDate: string | null
    endDate: string | null
    status: string | null
    currency: string | null
  }
}

interface ExpenseDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  periodData: ExpenseInfoData
}

export function ExpenseDetailDialog({ isOpen, onClose, periodData }: ExpenseDetailDialogProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  
  const pageSize = 10

  // Fetch payment data when dialog opens
  useEffect(() => {
    if (isOpen && periodData) {
      fetchPaymentData()
    }
  }, [isOpen, periodData])

  // Reset current page when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const fetchPaymentData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      let allPaymentDetails: PaymentRecord[] = []

      if (periodData.periodType === 'monthly') {
        // 月度数据：直接获取单个月份的数据
        const date = new Date(periodData.startDate)
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`

        const response = await fetch(`${API_BASE_URL}/monthly-expenses/${monthKey}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch monthly expense data: ${response.statusText}`)
        }

        const result = await response.json()

        // Handle new unified response format
        let data;
        if (result.success && result.data) {
          data = result.data;
        } else if (result.paymentDetails) {
          // Fallback for old format
          data = result;
        } else {
          throw new Error(result.message || 'Failed to fetch monthly expense data');
        }

        allPaymentDetails = data.paymentDetails || []

        // 为月度数据设置默认的分配次数
        ;(allPaymentDetails as any).allocatedCount = 0
      } else {
        // 季度或年度数据：获取多个月份的数据并合并
        const monthKeys = generateMonthKeys(periodData.startDate, periodData.endDate)

        // 并行获取所有月份的数据
        const monthlyDataPromises = monthKeys.map(async (monthKey: string) => {
          try {
            const response = await fetch(`${API_BASE_URL}/monthly-expenses/${monthKey}`)
            if (response.ok) {
              const result = await response.json()

              // Handle new unified response format
              let data;
              if (result.success && result.data) {
                data = result.data;
              } else if (result.paymentDetails) {
                // Fallback for old format
                data = result;
              } else {
                return [];
              }

              return data.paymentDetails || []
            }
            return []
          } catch (error) {
            console.warn(`Failed to fetch data for month ${monthKey}:`, error)
            return []
          }
        })

        const monthlyDataResults = await Promise.all(monthlyDataPromises)

        // 将所有月份的 paymentDetails 合并到一个大数组
        const combinedPaymentDetails = monthlyDataResults.flat()

        // 按 subscriptionId 合并相同订阅的数据，同时记录分配次数
        const { mergedPayments, allocatedCount } = mergePaymentDetailsBySubscriptionWithCount(combinedPaymentDetails)
        allPaymentDetails = mergedPayments

        // 存储分配次数供后续使用
        ;(allPaymentDetails as any).allocatedCount = allocatedCount
      }

      setPayments(allPaymentDetails)
      setTotalRecords(allPaymentDetails.length)
      setTotalPages(Math.ceil(allPaymentDetails.length / pageSize))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment data')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter payments based on search term
  const filteredPayments = payments.filter(payment =>
    (payment.subscriptionName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (payment.subscriptionPlan?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  // Paginate filtered payments
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex)

  // Update pagination info based on filtered results
  const filteredTotalPages = Math.ceil(filteredPayments.length / pageSize)

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';

    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (error) {
      return 'Invalid Date';
    }
  }

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'refunded':
        return 'bg-yellow-100 text-yellow-800'
      case 'unknown':
      case null:
      case undefined:
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {periodData.period} - Payment Details
          </DialogTitle>
          <DialogDescription>
            View all payment records for this period
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-semibold">{formatCurrency(periodData.totalSpent, periodData.currency)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Payments</p>
                  <p className="font-semibold">
                    {payments.filter(p => p.billingCycle === 'monthly').length}
                    {(payments as any).allocatedCount > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (+{(payments as any).allocatedCount} allocated)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Daily Avg</p>
                  <p className="font-semibold">{formatCurrency(periodData.dailyAverage, periodData.currency)}</p>
                </div>
              </div>
            </CardContent>
          </Card>


        </div>

        {/* Search */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subscriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Payment List */}
        <div className="h-[400px] w-full border border-gray-200 rounded-md overflow-y-auto">
          <div className="space-y-2 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading payments...</span>
              </div>
            ) : error ? (
              <div className="text-center text-destructive p-4">
                <p>Error loading payments: {error}</p>
                <Button variant="outline" onClick={fetchPaymentData} className="mt-2">
                  Retry
                </Button>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center text-muted-foreground p-4">
                No payments found for this period
              </div>
            ) : (
              paginatedPayments.map((payment, index) => (
                <Card
                  key={payment.id}
                  className="hover:bg-muted/50 transition-all duration-200 hover:shadow-md animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{payment.subscriptionName || 'Unknown Subscription'}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {payment.subscriptionPlan || 'Unknown Plan'}
                          </Badge>
                          <Badge className={`text-xs ${getStatusColor(payment.status || 'unknown')}`}>
                            {payment.status || 'Unknown'}
                          </Badge>
                          {payment.billingCycle && payment.billingCycle !== 'monthly' && (
                            <Badge variant="outline" className="text-xs">
                              {payment.billingCycle}
                            </Badge>
                          )}
                          {(payment.billingCycle === 'yearly' || payment.billingCycle === 'quarterly') && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                              Allocated
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Paid: {formatDate(payment.paymentDate)}</span>
                          <span>
                            Billing: {formatDate(payment.billingPeriod?.start)} - {formatDate(payment.billingPeriod?.end)}
                          </span>
                        </div>
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {payment.allocatedAmount && payment.allocatedAmount !== payment.amountPaid &&
                         (payment.billingCycle === 'yearly' || payment.billingCycle === 'quarterly') ? (
                          <>
                            <p className="font-semibold">
                              {formatCurrency(payment.allocatedAmount, payment.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {periodData.periodType !== 'monthly'
                                ? `Total allocated for ${periodData.period}`
                                : `Allocated from ${formatCurrency(payment.amountPaid, payment.currency)}`
                              }
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold">
                              {formatCurrency(payment.amountPaid, payment.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">{payment.currency}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {filteredTotalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredPayments.length)} of {filteredPayments.length} payments
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {filteredTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(filteredTotalPages, prev + 1))}
                disabled={currentPage === filteredTotalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
