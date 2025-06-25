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

export function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'available' | 'error'>('checking')
  const { signUp } = useAuthStore()
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

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive"
      })
      setIsLoading(false)
      return
    }

    // Check Supabase status before attempting signup
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
      if (typeof signUp !== 'function') {
        throw new Error('Authentication service is not available');
      }
      
      const { error, user } = await signUp(email, password)
      
      if (error) {
        console.error('Signup error details:', error)
        toast({
          title: "Registration failed",
          description: error.message || "Please check your information and try again",
          variant: "destructive"
        })
        return
      }

      // Success
      toast({
        title: "Registration successful",
        description: user?.email ? "Your account has been created" : "Please check your email to confirm your account",
      })

      // Navigate to home page
      navigate('/')
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Registration failed",
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
            <CardTitle className="text-2xl text-center">Sign Up</CardTitle>
            <CardDescription className="text-center">
              Create an account to manage your subscriptions
            </CardDescription>
          </CardHeader>

          {/* Only show error alert if connection fails */}
          {supabaseStatus === 'error' && (
            <Alert variant="destructive" className="mx-6 mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>
                Unable to connect to the authentication service. Registration is currently unavailable.
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
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                  required
                  disabled={isLoading || supabaseStatus !== 'available'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} 
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
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
              <div className="text-sm text-center text-muted-foreground mt-2">
                Already have an account?{" "}
                <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </ThemeProvider>
  )
}