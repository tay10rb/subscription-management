import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Download, Upload, Eye, EyeOff } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent, 
  SelectItem,
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

import { useSettingsStore, ThemeType, DefaultViewType } from "@/store/settingsStore"
import { ImportModal } from "@/components/imports/ImportModal"
import { useSubscriptionStore } from "@/store/subscriptionStore"
import {
  exportSubscriptionsToJSON,
  downloadFile,
} from "@/lib/subscription-utils"
import { useToast } from "@/hooks/use-toast"
import { ExchangeRateManager } from "@/components/ExchangeRateManager"
import { OptionsManager } from "@/components/subscription/OptionsManager"
import { useTheme } from "next-themes"

export function SettingsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Get tab from URL params
  const defaultTab = searchParams.get('tab') || 'general'

  // Theme from next-themes
  const { setTheme: setNextTheme } = useTheme()

  // Settings store values
  const {
    apiKey,
    setApiKey,
    theme,
    setTheme,
    defaultView,
    setDefaultView,
    showInactiveSubs,
    setShowInactiveSubs,
    enableEmailNotifications,
    setEnableEmailNotifications,
    emailAddress,
    setEmailAddress,
    reminderDays,
    setReminderDays,
    notificationFrequency,
    setNotificationFrequency,
    enableBrowserNotifications,
    setEnableBrowserNotifications,

    resetSettings,
    isLoading,
    fetchSettings
  } = useSettingsStore()

  // API Key local state
  const [tempApiKey, setTempApiKey] = useState(apiKey || "")
  const [isKeyVisible, setIsKeyVisible] = useState(false)

  // Subscription store methods
  const { subscriptions, resetSubscriptions, addSubscription } = useSubscriptionStore()

  useEffect(() => {
    fetchSettings()
  }, []) // Remove dependencies to prevent infinite re-renders
  
  // When the API key from the store changes, update the local state
  useEffect(() => {
    if (apiKey) {
      setTempApiKey(apiKey)
    }
  }, [apiKey])



  const handleSaveApiKey = async () => {
    await setApiKey(tempApiKey)
    toast({
      title: "API Key Saved",
      description: "Your new API key has been securely saved.",
    })
  }

  // Handle data export
  const handleExportData = () => {
    const data = exportSubscriptionsToJSON(subscriptions)
    downloadFile(data, "subscriptions.json", "application/json")
  }

  // Handle imports
  const handleImportData = (subscriptionData: any[]) => {
    subscriptionData.forEach((sub) => {
      addSubscription(sub)
    })
  }

  // Handle data reset with confirmation
  const handleResetData = async () => {
    if (window.confirm("Are you sure you want to reset all data? This cannot be undone.")) {
      await resetSubscriptions()
      await resetSettings()
      window.location.reload()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <Tabs defaultValue={defaultTab}>
        <div className="overflow-x-auto mb-4 sm:overflow-visible">
          <TabsList className="mb-4 min-w-max sm:min-w-0">
            <TabsTrigger value="general" className="text-xs sm:text-sm px-2 sm:px-3">General</TabsTrigger>
            <TabsTrigger value="currency" className="text-xs sm:text-sm px-2 sm:px-3">Currency</TabsTrigger>
            <TabsTrigger value="options" className="text-xs sm:text-sm px-2 sm:px-3">Options</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm px-1 sm:px-3">Notifications</TabsTrigger>
            <TabsTrigger value="data" className="text-xs sm:text-sm px-2 sm:px-3">Data</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Customize your general preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="default-view">Default View</Label>
                <Select
                  value={defaultView}
                  onValueChange={(value: DefaultViewType) => setDefaultView(value)}
                >
                  <SelectTrigger id="default-view">
                    <SelectValue placeholder="Select a default view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="subscriptions">Subscriptions</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Select which view to show when you open the app
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Show Cancelled Subscriptions</Label>
                  <p className="text-sm text-muted-foreground">
                    Display inactive subscriptions in your subscription list
                  </p>
                </div>
                <Switch
                  id="show-inactive"
                  checked={showInactiveSubs}
                  onCheckedChange={setShowInactiveSubs}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>Customize the look and feel of the app</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="theme">Theme Mode</Label>
                <Select
                  value={theme}
                  onValueChange={async (value: ThemeType) => {
                    // Update both stores to keep them in sync
                    await setTheme(value)
                    setNextTheme(value)
                  }}
                >
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose between light, dark, or system preference
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure email alerts for upcoming subscription renewals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive reminders about upcoming subscription renewals
                  </p>
                </div>
                <Switch 
                  id="email-notifications" 
                  checked={enableEmailNotifications}
                  onCheckedChange={setEnableEmailNotifications}
                />
              </div>

              {enableEmailNotifications && (
                <>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Where to send notification emails
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="reminder-days">Reminder Days</Label>
                    <Input 
                      id="reminder-days"
                      type="number"
                      min="1"
                      max="30"
                      value={reminderDays}
                      onChange={(e) => setReminderDays(parseInt(e.target.value, 10))}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      How many days before renewal to send a reminder
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="notification-frequency">Notification Frequency</Label>
                    <Select 
                      value={notificationFrequency} 
                      onValueChange={(value: 'once' | 'twice' | 'custom') => setNotificationFrequency(value)}
                    >
                      <SelectTrigger id="notification-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Daily Summary</SelectItem>
                        <SelectItem value="twice">Per Subscription</SelectItem>
                        <SelectItem value="custom">Weekly Summary</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      How often you want to receive reminder emails
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Browser Notifications</CardTitle>
              <CardDescription>
                Configure in-browser notifications for subscription alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Browser Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show browser pop-up notifications for upcoming renewals
                  </p>
                </div>
                <Switch 
                  id="browser-notifications" 
                  checked={enableBrowserNotifications}
                  onCheckedChange={setEnableBrowserNotifications}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="currency" className="space-y-4">
          <ExchangeRateManager />
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          <OptionsManager />
        </TabsContent>
   
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API & Synchronization</CardTitle>
              <CardDescription>
                Manage your API key for backend synchronization. This key is stored locally.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="api-key"
                    type={isKeyVisible ? "text" : "password"}
                    placeholder="Enter your API key"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsKeyVisible(!isKeyVisible)}
                  >
                    {isKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  The API key is required for creating, updating, or deleting subscriptions.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveApiKey}>Save API Key</Button>
            </CardFooter>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Export your subscriptions or import from another service
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button variant="outline" onClick={handleExportData}>
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import Data
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-4 border-destructive">
            <CardHeader>
              <CardTitle>Reset Data</CardTitle>
              <CardDescription>
                This will permanently delete all your subscriptions and settings. 
                This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleResetData}>
                Reset All Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
      
      <ImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImport={handleImportData}
      />
    </>
  )
}
