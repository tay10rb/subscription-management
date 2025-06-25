import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './authStore'
import { applyTheme } from '@/lib/theme-sync'

export type ThemeType = 'light' | 'dark' | 'system'
export type DefaultViewType = 'dashboard' | 'subscriptions'
export type CurrencyType = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY'
export type NotificationFrequencyType = 'once' | 'twice' | 'custom'

interface SettingsState {
  // General settings
  currency: CurrencyType
  setCurrency: (currency: CurrencyType) => Promise<void>
  defaultView: DefaultViewType
  setDefaultView: (view: DefaultViewType) => Promise<void>
  showInactiveSubs: boolean
  setShowInactiveSubs: (show: boolean) => Promise<void>
  
  // Currency display settings
  showOriginalCurrency: boolean
  setShowOriginalCurrency: (show: boolean) => Promise<void>
  
  // Theme settings
  theme: ThemeType
  setTheme: (theme: ThemeType) => Promise<void>
  
  // Notification settings
  enableEmailNotifications: boolean
  setEnableEmailNotifications: (enable: boolean) => Promise<void>
  emailAddress: string
  setEmailAddress: (email: string) => Promise<void>
  reminderDays: number
  setReminderDays: (days: number) => Promise<void>
  notificationFrequency: NotificationFrequencyType
  setNotificationFrequency: (frequency: NotificationFrequencyType) => Promise<void>
  enableBrowserNotifications: boolean
  setEnableBrowserNotifications: (enable: boolean) => Promise<void>
  
  // Exchange rate settings
  exchangeRates: Record<string, number>
  updateExchangeRate: (currency: string, rate: number) => void
  lastExchangeRateUpdate: string | null
  updateLastExchangeRateUpdate: () => void
  
  // Data management
  resetSettings: () => void
  fetchSettings: () => Promise<void>
  isLoading: boolean
  error: string | null
}

export const initialSettings = {
  currency: 'USD' as CurrencyType,
  defaultView: 'dashboard' as DefaultViewType,
  showInactiveSubs: true,
  showOriginalCurrency: true,
  theme: 'system' as ThemeType,
  enableEmailNotifications: false,
  emailAddress: '',
  reminderDays: 7,
  notificationFrequency: 'once' as NotificationFrequencyType,
  enableBrowserNotifications: true,
  exchangeRates: {
    USD: 1,
    EUR: 0.93,
    GBP: 0.79,
    CAD: 1.36,
    AUD: 1.52,
    JPY: 151.16,
    CNY: 7.24
  },
  lastExchangeRateUpdate: null,
  isLoading: false,
  error: null
}

