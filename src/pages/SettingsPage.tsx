import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, Download, Upload, Eye, EyeOff } from "lucide-react"

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

import { useSettingsStore, ThemeType, DefaultViewType, CurrencyType } from "@/store/settingsStore"
import { ImportModal } from "@/components/imports/ImportModal"
import { useSubscriptionStore } from "@/store/subscriptionStore"
import { 
  exportSubscriptionsToJSON, 
  downloadFile,
} from "@/lib/subscription-utils"
import { useToast } from "@/hooks/use-toast"

export function SettingsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  // Import modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

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
    showOriginalCurrency,
    setShowOriginalCurrency,
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
    currency,
    setCurrency,
    exchangeRates,
    updateExchangeRate,
    lastExchangeRateUpdate,
    updateLastExchangeRateUpdate,
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
  }, [fetchSettings])
  
  // When the API key from the store changes, update the local state
  useEffect(() => {
    if (apiKey) {
      setTempApiKey(apiKey)
    }
  }, [apiKey])

  // Exchange rate temp state
  const [tempRates, setTempRates] = useState<Record<string, string>>({
    USD: exchangeRates.USD?.toString() || "1",
    EUR: exchangeRates.EUR?.toString() || "0.93",
    GBP: exchangeRates.GBP?.toString() || "0.79",
    CAD: exchangeRates.CAD?.toString() || "1.36",
    AUD: exchangeRates.AUD?.toString() || "1.52",
    JPY: exchangeRates.JPY?.toString() || "151.16",
    CNY: exchangeRates.CNY?.toString() || "7.24"
  })

  // Update temp rates when exchange rates change
  useEffect(() => {
    setTempRates({
      USD: exchangeRates.USD?.toString() || "1",
      EUR: exchangeRates.EUR?.toString() || "0.93",
      GBP: exchangeRates.GBP?.toString() || "0.79",
      CAD: exchangeRates.CAD?.toString() || "1.36",
      AUD: exchangeRates.AUD?.toString() || "1.52",
      JPY: exchangeRates.JPY?.toString() || "151.16",
      CNY: exchangeRates.CNY?.toString() || "7.24"
    })
  }, [exchangeRates])

  // Update exchange rate with validation
  const handleRateChange = (currency: string, value: string) => {
    setTempRates({
      ...tempRates,
      [currency]: value
    })
  }

  const saveExchangeRates = () => {
    Object.entries(tempRates).forEach(([currency, rateStr]) => {
      const rate = parseFloat(rateStr)
      if (!isNaN(rate) && rate > 0) {
        updateExchangeRate(currency, rate)
      }
    })
    updateLastExchangeRateUpdate()
    toast({
      title: "Success",
      description: "Exchange rates have been updated.",
    })
  }

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
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="currency">Currency</TabsTrigger>
        </TabsList>

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
              <CardTitle>Currency</CardTitle>
              <CardDescription>
                Set your preferred currency for expense calculation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="currency">Default Currency</Label>
                <Select 
                  value={currency} 
                  onValueChange={async (value: CurrencyType) => await setCurrency(value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select a currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                    <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Your preferred currency for displaying subscription costs
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Show in original currency</Label>
                  <p className="text-sm text-muted-foreground">
                    Always display the original subscription currency alongside converted values
                  </p>
                </div>
                <Switch 
                  id="show-original" 
                  checked={showOriginalCurrency}
                  onCheckedChange={setShowOriginalCurrency}
                />
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

        <TabsContent value="appearance" className="space-y-4">
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
                  onValueChange={async (value: ThemeType) => await setTheme(value)}
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

        <TabsContent value="currency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exchange Rates</CardTitle>
              <CardDescription>
                Configure currency exchange rates for conversion
                {lastExchangeRateUpdate && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Last updated: {new Date(lastExchangeRateUpdate).toLocaleString()}
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Rates are relative to 1 USD. Update these rates to ensure accurate currency conversion.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rate-usd">USD (US Dollar)</Label>
                  <Input
                    id="rate-usd"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={tempRates.USD}
                    onChange={(e) => handleRateChange("USD", e.target.value)}
                    disabled
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rate-eur">EUR (Euro)</Label>
                  <Input
                    id="rate-eur"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={tempRates.EUR}
                    onChange={(e) => handleRateChange("EUR", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rate-gbp">GBP (British Pound)</Label>
                  <Input
                    id="rate-gbp"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={tempRates.GBP}
                    onChange={(e) => handleRateChange("GBP", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rate-cad">CAD (Canadian Dollar)</Label>
                  <Input
                    id="rate-cad"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={tempRates.CAD}
                    onChange={(e) => handleRateChange("CAD", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rate-aud">AUD (Australian Dollar)</Label>
                  <Input
                    id="rate-aud"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={tempRates.AUD}
                    onChange={(e) => handleRateChange("AUD", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rate-jpy">JPY (Japanese Yen)</Label>
                  <Input
                    id="rate-jpy"
                    type="number"
                    step="0.01"
                    min="0"
                    value={tempRates.JPY}
                    onChange={(e) => handleRateChange("JPY", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rate-cny">CNY (Chinese Yuan)</Label>
                  <Input
                    id="rate-cny"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={tempRates.CNY}
                    onChange={(e) => handleRateChange("CNY", e.target.value)}
                  />
                </div>
              </div>
              
              <Button onClick={saveExchangeRates} className="w-full mt-4">
                Save Exchange Rates
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
    </div>
  )
}
