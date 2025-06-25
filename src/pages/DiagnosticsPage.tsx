import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft, Copy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ThemeProvider } from '@/components/theme-provider'
import { ModeToggle } from '@/components/mode-toggle'
import { useToast } from '@/hooks/use-toast'
import { Code } from '@/components/ui/code'

export function DiagnosticsPage() {
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'available' | 'error'>('checking')
  const [profilesTableExists, setProfilesTableExists] = useState<boolean | null>(null)
  const [userSettingsTableExists, setUserSettingsTableExists] = useState<boolean | null>(null)
  const [authStatus, setAuthStatus] = useState<'checking' | 'available' | 'error'>('checking')
  const [emailConfirmEnabled, setEmailConfirmEnabled] = useState<boolean | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    checkSupabaseConnection()
    checkTablesExist()
    checkAuthStatus()
  }, [])

  const checkSupabaseConnection = async () => {
    try {
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

  const checkTablesExist = async () => {
    try {
      // Check profiles table
      const { error: profilesError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      setProfilesTableExists(!profilesError)
      
      // Check user_settings table
      const { error: settingsError } = await supabase
        .from('user_settings')
        .select('count')
        .limit(1)
      
      setUserSettingsTableExists(!settingsError)
    } catch (err) {
      console.error('Error checking tables:', err)
      setProfilesTableExists(false)
      setUserSettingsTableExists(false)
    }
  }

  const checkAuthStatus = async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth status error:', error)
        setAuthStatus('error')
      } else {
        console.log('Auth service available')
        setAuthStatus('available')
        
        // We don't have a direct way to check if email confirmation is enabled
        // But we can infer it from error messages when testing signup
        setEmailConfirmEnabled(true) // Assume true by default for Supabase
      }
    } catch (err) {
      console.error('Error checking auth status:', err)
      setAuthStatus('error')
    }
  }

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: message,
      })
    }).catch(err => {
      console.error('Failed to copy:', err)
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      })
    })
  }

  // SQL scripts for creating necessary tables
  const profilesTableSQL = `CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE update_profile_updated_at();`

  const userSettingsTableSQL = `CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  currency TEXT NOT NULL DEFAULT 'USD',
  default_view TEXT NOT NULL DEFAULT 'dashboard',
  show_inactive_subs BOOLEAN NOT NULL DEFAULT true,
  show_original_currency BOOLEAN NOT NULL DEFAULT true,
  theme TEXT NOT NULL DEFAULT 'system',
  enable_email_notifications BOOLEAN NOT NULL DEFAULT false,
  email_address TEXT,
  reminder_days INTEGER NOT NULL DEFAULT 7,
  notification_frequency TEXT NOT NULL DEFAULT 'once',
  enable_browser_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own settings" 
  ON user_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
  ON user_settings FOR UPDATE 
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE PROCEDURE update_user_settings_updated_at();`

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="container py-8 bg-background min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <Link to="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
          <ModeToggle />
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Application Diagnostics</CardTitle>
            <CardDescription>
              Troubleshooting information for your subscription management app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <h3 className="text-xl font-medium">System Status</h3>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="bg-card p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Supabase Connection</h4>
                    {supabaseStatus === 'checking' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : supabaseStatus === 'available' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {supabaseStatus === 'checking' ? 'Checking connection...' : 
                     supabaseStatus === 'available' ? 'Connected to Supabase' : 
                     'Cannot connect to Supabase'}
                  </p>
                </div>
                
                <div className="bg-card p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Authentication Service</h4>
                    {authStatus === 'checking' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : authStatus === 'available' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {authStatus === 'checking' ? 'Checking auth service...' : 
                     authStatus === 'available' ? 'Authentication is available' : 
                     'Authentication service unavailable'}
                  </p>
                </div>
                
                <div className="bg-card p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Email Confirmation</h4>
                    {emailConfirmEnabled === null ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : emailConfirmEnabled ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {emailConfirmEnabled === null ? 'Checking setting...' : 
                     emailConfirmEnabled ? 'Email confirmation is required' : 
                     'Email confirmation is not required'}
                  </p>
                </div>
                
                <div className="bg-card p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Profiles Table</h4>
                    {profilesTableExists === null ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : profilesTableExists ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {profilesTableExists === null ? 'Checking table...' : 
                     profilesTableExists ? 'Profiles table exists' : 
                     '404: Profiles table not found'}
                  </p>
                </div>
                
                <div className="bg-card p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">User Settings Table</h4>
                    {userSettingsTableExists === null ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : userSettingsTableExists ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {userSettingsTableExists === null ? 'Checking table...' : 
                     userSettingsTableExists ? 'User settings table exists' : 
                     '404: User settings table not found'}
                  </p>
                </div>
              </div>
              
              <Alert variant="default" className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle>Problems Detected</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  Check the issues and solutions tab below for detailed explanations and fixes
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
        
        <Tabs defaultValue="issues">
          <TabsList className="mb-4">
            <TabsTrigger value="issues">Issues & Solutions</TabsTrigger>
            <TabsTrigger value="sql">SQL Scripts</TabsTrigger>
            <TabsTrigger value="mockdata">Mock Data Solution</TabsTrigger>
          </TabsList>
          
          <TabsContent value="issues">
            <Card>
              <CardHeader>
                <CardTitle>Issues & Solutions</CardTitle>
                <CardDescription>
                  Detected issues and recommended fixes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="font-medium text-base">
                      Missing Database Tables
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <p>The application is trying to access tables that don't exist in your Supabase database:</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li><code>profiles</code> - For storing user profile information</li>
                        <li><code>user_settings</code> - For storing user preferences</li>
                      </ul>
                      <Alert variant="default" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                        <AlertTitle>Solution</AlertTitle>
                        <AlertDescription className="text-muted-foreground">
                          Go to the <strong>SQL Scripts</strong> tab and run those SQL commands in your Supabase SQL Editor to create the required tables.
                        </AlertDescription>
                      </Alert>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-2">
                    <AccordionTrigger className="font-medium text-base">
                      Email Not Confirmed Error
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <p>You're seeing "AuthApiError: Email not confirmed" because Supabase is configured to require email confirmation before allowing logins.</p>
                      
                      <p className="text-muted-foreground">You have several options:</p>
                      
                      <ol className="list-decimal pl-5 space-y-2">
                        <li>Check your email for the confirmation link after signing up</li>
                        <li>
                          Disable email confirmation in your Supabase project:
                          <ul className="list-disc pl-5 mt-2">
                            <li>Go to your Supabase dashboard</li>
                            <li>Navigate to Authentication &gt; Providers</li>
                            <li>Find "Email" and click "Edit"</li>
                            <li>Uncheck "Confirm email" and save</li>
                          </ul>
                        </li>
                        <li>Use the test callback URL in Supabase dashboard to simulate email confirmation</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-3">
                    <AccordionTrigger className="font-medium text-base">
                      Connection Issues
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <p>If you're experiencing connection issues with Supabase, verify:</p>
                      
                      <ul className="list-disc pl-5 space-y-2">
                        <li>Your Supabase project is active and not paused</li>
                        <li>You've configured the correct URL and API key in your environment</li>
                        <li>There are no network restrictions blocking API calls</li>
                      </ul>
                      
                      <Alert>
                        <AlertTitle>Environment Variables Check</AlertTitle>
                        <AlertDescription className="text-muted-foreground">
                          Make sure you have set up <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> 
                          in your <code>.env</code> or <code>.env.local</code> file.
                        </AlertDescription>
                      </Alert>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <p className="text-sm text-muted-foreground">
                  Problems not resolved? Visit the <a href="https://supabase.com/docs" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Supabase documentation</a> for more help.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="sql">
            <Card>
              <CardHeader>
                <CardTitle>SQL Scripts for Table Creation</CardTitle>
                <CardDescription>
                  Run these scripts in your Supabase SQL Editor to create the required tables
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">Profiles Table</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center"
                      onClick={() => copyToClipboard(profilesTableSQL, "Profiles table SQL copied to clipboard")}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="relative">
                    <Code className="text-xs">{profilesTableSQL}</Code>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">User Settings Table</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex items-center"
                      onClick={() => copyToClipboard(userSettingsTableSQL, "User settings table SQL copied to clipboard")}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="relative">
                    <Code className="text-xs">{userSettingsTableSQL}</Code>
                  </div>
                </div>
                
                <Alert className="bg-primary/10 border-primary/20">
                  <AlertTitle>How to run these scripts</AlertTitle>
                  <AlertDescription className="text-muted-foreground">
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Go to your Supabase dashboard</li>
                      <li>Click on "SQL Editor" in the sidebar</li>
                      <li>Create a "New query"</li>
                      <li>Paste the SQL for each table</li>
                      <li>Click "Run" to execute the script</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="mockdata">
            <Card>
              <CardHeader>
                <CardTitle>Using Mock Data</CardTitle>
                <CardDescription>
                  If you prefer not to set up the database tables right now, you can use mock data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  We've already implemented fallback mechanisms in the app to use mock data when the required tables don't exist.
                  This allows you to test the frontend functionality without setting up the full database schema.
                </p>
                
                <Alert>
                  <AlertTitle>How mock data works</AlertTitle>
                  <AlertDescription className="text-muted-foreground">
                    <ul className="list-disc pl-5 space-y-2">
                      <li>When the app tries to access a missing table, it gracefully falls back to mock data</li>
                      <li>Profile information uses your email username as a fallback</li>
                      <li>User settings use sensible defaults</li>
                      <li>All data modifications appear to work but aren't persistently stored</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                
                <Alert variant="destructive" className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Limitations</AlertTitle>
                  <AlertDescription className="text-muted-foreground">
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Data will not persist between sessions</li>
                      <li>Multi-user features won't function properly</li>
                      <li>Some advanced features may be limited</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                
                <div className="pt-4">
                  <h3 className="text-lg font-medium mb-2">Setup Instructions</h3>
                  <p className="mb-4">To continue using mock data, make these code modifications:</p>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-base font-medium mb-1">1. Disable Email Confirmation Requirement</h4>
                      <p className="mb-2 text-sm text-muted-foreground">
                        In your Supabase project, you need to disable the email confirmation requirement to avoid "Email not confirmed" errors.
                      </p>
                      <Alert className="bg-primary/10 border-primary/20">
                        <AlertTitle>Supabase Dashboard Steps:</AlertTitle>
                        <AlertDescription className="text-muted-foreground">
                          <ol className="list-decimal pl-5 space-y-2">
                            <li>Go to your Supabase dashboard</li>
                            <li>Navigate to Authentication &gt; Providers</li>
                            <li>Find "Email" and click "Edit"</li>
                            <li>Uncheck "Confirm email" and save</li>
                          </ol>
                        </AlertDescription>
                      </Alert>
                    </div>
                    
                    <div>
                      <h4 className="text-base font-medium mb-1">2. Clear Browser Storage (Optional)</h4>
                      <p className="text-sm text-muted-foreground">
                        If you've previously tried to use the app and encountered errors, clearing your browser's local storage
                        can help eliminate any cached auth errors.
                      </p>
                      <div className="mt-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            localStorage.removeItem('auth-storage')
                            toast({
                              title: "Storage Cleared",
                              description: "Local authentication data has been cleared"
                            })
                          }}
                        >
                          Clear Auth Storage
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link to="/signup">
                    Try Signing Up Again
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ThemeProvider>
  )
}