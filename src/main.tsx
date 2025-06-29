import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)