import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Settings,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation()

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-6 md:gap-10">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl">SubManager</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant={location.pathname === '/' ? "default" : "ghost"} size="sm">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            
            <Link to="/settings">
              <Button variant={location.pathname === '/settings' ? "default" : "ghost"} size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
            
            <ModeToggle />
          </div>
        </div>
      </header>
      
      <main className="container py-6 flex-grow">{children}</main>
      
      <footer className="border-t py-6">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            &copy; {new Date().getFullYear()} SubManager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
