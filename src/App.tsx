import { Route, Routes } from "react-router-dom"
import { useEffect, useState } from "react"
import HomePage from "./pages/HomePage"
import { SettingsPage } from "./pages/SettingsPage"
import { ProfilePage } from "./pages/ProfilePage"
import { LoginPage } from "./pages/LoginPage"
import { SignupPage } from "./pages/SignupPage"
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage"
import { ResetPasswordPage } from "./pages/ResetPasswordPage"
import { DiagnosticsPage } from "./pages/DiagnosticsPage"
import { AuthGuard } from "./components/auth/AuthGuard"
import { Toaster } from "./components/ui/toaster"
import { ThemeProvider } from "./components/theme-provider"
import { useAuthStore } from "./store/authStore"
import { supabase } from "./lib/supabase"
import { ConfigError } from "./components/ConfigError"

function App() {
  const { refreshUser } = useAuthStore()
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState<boolean | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  // Check if Supabase is properly configured
  useEffect(() => {
    const checkSupabaseConfig = async () => {
      try {
        // Simple ping to check if Supabase is configured correctly
        const { data, error } = await supabase.auth.getSession()
        
        if (error && error.message.includes('URL')) {
          setConfigError(`Supabase client error: ${error.message}`)
          setIsSupabaseConfigured(false)
          return
        }
        
        // Session might be null but that's okay, we just want to check if the client works
        console.log('Supabase configuration check:', data ? 'Success' : 'No session, but client working')
        setIsSupabaseConfigured(true)
        
        // Now it's safe to refresh the user
        refreshUser()
      } catch (err) {
        console.error('Failed to initialize Supabase:', err)
        setConfigError(`Initialization error: ${err instanceof Error ? err.message : String(err)}`)
        setIsSupabaseConfigured(false)
      }
    }
    
    checkSupabaseConfig()
  }, [refreshUser])

  // Show loading state while checking Supabase configuration
  if (isSupabaseConfigured === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading application...</p>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/diagnostics" element={<DiagnosticsPage />} />
        
        {/* Show diagnostics on config error */}
        {!isSupabaseConfigured && (
          <Route path="*" element={
            <>
              <div className="container py-8">
                <ConfigError 
                  title="Connection Error" 
                  description="Cannot connect to the database service."
                  details={configError || "Missing or invalid Supabase configuration"}
                />
                <div className="mt-8 text-center">
                  <a 
                    href="/diagnostics" 
                    className="text-primary hover:underline"
                  >
                    View System Diagnostics
                  </a>
                </div>
              </div>
            </>
          } />
        )}
        
        {/* Protected routes */}
        <Route path="/" element={<AuthGuard><HomePage /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
      </Routes>
      <Toaster />
    </ThemeProvider>
  )
}

export default App