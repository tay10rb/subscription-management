import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { convertCurrency } from '@/utils/currency'
import { useSettingsStore } from './settingsStore'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api')

// Helper to calculate the last billing date from the next one
const calculateLastBillingDate = (nextBillingDate: string, billingCycle: BillingCycle): string => {
  const nextDate = new Date(nextBillingDate)
  switch (billingCycle) {
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() - 1)
      break
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() - 1)
      break
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() - 3)
      break
  }
  return nextDate.toISOString().split('T')[0]
}

// Helper function to get headers, including API key for write operations
const getHeaders = (method: 'GET' | 'POST' | 'PUT' | 'DELETE') => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (method !== 'GET') {
    const { apiKey } = useSettingsStore.getState()
    if (apiKey) {
      headers['X-API-KEY'] = apiKey
    }
  }
  return headers
}

// Helper function to transform data from API (snake_case) to frontend (camelCase)
const transformFromApi = (sub: any): Subscription => {
  return {
    id: sub.id,
    name: sub.name,
    plan: sub.plan,
    billingCycle: sub.billing_cycle,
    nextBillingDate: sub.next_billing_date,
    lastBillingDate: sub.last_billing_date,
    amount: sub.amount,
    currency: sub.currency,
    paymentMethod: sub.payment_method,
    startDate: sub.start_date,
    status: sub.status,
    category: sub.category,
    notes: sub.notes,
    website: sub.website,
  }
}

// Helper function to transform data from frontend (camelCase) to API (snake_case)
const transformToApi = (sub: Partial<Subscription>) => {
  const result: any = {}
  if (sub.name !== undefined) result.name = sub.name
  if (sub.plan !== undefined) result.plan = sub.plan
  if (sub.billingCycle !== undefined) result.billing_cycle = sub.billingCycle
  if (sub.nextBillingDate !== undefined) result.next_billing_date = sub.nextBillingDate
  if (sub.lastBillingDate !== undefined) result.last_billing_date = sub.lastBillingDate
  if (sub.amount !== undefined) result.amount = sub.amount
  if (sub.currency !== undefined) result.currency = sub.currency
  if (sub.paymentMethod !== undefined) result.payment_method = sub.paymentMethod
  if (sub.startDate !== undefined) result.start_date = sub.startDate
  if (sub.status !== undefined) result.status = sub.status
  if (sub.category !== undefined) result.category = sub.category
  if (sub.notes !== undefined) result.notes = sub.notes
  if (sub.website !== undefined) result.website = sub.website
  return result
}

export type SubscriptionStatus = 'active' | 'trial' | 'cancelled'
export type BillingCycle = 'monthly' | 'yearly' | 'quarterly'
// Updated to allow custom categories
export type SubscriptionCategory = 'video' | 'music' | 'software' | 'cloud' | 'news' | 'game' | 'other' | string

export interface Subscription {
  id: number // Changed from string to number
  name: string
  plan: string
  billingCycle: BillingCycle
  nextBillingDate: string
  lastBillingDate: string | null
  amount: number
  currency: string
  paymentMethod: string
  startDate: string
  status: SubscriptionStatus
  category: SubscriptionCategory
  notes: string
  website?: string
}

// Define the structured options
interface CategoryOption {
  value: string
  label: string
}

interface PaymentMethodOption {
  value: string
  label: string
}

interface SubscriptionPlanOption {
  value: string
  label: string
  service?: string // Optional association with specific service
}

interface SubscriptionState {
  subscriptions: Subscription[]
  // Custom options for dropdowns
  categories: CategoryOption[]
  paymentMethods: PaymentMethodOption[]
  subscriptionPlans: SubscriptionPlanOption[]
  isLoading: boolean
  error: string | null
  
  // CRUD operations
  addSubscription: (subscription: Omit<Subscription, 'id' | 'lastBillingDate'>) => Promise<{ error: any | null }>
  bulkAddSubscriptions: (subscriptions: Omit<Subscription, 'id' | 'lastBillingDate'>[]) => Promise<{ error: any | null }>
  updateSubscription: (id: number, subscription: Partial<Subscription>) => Promise<{ error: any | null }>
  deleteSubscription: (id: number) => Promise<{ error: any | null }>
  resetSubscriptions: () => void
  fetchSubscriptions: () => Promise<void>
  
  // Option management
  addCategory: (category: CategoryOption) => void
  addPaymentMethod: (paymentMethod: PaymentMethodOption) => void
  addSubscriptionPlan: (plan: SubscriptionPlanOption) => void
  
  // Stats and analytics
  getTotalMonthlySpending: () => number
  getTotalYearlySpending: () => number
  getUpcomingRenewals: (days: number) => Subscription[]
  getRecentlyPaid: (days: number) => Subscription[]
  getSpendingByCategory: () => Record<string, number>
  
