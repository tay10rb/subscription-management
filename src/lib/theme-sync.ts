/**
 * Theme synchronization utilities
 * Handles synchronization between next-themes, localStorage, and DOM classes
 */
import { type ThemeType } from "@/store/settingsStore";

// Function to apply theme directly to DOM
export function applyTheme(theme: ThemeType): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else if (theme === 'system') {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (systemPrefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

// Setup listener for system preference changes (for 'system' theme)
export function setupSystemThemeListener(): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = () => {
    // Get current theme from localStorage
    const theme = localStorage.getItem('vite-ui-theme') || 'system';
    if (theme === 'system') {
      applyTheme('system');
    }
  };
  
  mediaQuery.addEventListener('change', handleChange);
  
  // Return cleanup function
  return () => mediaQuery.removeEventListener('change', handleChange);
}