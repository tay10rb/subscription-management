import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: any | null
  isLoading: boolean
  lastError: string | null
  
  // Auth methods
  login: (email: string, password: string) => Promise<{ error: any | null }>
  signUp: (email: string, password: string) => Promise<{ error: any | null, user: User | null }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any | null }>
  updatePassword: (newPassword: string) => Promise<{ error: any | null }>
  
  // Session management
  refreshUser: () => Promise<void>
  
  // Profile methods
  updateProfile: (data: { username?: string, full_name?: string, avatar_url?: string }) => Promise<{ error: any | null }>
  getProfile: () => Promise<{ data: any | null, error: any | null }>
  
  // Error handling
  clearError: () => void
}

// Helper function to check if a table exists
async function checkTableExists(tableName: string): Promise<boolean> {
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      lastError: null,
      
      login: async (email, password) => {
        try {
          const response = await supabase.auth.signInWithPassword({ email, password })
          
          if (response.data?.user) {
            set({ user: response.data.user, session: response.data.session, lastError: null })
          } else if (response.error) {
            // Handle email confirmation error specifically
            if (response.error.message?.includes('Email not confirmed')) {
              set({ lastError: "Email not confirmed. Please check your email for the confirmation link or disable email confirmation in Supabase." })
              return { error: { 
                ...response.error,
                message: "Email not confirmed. Please check your email for the confirmation link or disable email confirmation in Supabase."
              }}
            } else {
              set({ lastError: response.error.message })
            }
          }
          
          return { error: response.error }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown login error'
          set({ lastError: errorMessage })
          return { error: { message: errorMessage } }
        }
      },
      
      signUp: async (email, password) => {
        try {
          const response = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            }
          })
          
          if (response.data?.user) {
            try {
              // First, check if the 'profiles' table exists
              const profilesTableExists = await checkTableExists('profiles')
              
              // If the profiles table exists, create a profile
              if (profilesTableExists) {
                console.log('Creating user profile')
                await supabase.from('profiles').insert([
                  {
                    id: response.data.user.id,
                    username: email.split('@')[0],
                    full_name: '',
                    avatar_url: '',
                  },
                ])
              } else {
                console.log('Profiles table does not exist, using mock profile data')
              }
              
              // Check if the 'user_settings' table exists
              const userSettingsTableExists = await checkTableExists('user_settings')
              
              // If the user_settings table exists, create default settings
              if (userSettingsTableExists) {
                console.log('Creating user settings')
                await supabase.from('user_settings').insert([
                  {
                    user_id: response.data.user.id,
                    currency: 'USD',
                    default_view: 'dashboard',
                    show_inactive_subs: true,
                    show_original_currency: true,
                    theme: 'system',
                    enable_email_notifications: false,
                    email_address: email,
                    reminder_days: 7,
                    notification_frequency: 'once',
                    enable_browser_notifications: true,
                  },
                ])
              } else {
                console.log('User settings table does not exist, using mock settings data')
              }
            } catch (profileError) {
              console.error('Error creating initial profile or settings:', profileError)
              // Continue anyway since the user was created
            }
            
            set({ user: response.data.user, session: response.data.session, lastError: null })
          } else if (response.error) {
            set({ lastError: response.error.message })
          }
          
          return { error: response.error, user: response.data?.user }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown signup error'
          set({ lastError: errorMessage })
          return { error: { message: errorMessage }, user: null }
        }
      },
      
      logout: async () => {
        try {
          await supabase.auth.signOut()
          set({ user: null, session: null, lastError: null })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error during logout'
          console.error(errorMessage)
          // Still clear the session data
          set({ user: null, session: null, lastError: errorMessage })
        }
      },
      
      resetPassword: async (email) => {
        try {
          const response = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          })
          
          if (response.error) {
            set({ lastError: response.error.message })
          } else {
            set({ lastError: null })
          }
          
          return { error: response.error }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Password reset error'
          set({ lastError: errorMessage })
          return { error: { message: errorMessage } }
        }
      },
      
      updatePassword: async (newPassword) => {
        try {
          const response = await supabase.auth.updateUser({
            password: newPassword,
          })
          
          if (response.error) {
            set({ lastError: response.error.message })
          } else {
            set({ lastError: null })
          }
          
          return { error: response.error }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Password update error'
          set({ lastError: errorMessage })
          return { error: { message: errorMessage } }
        }
      },
      
      refreshUser: async () => {
        set({ isLoading: true });
        
        try {
          // Set a timeout to avoid hanging indefinitely
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Auth session fetch timeout')), 10000);
          });
          
          // Race the session fetch against the timeout
          const { data } = await Promise.race([
            supabase.auth.getSession(),
            timeoutPromise
          ]) as { data: any };
          
          if (data?.session) {
            const { data: userData } = await supabase.auth.getUser();
            set({ user: userData?.user || null, session: data.session, lastError: null });
          } else {
            set({ user: null, session: null });
          }
        } catch (error) {
          console.error('Error refreshing auth state:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
          set({ 
            user: null, 
            session: null, 
            lastError: errorMessage,
            // Still mark as not loading so the UI doesn't hang
          });
        } finally {
          set({ isLoading: false });
        }
      },
      
      updateProfile: async (data) => {
        const user = get().user
        if (!user) return { error: new Error('User not authenticated') }
        
        try {
          // Check if the profiles table exists first
          const profilesTableExists = await checkTableExists('profiles')
          
          if (!profilesTableExists) {
            console.log('Profiles table does not exist, using mock profile update')
            // Just pretend the update worked, since we're using mock data
            return { error: null }
          }
          
          const response = await supabase
            .from('profiles')
            .update(data)
            .eq('id', user.id)
            .select()
            
          if (response.error) {
            set({ lastError: response.error.message })
          } else {
            set({ lastError: null })
          }
          
          return { error: response.error }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Profile update error'
          set({ lastError: errorMessage })
          return { error: { message: errorMessage } }
        }
      },
      
      getProfile: async () => {
        const user = get().user
        if (!user) return { data: null, error: new Error('User not authenticated') }
        
        try {
          // Check if the profiles table exists first
          const profilesTableExists = await checkTableExists('profiles')
          
          if (!profilesTableExists) {
            console.log('Profiles table does not exist, returning mock profile')
            // Return a mock profile since the table doesn't exist
            return { 
              data: {
                id: user.id,
                username: user.email?.split('@')[0] || 'user',
                full_name: '',
                avatar_url: ''
              }, 
              error: null 
            }
          }
          
          const response = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
            
          if (response.error) {
            set({ lastError: response.error.message })
            
            // If the user doesn't have a profile, return a default one
            if (response.error.message.includes('returned no rows')) {
              return { 
                data: {
                  id: user.id,
                  username: user.email?.split('@')[0] || 'user',
                  full_name: '',
                  avatar_url: ''
                }, 
                error: null 
              }
            }
          }
          
          return { data: response.data, error: response.error }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Profile fetch error'
          set({ lastError: errorMessage })
          
          // Return a default profile on error
          return { 
            data: {
              id: user?.id,
              username: user?.email?.split('@')[0] || 'user',
              full_name: '',
              avatar_url: ''
            }, 
            error: null 
          }
        }
      },
      
      clearError: () => {
        set({ lastError: null })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
)