import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { ThemeProvider } from '@/components/theme-provider'
import { ModeToggle } from '@/components/mode-toggle'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'available' | 'error'>('checking')
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Check Supabase connection when the component mounts
  useEffect(() => {
    const checkSupabaseConnection = async () => {
      try {
        // Simple ping test to see if Supabase is responding
        const start = Date.now()
        const { error } = await supabase.auth.getSession()
        const responseTime = Date.now() - start
        
        if (error) {
          console.error('Supabase connection error:', error)
          setSupabaseStatus('error')
        } else {
          console.log(`Supabase connection successful (${responseTime}ms)`)
          setSupabaseStatus('available')
        }
      } catch (err) {
        console.error('Error checking Supabase connection:', err)
        setSupabaseStatus('error')
      }
    }

    checkSupabaseConnection()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Check Supabase status before attempting login
    if (supabaseStatus !== 'available') {
      toast({
        title: "Service unavailable",
        description: "The authentication service is currently unavailable. Please try again later.",
        variant: "destructive"
      })
      setIsLoading(false)
      return
    }

    try {
      if (typeof login !== 'function') {
        throw new Error('Authentication service is not available');
      }
      
      const { error } = await login(email, password)
      
      if (error) {
        console.error('Login error details:', error)
        
        let errorMessage = error.message;
        
        // Map specific error messages to more user-friendly versions
        if (error.message?.includes('Email not confirmed')) {
          errorMessage = "Email not confirmed. Please check your email for the confirmation link.";
        } else if (error.message?.includes('Invalid login credentials')) {
          errorMessage = "Invalid email or password. Please try again.";
        }
        
        toast({
          title: "Login failed",
          description: errorMessage || "Please check your credentials and try again",
          variant: "destructive"
        })
        return
      }

      // Success - navigate to home page
      navigate('/')
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="absolute top-4 right-4">
          <ModeToggle />
        </div>

        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          
          {/* Only show error alert if connection fails */}
          {supabaseStatus === 'error' && (
            <Alert variant="destructive" className="mx-6 mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>
                Unable to connect to the authentication service. Login is currently unavailable.
              </AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading || supabaseStatus !== 'available'}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                  required
                  disabled={isLoading || supabaseStatus !== 'available'}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading || supabaseStatus !== 'available'}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
              <div className="text-sm text-center text-muted-foreground mt-2">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary underline-offset-4 hover:underline">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </ThemeProvider>
  )
}