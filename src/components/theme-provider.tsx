"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { applyTheme, setupSystemThemeListener } from "@/lib/theme-sync"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  
  // Apply theme immediately on mount and set up system theme listener
  React.useEffect(() => {
    const theme = localStorage.getItem(props.storageKey || 'theme') as any || props.defaultTheme || 'system';
    applyTheme(theme);
    
    // Set up listener for system theme changes
    const cleanup = setupSystemThemeListener();
    
    return cleanup;
  }, [props.defaultTheme, props.storageKey]);
  
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}