// Helper function to check if table exists
const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('count')
      .limit(1)
    
    return !error
  } catch (e) {
    console.error(`Error checking if table ${tableName} exists:`, e)
    return false
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...initialSettings,
      
      fetchSettings: async () => {
        const user = useAuthStore.getState().user
        if (!user) {
          // If no user is logged in, use default settings
          set({ ...initialSettings })
          return
        }
        
        set({ isLoading: true, error: null })
        
        try {
          // Check if user_settings table exists first
          const tableExists = await checkTableExists('user_settings')
          if (!tableExists) {
            console.log('User settings table does not exist, using defaults')
            set({ ...initialSettings, isLoading: false })
            return
          }
          
          const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single()
            
          if (error) {
            if (error.message.includes('returned no rows')) {
              // No settings found, use defaults
              console.log('No settings found for user, using defaults')
              set({ ...initialSettings, isLoading: false })
              return
            }
            throw error
          }
          
          const loadedTheme = data.theme as ThemeType || 'system';
          
          // Apply theme immediately when settings are loaded
          applyTheme(loadedTheme);
          
          // Also update localStorage for next-themes
          localStorage.setItem('vite-ui-theme', loadedTheme);
          
          // Transform data to frontend format
          set({
            currency: data.currency as CurrencyType,
            defaultView: data.default_view as DefaultViewType,
            showInactiveSubs: data.show_inactive_subs,
            showOriginalCurrency: data.show_original_currency,
            theme: loadedTheme,
            enableEmailNotifications: data.enable_email_notifications,
            emailAddress: data.email_address || '',
            reminderDays: data.reminder_days,
            notificationFrequency: data.notification_frequency as NotificationFrequencyType,
            enableBrowserNotifications: data.enable_browser_notifications,
            isLoading: false
          })
        } catch (error: any) {
          console.error('Error fetching user settings:', error)
          set({ ...initialSettings, error: error.message, isLoading: false })
        }
      },
      
      setCurrency: async (currency) => {
        set({ currency })
        
        const user = useAuthStore.getState().user
        if (user) {
          try {
            // Check if table exists before trying to update
            const tableExists = await checkTableExists('user_settings')
            if (!tableExists) return
            
            await supabase
              .from('user_settings')
              .update({ currency })
              .eq('user_id', user.id)
          } catch (error) {
            console.error('Error updating currency setting:', error)
          }
        }
      },
      
      setDefaultView: async (defaultView) => {
        set({ defaultView })
        
        const user = useAuthStore.getState().user
        if (user) {
          try {
            const tableExists = await checkTableExists('user_settings')
            if (!tableExists) return
            
            await supabase
              .from('user_settings')
              .update({ default_view: defaultView })
              .eq('user_id', user.id)
          } catch (error) {
            console.error('Error updating defaultView setting:', error)
          }
        }
      },
      
      setShowInactiveSubs: async (showInactiveSubs) => {
        set({ showInactiveSubs })
        
        const user = useAuthStore.getState().user
        if (user) {
          try {
            const tableExists = await checkTableExists('user_settings')
            if (!tableExists) return
            
            await supabase
              .from('user_settings')
              .update({ show_inactive_subs: showInactiveSubs })
              .eq('user_id', user.id)
          } catch (error) {
            console.error('Error updating showInactiveSubs setting:', error)
          }
        }
      },
      
      setShowOriginalCurrency: async (showOriginalCurrency) => {
        set({ showOriginalCurrency })
        
        const user = useAuthStore.getState().user
        if (user) {
          try {
            const tableExists = await checkTableExists('user_settings')
            if (!tableExists) return
            
            await supabase
              .from('user_settings')
              .update({ show_original_currency: showOriginalCurrency })
              .eq('user_id', user.id)
          } catch (error) {
            console.error('Error updating showOriginalCurrency setting:', error)
          }
        }
      },
      
      setTheme: async (theme) => {
        set({ theme })
        
        // Directly apply theme to DOM for immediate effect
        applyTheme(theme)
        
        // Update localStorage to keep next-themes in sync
        localStorage.setItem('vite-ui-theme', theme)
        
        const user = useAuthStore.getState().user
        if (user) {
          try {
            const tableExists = await checkTableExists('user_settings')
            if (!tableExists) return
            
            await supabase
              .from('user_settings')
              .update({ theme })
              .eq('user_id', user.id)
          } catch (error) {
            console.error('Error updating theme setting:', error)
          }
        }
      },
      
      setEnableEmailNotifications: async (enableEmailNotifications) => {
        set({ enableEmailNotifications })
        
        const user = useAuthStore.getState().user
        if (user) {
          try {
            const tableExists = await checkTableExists('user_settings')
            if (!tableExists) return
            
            await supabase
              .from('user_settings')
              .update({ enable_email_notifications: enableEmailNotifications })
              .eq('user_id', user.id)
          } catch (error) {
            console.error('Error updating enableEmailNotifications setting:', error)
          }
        }
      },
      
      setEmailAddress: async (emailAddress) => {
        set({ emailAddress })
        
        const user = useAuthStore.getState().user
        if (user) {
          try {
            const tableExists = await checkTableExists('user_settings')
            if (!tableExists) return
            
            await supabase
              .from('user_settings')
              .update({ email_address: emailAddress })
              .eq('user_id', user.id)
          } catch (error) {
            console.error('Error updating emailAddress setting:', error)
          }
        }
      },
      
      setReminderDays: async (reminderDays) => {
        set({ reminderDays })
        
        const user = useAuthStore.getState().user
        if (user) {
          try {
            const tableExists = await checkTableExists('user_settings')
            if (!tableExists) return
            
            await supabase
              .from('user_settings')
              .update({ reminder_days: reminderDays })
              .eq('user_id', user.id)
          } catch (error) {
            console.error('Error updating reminderDays setting:', error)
          }
        }
      },
      
      setNotificationFrequency: async (notificationFrequency) => {
        set({ notificationFrequency })
        
        const user = useAuthStore.getState().user
        if (user) {
          try {
            const tableExists = await checkTableExists('user_settings')
            if (!tableExists) return
            
            await supabase
              .from('user_settings')
              .update({ notification_frequency: notificationFrequency })
              .eq('user_id', user.id)
          } catch (error) {
            console.error('Error updating notificationFrequency setting:', error)
          }
        }
      },
      
      setEnableBrowserNotifications: async (enableBrowserNotifications) => {
        set({ enableBrowserNotifications })
        
        const user = useAuthStore.getState().user
        if (user) {
          try {
            const tableExists = await checkTableExists('user_settings')
            if (!tableExists) return
            
            await supabase
              .from('user_settings')
              .update({ enable_browser_notifications: enableBrowserNotifications })
              .eq('user_id', user.id)
          } catch (error) {
            console.error('Error updating enableBrowserNotifications setting:', error)
          }
        }
      },
      
      updateExchangeRate: (currency, rate) => set((state) => ({
        exchangeRates: { ...state.exchangeRates, [currency]: rate }
      })),
      
      updateLastExchangeRateUpdate: () => set({
        lastExchangeRateUpdate: new Date().toISOString()
      }),
      
      resetSettings: () => {
        // Reset settings to defaults
        set({ ...initialSettings })
        
        // Clear from localStorage too
        localStorage.removeItem('settings-storage')
      }
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        // Store only these in localStorage as backup
        exchangeRates: state.exchangeRates,
        lastExchangeRateUpdate: state.lastExchangeRateUpdate
      })
    }
  )
)