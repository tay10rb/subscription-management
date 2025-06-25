import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'

export function SupabaseStatus() {
  const [status, setStatus] = useState<{
    url: boolean;
    key: boolean;
    connection: boolean;
    auth: boolean;
    responseTime: number | null;
    error: string | null;
  }>({
    url: false,
    key: false,
    connection: false,
    auth: false,
    responseTime: null,
    error: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const checkSupabaseStatus = async () => {
    setIsLoading(true)
    const newStatus = {
      url: false,
      key: false,
      connection: false,
      auth: false,
      responseTime: null,
      error: null,
    }

    // Check environment variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    newStatus.url = Boolean(supabaseUrl)
    newStatus.key = Boolean(supabaseAnonKey)

    try {
      // Check connection and measure response time
      const start = Date.now()
      const { error } = await supabase.auth.getSession()
      newStatus.responseTime = Date.now() - start
      
      if (error) {
        newStatus.error = error.message
      } else {
        newStatus.connection = true
        
        // Test authentication features
        const authTest = await supabase.auth.onAuthStateChange(() => {})
        newStatus.auth = Boolean(authTest?.data?.subscription)
      }
    } catch (err) {
      newStatus.error = err instanceof Error ? err.message : 'Unknown connection error'
    } finally {
      setStatus(newStatus)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkSupabaseStatus()
  }, [])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Supabase Status</span>
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => checkSupabaseStatus()}
            >
              Refresh
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm font-medium">Configuration</span>
            {status.url && status.key ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
          </div>
          
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm font-medium">Connection</span>
            {status.connection ? (
              <div className="flex items-center">
                <span className="text-xs text-muted-foreground mr-2">
                  {status.responseTime}ms
                </span>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
          </div>
          
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm font-medium">Authentication</span>
            {status.auth ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
          </div>
          
          {status.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>
                {status.error}
              </AlertDescription>
            </Alert>
          )}

          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide Details" : "Show Details"}
          </Button>

          {expanded && (
            <div className="mt-4 p-4 bg-muted rounded-md text-xs font-mono whitespace-pre-wrap">
              <div>VITE_SUPABASE_URL: {status.url ? "✓ Set" : "✗ Missing"}</div>
              <div>VITE_SUPABASE_ANON_KEY: {status.key ? "✓ Set" : "✗ Missing"}</div>
              <div>Connection: {status.connection ? `✓ Connected (${status.responseTime}ms)` : "✗ Failed"}</div>
              <div>Auth Service: {status.auth ? "✓ Working" : "✗ Not Working"}</div>
              {status.error && <div className="mt-2 text-destructive">Error: {status.error}</div>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}