import { ReactNode, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: ReactNode
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, isLoading, refreshUser } = useAuthStore()
  const { fetchSubscriptions } = useSubscriptionStore()
  const { fetchSettings } = useSettingsStore()
  const location = useLocation()
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    // Add a timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      if (!isInitialized && isLoading) {
        console.warn('Auth initialization is taking too long, may indicate an issue')
        setInitError('Authentication is taking longer than expected. This might indicate a connection issue.')
      }
    }, 10000) // 10 seconds timeout

    const initializeAuth = async () => {
      try {
        // Refresh auth state
        await refreshUser()
        setIsInitialized(true)
        setInitError(null)
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        setInitError(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setIsInitialized(true) // Still mark as initialized to avoid loading forever
      }
    }

    initializeAuth()

    return () => clearTimeout(timeoutId)
  }, [refreshUser])

  useEffect(() => {
    // After auth is confirmed, fetch user data
    if (isInitialized && user) {
      Promise.all([
        fetchSubscriptions().catch(err => console.error('Failed to fetch subscriptions:', err)),
        fetchSettings().catch(err => console.error('Failed to fetch settings:', err))
      ]);
    }
  }, [isInitialized, user, fetchSubscriptions, fetchSettings])

  // Show loading state
  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">Loading your account</h2>
        <p className="text-muted-foreground text-center max-w-md">
          We're fetching your personal data and settings...
        </p>
        
        {initError && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md max-w-md">
            <p className="text-destructive text-sm">{initError}</p>
            <button 
              className="mt-2 text-sm underline text-primary"
              onClick={() => window.location.reload()}
            >
              Refresh the page
            </button>
          </div>
        )}
      </div>
    );
  }

  // Redirect to login if no user
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Render children when authenticated
  return <>{children}</>
}