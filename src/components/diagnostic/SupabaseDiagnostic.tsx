import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface TableCheckResult {
    name: string;
    exists: boolean;
    status: 'success' | 'error' | 'loading';
    error?: string;
}

export function SupabaseDiagnostic() {
    const [authStatus, setAuthStatus] = useState<'checking' | 'success' | 'error'>('checking');
    const [authError, setAuthError] = useState<string | null>(null);
    const [responseTime, setResponseTime] = useState<number | null>(null);
    const [envVariables, setEnvVariables] = useState<{ name: string, value: string | null }[]>([]);
    const [tables, setTables] = useState<TableCheckResult[]>([
        { name: 'profiles', exists: false, status: 'loading' },
        { name: 'user_settings', exists: false, status: 'loading' },
        { name: 'subscriptions', exists: false, status: 'loading' }
    ]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        checkConfiguration();
    }, []);

    const checkConfiguration = async () => {
        setIsRefreshing(true);
        checkEnvironmentVariables();
        await checkAuthConnection();
        await checkTables();
        setIsRefreshing(false);
    };

    const checkEnvironmentVariables = () => {
        const variables = [
            { name: 'VITE_SUPABASE_URL', value: import.meta.env.VITE_SUPABASE_URL || null },
            { name: 'VITE_SUPABASE_ANON_KEY', value: import.meta.env.VITE_SUPABASE_ANON_KEY ? '***' : null }
        ];
        
        setEnvVariables(variables);
    };

    const checkAuthConnection = async () => {
        setAuthStatus('checking');
        setAuthError(null);
        
        try {
            const startTime = Date.now();
            const { data, error } = await supabase.auth.getSession();
            const endTime = Date.now();
            
            setResponseTime(endTime - startTime);
            
            if (error) {
                setAuthStatus('error');
                setAuthError(error.message);
            } else {
                setAuthStatus('success');
            }
        } catch (error) {
            setAuthStatus('error');
            setAuthError(error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const checkTableExists = async (tableName: string): Promise<TableCheckResult> => {
        try {
            const { error } = await supabase.from(tableName).select('count').limit(1);
            
            if (!error) {
                return {
                    name: tableName,
                    exists: true,
                    status: 'success'
                };
            }
            
            return {
                name: tableName,
                exists: false,
                status: 'error',
                error: error.message
            };
            
        } catch (error) {
            return {
                name: tableName,
                exists: false,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    };

    const checkTables = async () => {
        setTables(prev => prev.map(table => ({ ...table, status: 'loading' })));
        
        const results = await Promise.all(
            tables.map(table => checkTableExists(table.name))
        );
        
        setTables(results);
    };

    return (
        <div className="space-y-6 p-6 max-w-3xl mx-auto">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Supabase Diagnostics</CardTitle>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={checkConfiguration}
                            disabled={isRefreshing}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                    <CardDescription>
                        Check the status of your Supabase connection and configuration
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Authentication Status */}
                    <div>
                        <h3 className="text-lg font-medium mb-2">Authentication Connection</h3>
                        
                        {authStatus === 'checking' && (
                            <Alert className="bg-muted/50">
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                    <AlertTitle>Checking connection...</AlertTitle>
                                </div>
                            </Alert>
                        )}
                        
                        {authStatus === 'success' && (
                            <Alert className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
                                <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mr-2" />
                                <AlertTitle className="text-emerald-700 dark:text-emerald-400">Connection successful</AlertTitle>
                                {responseTime && (
                                    <AlertDescription className="text-emerald-600 dark:text-emerald-500">
                                        Response time: {responseTime}ms
                                    </AlertDescription>
                                )}
                            </Alert>
                        )}
                        
                        {authStatus === 'error' && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                <AlertTitle>Connection failed</AlertTitle>
                                <AlertDescription>
                                    {authError || 'Unable to connect to Supabase authentication'}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                    
                    {/* Environment Variables */}
                    <div>
                        <h3 className="text-lg font-medium mb-2">Environment Variables</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Variable</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {envVariables.map((variable, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{variable.name}</TableCell>
                                        <TableCell>
                                            {variable.value ? (
                                                <div className="flex items-center">
                                                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                                    <span>Available</span>
                                                    {variable.name.includes('KEY') ? 
                                                        <span className="ml-2 text-muted-foreground">(Hidden for security)</span> : 
                                                        null
                                                    }
                                                </div>
                                            ) : (
                                                <div className="flex items-center">
                                                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                                                    <span>Missing</span>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    
                    {/* Database Table Status */}
                    <div>
                        <h3 className="text-lg font-medium mb-2">Database Tables</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Table Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tables.map((table, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{table.name}</TableCell>
                                        <TableCell>
                                            {table.status === 'loading' && (
                                                <div className="flex items-center">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                                    <span>Checking...</span>
                                                </div>
                                            )}
                                            {table.status === 'success' && (
                                                <div className="flex items-center">
                                                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                                    <span>Available</span>
                                                </div>
                                            )}
                                            {table.status === 'error' && (
                                                <div className="flex items-center">
                                                    <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                                                    <span>Not Available</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {table.status === 'error' && (table.error || 'Table does not exist')}
                                            {table.status === 'success' && 'Table exists and is accessible'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    
                    {/* Solutions for Missing Tables */}
                    {tables.some(table => table.status === 'error') && (
                        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2" />
                            <AlertTitle className="text-amber-700 dark:text-amber-400">Missing database tables detected</AlertTitle>
                            <AlertDescription className="text-amber-700 dark:text-amber-400">
                                <p className="mb-2">Some required tables are missing in your Supabase database. The application will use mock data for missing tables.</p>
                                <p className="text-sm">To fix this issue, you need to create the following tables in your Supabase database:</p>
                                <ul className="list-disc pl-5 mt-1 text-sm">
                                    {tables
                                        .filter(table => table.status === 'error')
                                        .map((table, index) => (
                                            <li key={index}>{table.name}</li>
                                        ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
            
            {/* Instructions for Database Setup */}
            <Card>
                <CardHeader>
                    <CardTitle>Database Setup Instructions</CardTitle>
                    <CardDescription>
                        How to create the required tables in your Supabase database
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div>
                        <h3 className="font-medium mb-1">Create the profiles table:</h3>
                        <pre className="bg-muted p-2 rounded-md overflow-x-auto">
                            {`CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);`}
                        </pre>
                    </div>
                    
                    <div>
                        <h3 className="font-medium mb-1">Create the user_settings table:</h3>
                        <pre className="bg-muted p-2 rounded-md overflow-x-auto">
                            {`CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT DEFAULT 'USD',
  default_view TEXT DEFAULT 'dashboard',
  show_inactive_subs BOOLEAN DEFAULT true,
  show_original_currency BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'system',
  enable_email_notifications BOOLEAN DEFAULT false,
  email_address TEXT,
  reminder_days INTEGER DEFAULT 7,
  notification_frequency TEXT DEFAULT 'once',
  enable_browser_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);`}
                        </pre>
                    </div>
                    
                    <div>
                        <h3 className="font-medium mb-1">Create the subscriptions table:</h3>
                        <pre className="bg-muted p-2 rounded-md overflow-x-auto">
                            {`CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plan TEXT NOT NULL,
  billing_cycle TEXT NOT NULL,
  next_billing_date DATE NOT NULL,
  amount DECIMAL NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  start_date DATE NOT NULL,
  status TEXT NOT NULL,
  category TEXT NOT NULL,
  notes TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);`}
                        </pre>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}