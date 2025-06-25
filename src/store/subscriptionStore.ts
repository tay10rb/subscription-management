import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { convertCurrency } from '@/lib/subscription-utils'
import { useSettingsStore } from './settingsStore'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import { v4 as uuidv4 } from 'uuid'
import { 
  synchronizeSubscriptions, 
  scheduleSync, 
  SyncStatus, 
  forceSync 
} from '@/lib/sync/subscription-sync'

export type SubscriptionStatus = 'active' | 'trial' | 'cancelled'
export type BillingCycle = 'monthly' | 'yearly' | 'quarterly'
// Updated to allow custom categories
export type SubscriptionCategory = 'video' | 'music' | 'software' | 'cloud' | 'news' | 'game' | 'other' | string

export interface Subscription {
  id: string
  name: string
  plan: string
  billingCycle: BillingCycle
  nextBillingDate: string
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
  syncStatus: SyncStatus
  
  // CRUD operations
  addSubscription: (subscription: Omit<Subscription, 'id'>) => Promise<{ error: any | null }>
  updateSubscription: (id: string, subscription: Partial<Subscription>) => Promise<{ error: any | null }>
  deleteSubscription: (id: string) => Promise<{ error: any | null }>
  resetSubscriptions: () => void
  fetchSubscriptions: () => Promise<void>
  syncSubscriptions: (force?: boolean) => Promise<{ error: any | null }>
  
  // Option management
  addCategory: (category: CategoryOption) => void
  addPaymentMethod: (paymentMethod: PaymentMethodOption) => void
  addSubscriptionPlan: (plan: SubscriptionPlanOption) => void
  
