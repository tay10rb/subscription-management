import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ExchangeRateApi } from '@/services/exchangeRateApi'
import { logger } from '@/utils/logger'
import { applyTheme } from '@/lib/theme-sync'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api')

// Helper function to get headers, including API key for write operations
const getHeaders = () => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  // The API key is taken from the store's own state
  const { apiKey } = useSettingsStore.getState()
  if (apiKey) {
    headers['X-API-KEY'] = apiKey
  }
  return headers
}

export type ThemeType = 'light' | 'dark' | 'system'
export type DefaultViewType = 'dashboard' | 'subscriptions'
export type CurrencyType = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY'
export type NotificationFrequencyType = 'once' | 'twice' | 'custom'

interface SettingsState {
  // --- Synced with Backend ---
  apiKey: string | null
  setApiKey: (apiKey: string) => void
  currency: CurrencyType
  setCurrency: (currency: CurrencyType) => Promise<void>
  theme: ThemeType
  setTheme: (theme: ThemeType) => Promise<void>

  // --- Frontend-Only Settings ---
  defaultView: DefaultViewType
  setDefaultView: (view: DefaultViewType) => void
  showInactiveSubs: boolean
  setShowInactiveSubs: (show: boolean) => void
  
  // Currency display settings
  showOriginalCurrency: boolean
  setShowOriginalCurrency: (show: boolean) => void
  
  // Notification settings
  enableEmailNotifications: boolean
  setEnableEmailNotifications: (enable: boolean) => void
  emailAddress: string
  setEmailAddress: (email: string) => void
  reminderDays: number
  setReminderDays: (days: number) => void
  notificationFrequency: NotificationFrequencyType
  setNotificationFrequency: (frequency: NotificationFrequencyType) => void
  enableBrowserNotifications: boolean
  setEnableBrowserNotifications: (enable: boolean) => void
  
  // Exchange rate settings
  exchangeRates: Record<string, number>
  updateExchangeRate: (currency: string, rate: number) => void
  lastExchangeRateUpdate: string | null
  updateLastExchangeRateUpdate: () => void
  fetchExchangeRates: () => Promise<void>
  updateExchangeRatesFromApi: () => Promise<void>
  
  // Data management
  resetSettings: () => void
  fetchSettings: () => Promise<void>
  isLoading: boolean
  error: string | null
}

export const initialSettings = {
  // Synced
  apiKey: null,
  currency: 'USD' as CurrencyType,
  theme: 'system' as ThemeType,
  
  // Frontend-only
  defaultView: 'dashboard' as DefaultViewType,
  showInactiveSubs: true,
  showOriginalCurrency: true,
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

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...initialSettings,
      
      fetchSettings: async () => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(`${API_BASE_URL}/settings`)
          if (!response.ok) {
            // If settings don't exist, the backend might 404, which is okay.
            // We just use the initial/persisted state.
            if (response.status === 404) {
              logger.warn('Settings not found on backend. Using local/default settings.')
              set({ isLoading: false })
              return
            }
            throw new Error('Failed to fetch settings from backend.')
          }
          const data = await response.json()
          
          const loadedSettings = {
            currency: data.currency || initialSettings.currency,
            theme: data.theme || initialSettings.theme,
          }

          set({ ...loadedSettings, isLoading: false })
          // Don't apply theme here - let next-themes handle it

          // 获取汇率数据
          get().fetchExchangeRates()

        } catch (error: any) {
          logger.error('Error fetching settings:', error)
          set({ error: error.message, isLoading: false })
        }
      },
      
      setApiKey: (apiKey) => set({ apiKey }),
      
      setCurrency: async (currency) => {
        set({ currency })
        
        // Sync to backend
        try {
          const response = await fetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ currency })
          })
          
          if (!response.ok) {
            logger.error('Failed to save currency setting to backend')
            // Could optionally revert the local change here
          }
        } catch (error: any) {
          logger.error('Error saving currency setting:', error)
          // Could optionally revert the local change here
        }
      },
      
      setTheme: async (theme) => {
        set({ theme })
        // Don't apply theme here - let next-themes handle it
        // localStorage is also handled by next-themes

        // Sync to backend
        try {
          const response = await fetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ theme })
          })

          if (!response.ok) {
            logger.error('Failed to save theme setting to backend')
          }
        } catch (error: any) {
          logger.error('Error saving theme setting:', error)
        }
      },

      setDefaultView: (defaultView) => set({ defaultView }),
      setShowInactiveSubs: (showInactiveSubs) => set({ showInactiveSubs }),
      setShowOriginalCurrency: (showOriginalCurrency) => set({ showOriginalCurrency }),
      setEnableEmailNotifications: (enableEmailNotifications) => set({ enableEmailNotifications }),
      setEmailAddress: (emailAddress) => set({ emailAddress }),
      setReminderDays: (reminderDays) => set({ reminderDays }),
      setNotificationFrequency: (notificationFrequency) => set({ notificationFrequency }),
      setEnableBrowserNotifications: (enableBrowserNotifications) => set({ enableBrowserNotifications }),
      
      updateExchangeRate: (currency, rate) => set((state) => ({
        exchangeRates: { ...state.exchangeRates, [currency]: rate }
      })),
      
      updateLastExchangeRateUpdate: () => set({
        lastExchangeRateUpdate: new Date().toISOString()
      }),

      fetchExchangeRates: async () => {
        try {
          const rates = await ExchangeRateApi.getAllRates();
          const rateMap = ExchangeRateApi.ratesToMap(rates);

          set({
            exchangeRates: rateMap,
            lastExchangeRateUpdate: new Date().toISOString()
          });
        } catch (error: any) {
          logger.error('Error fetching exchange rates:', error);
          // 保持现有汇率，不更新错误状态，因为这可能在后台运行
        }
      },

      updateExchangeRatesFromApi: async () => {
        const { apiKey } = get();
        if (!apiKey) {
          throw new Error('API key not configured');
        }

        try {
          await ExchangeRateApi.updateRates(apiKey);
          // 更新成功后重新获取汇率
          await get().fetchExchangeRates();
        } catch (error: any) {
          logger.error('Error updating exchange rates:', error);
          set({ error: error.message });
          throw error;
        }
      },
      
      resetSettings: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/settings/reset`, {
            method: 'POST',
            headers: getHeaders(),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to reset settings');
          }

          // Reset local state to initial settings
          set({ ...initialSettings });
          // Don't apply theme here - let next-themes handle it

          return { error: null };
        } catch (error: any) {
          logger.error('Error resetting settings:', error);
          set({ error: error.message });
          return { error };
        }
      },
    }),
    {
      name: 'settings-storage',
      // Persist all settings except for loading/error states.
      partialize: (state) => {
        const { isLoading, error, ...rest } = state;
        // Functions are not persisted, so we don't need to omit them.
        return rest;
      }
    }
  )
)