  // Get unique categories from subscriptions
  getUniqueCategories: () => CategoryOption[]
}

// Initial options
const initialCategories: CategoryOption[] = [
  { value: 'video', label: 'Video Streaming' },
  { value: 'music', label: 'Music Streaming' },
  { value: 'software', label: 'Software' },
  { value: 'cloud', label: 'Cloud Storage' },
  { value: 'news', label: 'News & Magazines' },
  { value: 'game', label: 'Games' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'education', label: 'Education' },
  { value: 'finance', label: 'Finance' },
  { value: 'other', label: 'Other' }
]

const initialPaymentMethods: PaymentMethodOption[] = [
  { value: 'visa', label: 'Visa Card' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'amex', label: 'American Express' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'applepay', label: 'Apple Pay' },
  { value: 'googlepay', label: 'Google Pay' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'alipay', label: 'Alipay' },
  { value: 'wechatpay', label: 'WeChat Pay' }
]

const initialSubscriptionPlans: SubscriptionPlanOption[] = [
  { value: 'netflix-basic', label: 'Basic', service: 'Netflix' },
  { value: 'netflix-standard', label: 'Standard', service: 'Netflix' },
  { value: 'netflix-premium', label: 'Premium', service: 'Netflix' },
  { value: 'spotify-individual', label: 'Individual', service: 'Spotify' },
  { value: 'spotify-duo', label: 'Duo', service: 'Spotify' },
  { value: 'spotify-family', label: 'Family', service: 'Spotify' },
  { value: 'apple-50gb', label: '50GB Storage', service: 'iCloud' },
  { value: 'apple-200gb', label: '200GB Storage', service: 'iCloud' },
  { value: 'apple-2tb', label: '2TB Storage', service: 'iCloud' },
  { value: 'microsoft-personal', label: 'Personal', service: 'Microsoft 365' },
  { value: 'microsoft-family', label: 'Family', service: 'Microsoft 365' },
  { value: 'youtube-individual', label: 'Individual', service: 'YouTube Premium' },
  { value: 'youtube-family', label: 'Family', service: 'YouTube Premium' }
]

// Mock data is no longer the primary source, but can be kept for reset/testing
const mockSubscriptions: Subscription[] = [
  {
    id: 1, // Changed to number
    name: 'Netflix',
    plan: 'Standard',
    billingCycle: 'monthly',
    nextBillingDate: '2025-06-15',
    lastBillingDate: null,
    amount: 15.99,
    currency: 'USD',
    paymentMethod: 'visa',
    startDate: '2023-01-15',
    status: 'active',
    category: 'video',
    notes: 'Family account',
    website: 'https://netflix.com'
  },
  {
    id: 2, // Changed to number
    name: 'Spotify',
    plan: 'Family',
    billingCycle: 'monthly',
    nextBillingDate: '2025-06-05',
    lastBillingDate: null,
    amount: 14.99,
    currency: 'USD',
    paymentMethod: 'paypal',
    startDate: '2022-05-10',
    status: 'active',
    category: 'music',
    notes: 'Shared with 5 people'
  },
  {
    id: 3, // Changed to number
    name: 'Microsoft 365',
    plan: 'Family',
    billingCycle: 'yearly',
    nextBillingDate: '2026-01-20',
    lastBillingDate: null,
    amount: 99.99,
    currency: 'USD',
    paymentMethod: 'visa',
    startDate: '2023-01-20',
    status: 'active',
    category: 'software',
    notes: '6 users, 1TB storage each',
    website: 'https://microsoft.com'
  },
  {
    id: 4, // Changed to number
    name: 'iCloud',
    plan: '50GB Storage',
    billingCycle: 'monthly',
    nextBillingDate: '2025-05-30',
    lastBillingDate: null,
    amount: 0.99,
    currency: 'USD',
    paymentMethod: 'applepay',
    startDate: '2022-08-01',
    status: 'active',
    category: 'cloud',
    notes: 'Personal storage'
  },
  {
    id: 5, // Changed to number
    name: 'YouTube Premium',
    plan: 'Individual',
    billingCycle: 'monthly',
    nextBillingDate: '2025-06-10',
    lastBillingDate: null,
    amount: 11.99,
    currency: 'USD',
    paymentMethod: 'googlepay',
    startDate: '2023-02-15',
    status: 'active',
    category: 'video',
    notes: 'No ads, background play'
  }
]