  // Stats and analytics
  getTotalMonthlySpending: () => number
  getTotalYearlySpending: () => number
  getUpcomingRenewals: (days: number) => Subscription[]
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

// Mock data for initial development
const mockSubscriptions: Subscription[] = [
  {
    id: '1',
    name: 'Netflix',
    plan: 'Standard',
    billingCycle: 'monthly',
    nextBillingDate: '2025-06-15',
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
    id: '2',
    name: 'Spotify',
    plan: 'Family',
    billingCycle: 'monthly',
    nextBillingDate: '2025-06-05',
    amount: 14.99,
    currency: 'USD',
    paymentMethod: 'paypal',
    startDate: '2022-05-10',
    status: 'active',
    category: 'music',
    notes: 'Shared with 5 people'
  },
  {
    id: '3',
    name: 'Microsoft 365',
    plan: 'Family',
    billingCycle: 'yearly',
    nextBillingDate: '2026-01-20',
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
    id: '4',
    name: 'iCloud',
    plan: '50GB Storage',
    billingCycle: 'monthly',
    nextBillingDate: '2025-05-30',
    amount: 0.99,
    currency: 'USD',
    paymentMethod: 'applepay',
    startDate: '2022-08-01',
    status: 'active',
    category: 'cloud',
    notes: 'Personal storage'
  },
  {
    id: '5',
    name: 'YouTube Premium',
    plan: 'Individual',
    billingCycle: 'monthly',
    nextBillingDate: '2025-06-10',
    amount: 11.99,
    currency: 'USD',
    paymentMethod: 'googlepay',
    startDate: '2023-02-15',
    status: 'active',
    category: 'video',
    notes: 'No ads, background play'
  }
]

// Helper function to transform data between frontend and database
const transformToDbFormat = (sub: Omit<Subscription, 'id'>, userId: string) => {
  return {
    user_id: userId,
    name: sub.name,
    plan: sub.plan,
    billing_cycle: sub.billingCycle,
    next_billing_date: sub.nextBillingDate,
    amount: sub.amount,
    currency: sub.currency,
    payment_method: sub.paymentMethod,
    start_date: sub.startDate,
    status: sub.status,
    category: sub.category,
    notes: sub.notes,
    website: sub.website || null
  }
}

// Helper function to transform data from database to frontend format
const transformFromDbFormat = (sub: any): Subscription => {
  return {
    id: sub.id,
    name: sub.name,
    plan: sub.plan,
    billingCycle: sub.billing_cycle as BillingCycle,
    nextBillingDate: sub.next_billing_date,
    amount: sub.amount,
    currency: sub.currency,
    paymentMethod: sub.payment_method,
    startDate: sub.start_date,
    status: sub.status as SubscriptionStatus,
    category: sub.category as SubscriptionCategory,
    notes: sub.notes,
    website: sub.website
  }
}

// Helper function to check if table exists
const checkTableExists = async (tableName: string) => {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('count')
      .limit(1)
    
    return !error || !error.message.includes('does not exist')
  } catch {
    return false
  }
}

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
      syncStatus: 'idle',
      
      // Fetch subscriptions from Supabase and sync across devices
      fetchSubscriptions: async () => {
        const user = useAuthStore.getState().user
        set({ isLoading: true, error: null })
        
        try {
          // If user is logged in, attempt to sync data from Supabase
          if (user) {
            const syncResult = await synchronizeSubscriptions([], user.id, 'pull')
            
            if (syncResult.status === 'success' && syncResult.subscriptions.length > 0) {
              set({ 
                subscriptions: syncResult.subscriptions,
                isLoading: false,
                syncStatus: 'success'
              })
              return
            }
          }
          
          // If no user or sync failed, load from localStorage
          const localSubscriptions = localStorage.getItem('subscription-data')
          if (localSubscriptions) {
            try {
              const parsedSubs = JSON.parse(localSubscriptions)
              set({ 
                subscriptions: parsedSubs, 
                isLoading: false, 
                error: null,
                syncStatus: user ? 'error' : 'idle'
              })
              return
            } catch (e) {
              console.error('Error parsing local subscriptions:', e)
            }
          }
          
          // If no localStorage data or parsing error, use mock data
          set({ 
            subscriptions: mockSubscriptions, 
            isLoading: false, 
            error: null 
          })
        } catch (error: any) {
          console.error('Error fetching subscriptions:', error)
          set({ error: error.message, isLoading: false, syncStatus: 'error' })
          
          // Try to get data from localStorage
          const localSubscriptions = localStorage.getItem('subscription-data')
          if (localSubscriptions) {
            try {
              const parsedSubs = JSON.parse(localSubscriptions)
              set({ subscriptions: parsedSubs })
              return
            } catch (e) {
              console.error('Error parsing local subscriptions:', e)
            }
          }
          
          // If there's an error and no localStorage data, fall back to mock data
          set({ subscriptions: mockSubscriptions })
        }
      },
      
      // Add a new subscription and sync
      addSubscription: async (subscription) => {
        const user = useAuthStore.getState().user
        
        try {
          // Generate a new ID for the subscription using UUID
          const newId = uuidv4()
          const newSub: Subscription = {
            ...subscription,
            id: newId
          }
          
          // Update local state first
          set((state) => {
            const updatedSubscriptions = [...state.subscriptions, newSub]
            
            // Save to localStorage immediately
            localStorage.setItem('subscription-data', JSON.stringify(updatedSubscriptions))
            
            return {
              subscriptions: updatedSubscriptions
            }
          })
          
          // Schedule sync if user is logged in
          if (user) {
            const updatedSubscriptions = get().subscriptions
            scheduleSync(updatedSubscriptions, user.id)
          }
          
          return { error: null }
        } catch (error: any) {
          console.error('Error adding subscription:', error)
          
          // Even if there's an error with Supabase, the local state was already updated
          return { error }
        }
      },
      
      // Update an existing subscription and sync
      updateSubscription: async (id, updatedSubscription) => {
        const user = useAuthStore.getState().user
        
        try {
          // Update local state first
          set((state) => {
            const updatedSubscriptions = state.subscriptions.map(sub => 
              sub.id === id ? { ...sub, ...updatedSubscription } : sub
            )
            
            // Save to localStorage immediately
            localStorage.setItem('subscription-data', JSON.stringify(updatedSubscriptions))
            
            return {
              subscriptions: updatedSubscriptions
            }
          })
          
          // Schedule sync if user is logged in
          if (user) {
            const updatedSubscriptions = get().subscriptions
            scheduleSync(updatedSubscriptions, user.id)
          }
          
          return { error: null }
        } catch (error: any) {
          console.error('Error updating subscription:', error)
          
          // Even on error, the local state was already updated
          return { error }
        }
      },
      
      // Delete a subscription and sync
      deleteSubscription: async (id) => {
        const user = useAuthStore.getState().user
        
        try {
          // Update local state first
          set((state) => {
            const updatedSubscriptions = state.subscriptions.filter(sub => sub.id !== id)
            
            // Save to localStorage immediately
            localStorage.setItem('subscription-data', JSON.stringify(updatedSubscriptions))
            
            return {
              subscriptions: updatedSubscriptions
            }
          })
          
          // Schedule sync if user is logged in
          if (user) {
            const updatedSubscriptions = get().subscriptions
            scheduleSync(updatedSubscriptions, user.id)
          }
          
          return { error: null }
        } catch (error: any) {
          console.error('Error deleting subscription:', error)
          
          // Even on error, the local state was already updated
          return { error }
        }
      },
      
      // Sync subscriptions with Supabase (for multi-device sync)
      syncSubscriptions: async (force = false) => {
        const user = useAuthStore.getState().user
        const subscriptions = get().subscriptions
        
        if (!user) {
          return { error: new Error('User not logged in') }
        }
        
        try {
          set({ syncStatus: 'syncing' })
          
          const result = force 
            ? await forceSync(subscriptions, user.id)
            : await synchronizeSubscriptions(subscriptions, user.id)
          
          if (result.status === 'success') {
            set({ 
              subscriptions: result.subscriptions,
              syncStatus: 'success',
              error: null
            })
          } else {
            set({ syncStatus: 'error', error: result.error?.message || null })
            return { error: result.error }
          }
          
          return { error: null }
        } catch (error: any) {
          console.error('Error syncing subscriptions:', error)
          set({ syncStatus: 'error', error: error.message })
          return { error }
        }
      },

      // Reset subscriptions to initial mock data (for development)
      resetSubscriptions: () => {
        set(() => {
          // Also update localStorage
          localStorage.setItem('subscription-data', JSON.stringify(mockSubscriptions))
          
          return {
            subscriptions: mockSubscriptions
          }
        })
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
      // Update persist configuration to keep UI options but not subscriptions,
      // as we'll handle subscription storage separately with direct localStorage access
      // and Supabase synchronization
      partialize: (state) => ({
        categories: state.categories,
        paymentMethods: state.paymentMethods,
        subscriptionPlans: state.subscriptionPlans,
      })
    }
  )
)