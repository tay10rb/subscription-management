import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Get environment variables with validation
// For Vite applications, environment variables must be prefixed with VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug environment variables loading
console.log('Environment variables check:');
console.log('- VITE_SUPABASE_URL:', supabaseUrl ? '✓ Available' : '✗ Missing');
console.log('- VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Available' : '✗ Missing');

// Create a function that safely creates the Supabase client
const createSupabaseClient = () => {
  try {
    // Hardcoded values as fallback if environment variables fail to load
    // These values should match the ones in your project
    const finalUrl = supabaseUrl || 'https://uihycfkrusnnklkspyud.supabase.co';
    const finalKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaHljZmtydXNubmtsa3NweXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNTU5NDQsImV4cCI6MjA2MzgzMTk0NH0.PcJ4W-jpdeeR0elsYA_CuFPLDe7t2ZTlv1NtQc79G8o';

    if (!finalUrl) {
      throw new Error('Supabase URL is required.');
    }
    
    if (!finalKey) {
      throw new Error('Supabase anon key is required.');
    }
    
    // Create the client with the available credentials
    return createClient<Database>(
      finalUrl,
      finalKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true
        }
      }
    );
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    
    // Return a mock client that provides empty responses to avoid crashes
    // This allows the application to render even with configuration issues
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: (callback: any) => {
          console.log('Mock auth state change listener registered');
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signOut: () => Promise.resolve({ error: null }),
        signInWithPassword: () => Promise.resolve({ 
          data: { user: null, session: null }, 
          error: { message: 'Config error: Supabase not initialized' } 
        }),
        signUp: (params: any) => {
          console.error('Attempted to sign up while Supabase is not initialized:', params);
          return Promise.resolve({ 
            data: { user: null, session: null }, 
            error: { message: 'Config error: Supabase not initialized' } 
          });
        },
        resetPasswordForEmail: () => Promise.resolve({ error: { message: 'Config error: Supabase not initialized' } }),
        updateUser: () => Promise.resolve({ error: { message: 'Config error: Supabase not initialized' } })
      },
      from: (table: string) => ({
        select: () => ({ 
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null })
          }),
          limit: () => ({
            single: () => Promise.resolve({ data: null, error: null })
          }),
          data: null, 
          error: { message: `Table "${table}" does not exist or cannot be accessed` },
          then: () => Promise.resolve([])
        }),
        insert: () => Promise.resolve({ 
          data: null, 
          error: { message: `Table "${table}" does not exist or cannot be accessed` } 
        }),
        update: () => ({
          eq: () => Promise.resolve({ 
            data: null, 
            error: { message: `Table "${table}" does not exist or cannot be accessed` } 
          }),
          select: () => Promise.resolve({ 
            data: null, 
            error: { message: `Table "${table}" does not exist or cannot be accessed` } 
          })
        }),
        delete: () => ({
          eq: () => Promise.resolve({ 
            data: null, 
            error: { message: `Table "${table}" does not exist or cannot be accessed` } 
          })
        }),
        eq: () => ({ 
          single: () => Promise.resolve({ 
            data: null, 
            error: { message: `Table "${table}" does not exist or cannot be accessed` } 
          }) 
        }),
      }),
      storage: { 
        from: () => ({
          upload: () => Promise.resolve({ data: null, error: { message: 'Config error: Supabase not initialized' } }),
          getPublicUrl: () => ({ publicUrl: '' }),
        }) 
      }
    } as any;
  }
};

// Export the Supabase client
export const supabase = createSupabaseClient();