// Create store with persistence
export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscriptions: [],
      categories: initialCategories,
      paymentMethods: initialPaymentMethods,
      subscriptionPlans: initialSubscriptionPlans,
      isLoading: false,
      error: null,
      
      // Fetch subscriptions from the backend API
      fetchSubscriptions: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE_URL}/subscriptions`, {
            method: 'GET',
            headers: getHeaders('GET'),
          })
          if (!response.ok) {
            throw new Error('Failed to fetch subscriptions')
          }
          const data = await response.json()
          const transformedData = data.map(transformFromApi)
          set({ subscriptions: transformedData, isLoading: false })
        } catch (error: any) {
          console.error('Error fetching subscriptions:', error)
          set({ error: error.message, isLoading: false, subscriptions: [] }) // Clear subscriptions on error
        }
      },
      
      // Add a new subscription
      addSubscription: async (subscription) => {
        try {
          const subscriptionWithLastBilling = { 
            ...subscription, 
            lastBillingDate: calculateLastBillingDate(
              subscription.nextBillingDate,
              subscription.billingCycle
            )
          }
          const apiSubscription = transformToApi(subscriptionWithLastBilling)
          const response = await fetch(`${API_BASE_URL}/subscriptions`, {
            method: 'POST',
            headers: getHeaders('POST'),
            body: JSON.stringify(apiSubscription),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Failed to add subscription')
          }
          
          // Refetch all subscriptions to get the new one with its DB-generated ID
          await get().fetchSubscriptions()
          return { error: null }
        } catch (error: any) {
          console.error('Error adding subscription:', error)
          set({ error: error.message })
          return { error }
        }
      },
      
      // Bulk add subscriptions
      bulkAddSubscriptions: async (subscriptions) => {
        try {
          const apiSubscriptions = subscriptions.map(sub => {
            const subWithLastBilling = { 
              ...sub,
              lastBillingDate: calculateLastBillingDate(
                sub.nextBillingDate,
                sub.billingCycle
              )
            };
            return transformToApi(subWithLastBilling);
          });

          const response = await fetch(`${API_BASE_URL}/subscriptions/bulk`, {
            method: 'POST',
            headers: getHeaders('POST'),
            body: JSON.stringify(apiSubscriptions),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to bulk add subscriptions');
          }

          await get().fetchSubscriptions();
          return { error: null };
        } catch (error: any) {
          console.error('Error bulk adding subscriptions:', error);
          set({ error: error.message });
          return { error };
        }
      },

      // Update an existing subscription
      updateSubscription: async (id, updatedSubscription) => {
        try {
          const originalSubscription = get().subscriptions.find(sub => sub.id === id)
          const subscriptionWithLastBilling = { ...updatedSubscription }

          if (originalSubscription && updatedSubscription.nextBillingDate && updatedSubscription.nextBillingDate !== originalSubscription.nextBillingDate) {
            const billingCycle = updatedSubscription.billingCycle || originalSubscription.billingCycle
            subscriptionWithLastBilling.lastBillingDate = calculateLastBillingDate(
              updatedSubscription.nextBillingDate,
              billingCycle
            )
          }
          const apiSubscription = transformToApi(subscriptionWithLastBilling)
          const response = await fetch(`${API_BASE_URL}/subscriptions/${id}`, {
            method: 'PUT',
            headers: getHeaders('PUT'),
            body: JSON.stringify(apiSubscription),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Failed to update subscription')
          }
          
          // Refetch to ensure data consistency
          await get().fetchSubscriptions()
          return { error: null }
        } catch (error: any) {
          console.error('Error updating subscription:', error)
          set({ error: error.message })
          return { error }
        }
      },
      
      // Delete a subscription
      deleteSubscription: async (id) => {
        try {
          const response = await fetch(`${API_BASE_URL}/subscriptions/${id}`, {
            method: 'DELETE',
            headers: getHeaders('DELETE'),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Failed to delete subscription')
          }

          // Refetch to reflect the deletion
          await get().fetchSubscriptions()
          return { error: null }
        } catch (error: any) {
          console.error('Error deleting subscription:', error)
          set({ error: error.message })
          return { error }
        }
      },

      // Reset subscriptions by calling the backend endpoint
      resetSubscriptions: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/subscriptions/reset`, {
            method: 'POST',
            headers: getHeaders('POST'),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to reset subscriptions');
          }

          // Refetch to ensure the UI is cleared
          await get().fetchSubscriptions();
          return { error: null };
        } catch (error: any) {
          console.error('Error resetting subscriptions:', error);
          set({ error: error.message });
          return { error };
        }
      },
      
      // Add a new category option
      addCategory: (category) => set((state) => {
        if (state.categories.some(c => c.value === category.value)) {
          return state; // Category already exists
        }
        return { categories: [...state.categories, category] };
      }),
      
      // Add a new payment method option
      addPaymentMethod: (paymentMethod) => set((state) => {
        if (state.paymentMethods.some(p => p.value === paymentMethod.value)) {
          return state; // Payment method already exists
        }
        return { paymentMethods: [...state.paymentMethods, paymentMethod] };
      }),
      
      // Add a new subscription plan option
      addSubscriptionPlan: (plan) => set((state) => {
        if (state.subscriptionPlans.some(p => p.value === plan.value)) {
          return state; // Plan already exists
        }
        return { subscriptionPlans: [...state.subscriptionPlans, plan] };
      }),
      
      // Get total monthly spending
      getTotalMonthlySpending: () => {
        const { subscriptions } = get();
        const { currency: userCurrency } = useSettingsStore.getState();
        
        return subscriptions
          .filter(sub => sub.status === 'active')
          .reduce((total, sub) => {
            // Convert the amount to user's preferred currency
            const convertedAmount = convertCurrency(sub.amount, sub.currency, userCurrency);
            
            switch (sub.billingCycle) {
              case 'monthly':
                return total + convertedAmount;
              case 'yearly':
                return total + (convertedAmount / 12);
              case 'quarterly':
                return total + (convertedAmount / 3);
              default:
                return total;
            }
          }, 0);
      },
      
      // Get total yearly spending
      getTotalYearlySpending: () => {
        const { subscriptions } = get();
        const { currency: userCurrency } = useSettingsStore.getState();
        
        return subscriptions
          .filter(sub => sub.status === 'active')
          .reduce((total, sub) => {
            // Convert the amount to user's preferred currency
            const convertedAmount = convertCurrency(sub.amount, sub.currency, userCurrency);
            
            switch (sub.billingCycle) {
              case 'monthly':
                return total + (convertedAmount * 12);
              case 'yearly':
                return total + convertedAmount;
              case 'quarterly':
                return total + (convertedAmount * 4);
              default:
                return total;
            }
          }, 0);
      },
      
      // Get upcoming renewals for the next N days
      getUpcomingRenewals: (days) => {
        const { subscriptions } = get()
        const today = new Date()
        const futureDate = new Date()
        futureDate.setDate(today.getDate() + days)
        
        return subscriptions
          .filter(sub => {
            const billingDate = new Date(sub.nextBillingDate)
            return sub.status === 'active' && 
                   billingDate >= today && 
                   billingDate <= futureDate
          })
          .sort((a, b) => 
            new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime()
          )
      },
      
      // Get recently paid subscriptions for the last N days
      getRecentlyPaid: (days) => {
        const { subscriptions } = get()
        const today = new Date()
        const pastDate = new Date()
        pastDate.setDate(today.getDate() - days)
        
        return subscriptions
          .filter(sub => {
            if (!sub.lastBillingDate) return false
            const billingDate = new Date(sub.lastBillingDate)
            return billingDate >= pastDate && billingDate <= today
          })
          .sort((a, b) => 
            new Date(b.lastBillingDate!).getTime() - new Date(a.lastBillingDate!).getTime()
          )
      },
      
      // Get spending by category
      getSpendingByCategory: () => {
        const { subscriptions } = get();
        const { currency: userCurrency } = useSettingsStore.getState();
        
        // Get all unique categories from subscriptions
        const uniqueCategories = [...new Set(subscriptions.map(sub => sub.category))];
        
        return uniqueCategories.reduce((acc, category) => {
          const categoryTotal = subscriptions
            .filter(sub => sub.status === 'active' && sub.category === category)
            .reduce((total, sub) => {
              // Convert the amount to user's preferred currency
              const convertedAmount = convertCurrency(sub.amount, sub.currency, userCurrency);
              
              switch (sub.billingCycle) {
                case 'monthly':
                  return total + (convertedAmount * 12);
                case 'yearly':
                  return total + convertedAmount;
                case 'quarterly':
                  return total + (convertedAmount * 4);
                default:
                  return total;
              }
            }, 0);
          
          acc[category] = categoryTotal;
          return acc;
        }, {} as Record<string, number>);
      },
      
      // Get unique categories from actual subscriptions
      getUniqueCategories: () => {
        const { subscriptions, categories } = get()
        
        // Get all unique category values from subscriptions
        const usedCategoryValues = [...new Set(subscriptions.map(sub => sub.category))]
        
        // Map these to full category objects, or create new ones for custom categories
        return usedCategoryValues.map(value => {
          const existingCategory = categories.find(cat => cat.value === value)
          if (existingCategory) return existingCategory
          
          // For custom categories not in our predefined list
          return { value, label: value.charAt(0).toUpperCase() + value.slice(1) }
        })
      }
    }),
    {
      name: 'subscription-storage',
      // Persist UI options, but not subscriptions, which are now fetched from the API.
      partialize: (state) => ({
        categories: state.categories,
        paymentMethods: state.paymentMethods,
        subscriptionPlans: state.subscriptionPlans,
      })
    }
  )
)
