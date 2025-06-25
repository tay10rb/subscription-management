import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { supabase } from './lib/supabase.ts'
import { applyTheme, setupSystemThemeListener } from './lib/theme-sync.ts'

// Initialize theme on application startup
const initializeTheme = () => {
  // Get theme from localStorage or use system default
  const theme = localStorage.getItem('vite-ui-theme') || 'system';
  // Apply theme to DOM
  applyTheme(theme as any);
  // Setup listener for system preferences
  setupSystemThemeListener();
};

// Run theme initialization before rendering
initializeTheme();

// Simple wrapper component that ensures Supabase is initialized
function AppWithSupabase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Supabase is properly initialized
    const checkSupabase = async () => {
      try {
        // Try a simple authenticated call to verify Supabase is working
        const { error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Supabase initialization error:', error);
          setError(`Supabase initialization error: ${error.message}`);
        } else {
          console.log('Supabase initialized successfully');
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('Error checking Supabase:', err);
        setError(`Failed to initialize Supabase: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    checkSupabase();
  }, []);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-destructive/10">
        <div className="max-w-md p-6 bg-background border rounded shadow-lg">
          <h1 className="text-xl font-bold text-destructive mb-4">Configuration Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm">Please check your environment variables and ensure Supabase is properly configured.</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing application...</p>
        </div>
      </div>
    );
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppWithSupabase />
    </BrowserRouter>
  </StrictMode>,
)