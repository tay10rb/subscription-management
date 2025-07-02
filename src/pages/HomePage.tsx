import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  CreditCard,
  DollarSign,
  Clock
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import {
  useSubscriptionStore,
  Subscription
} from "@/store/subscriptionStore"
import { useSettingsStore } from "@/store/settingsStore"
import { formatCurrency } from "@/lib/subscription-utils"

import { SubscriptionForm } from "@/components/subscription/SubscriptionForm"
import { StatCard } from "@/components/dashboard/StatCard"
import { UpcomingRenewals } from "@/components/dashboard/UpcomingRenewals"
import { RecentlyPaid } from "@/components/dashboard/RecentlyPaid"
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown"
import { ImportModal } from "@/components/imports/ImportModal"

function HomePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  // Get the default view from settings
  const { currency: userCurrency, fetchSettings } = useSettingsStore()
  
  const {
    subscriptions,
    bulkAddSubscriptions,
    updateSubscription,
    fetchSubscriptions,
    getTotalMonthlySpending,
    getTotalYearlySpending,
    getUpcomingRenewals,
    getRecentlyPaid,
    getSpendingByCategory,
    processAutoRenewals,
    isLoading
  } = useSubscriptionStore()

  // Fetch subscriptions when component mounts
  useEffect(() => {
    const initializeData = async () => {
      await fetchSubscriptions()
      await fetchSettings()

      // Process auto-renewals after fetching subscriptions
      try {
        const result = await processAutoRenewals()
        if (result.processed > 0) {
          console.log(`Auto-renewed ${result.processed} subscription(s)`)
          // Refresh subscriptions after auto-renewal
          await fetchSubscriptions()
        }
        if (result.errors > 0) {
          console.warn(`Failed to auto-renew ${result.errors} subscription(s)`)
        }
      } catch (error) {
        console.error('Error processing auto-renewals:', error)
      }
    }

    initializeData()
  }, [fetchSubscriptions, fetchSettings])
  




  // Handler for updating subscription
  const handleUpdateSubscription = async (id: number, data: Omit<Subscription, "id" | "lastBillingDate">) => {
    const { error } = await updateSubscription(id, data)
    
    if (error) {
      toast({
        title: "Error updating subscription",
        description: error.message || "Failed to update subscription",
        variant: "destructive"
      })
      return
    }
    
    setEditingSubscription(null)
    toast({
      title: "Subscription updated",
      description: `${data.name} has been updated successfully.`
    })
  }



  // Handler for importing subscriptions
  const handleImportSubscriptions = async (newSubscriptions: Omit<Subscription, "id">[]) => {
    const { error } = await bulkAddSubscriptions(newSubscriptions);

    if (error) {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import subscriptions",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Import successful",
        description: `${newSubscriptions.length} subscriptions have been imported.`,
      });
    }

    // Final fetch to ensure UI is up-to-date
    fetchSubscriptions();
  };


  
  // Get data for dashboard
  const monthlySpending = getTotalMonthlySpending()
  const yearlySpending = getTotalYearlySpending()
  const upcomingRenewals = getUpcomingRenewals(7)
  const recentlyPaidSubscriptions = getRecentlyPaid(7)
  const spendingByCategory = getSpendingByCategory()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading subscriptions...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your subscription expenses and activity
        </p>
      </div>

      {/* Dashboard Content */}
      <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard 
              title="Monthly Spending" 
              value={formatCurrency(monthlySpending, userCurrency)}
              description="Total active subscriptions"
              icon={CreditCard}
            />
            <StatCard 
              title="Yearly Spending" 
              value={formatCurrency(yearlySpending, userCurrency)}
              description="Projected annual cost"
              icon={DollarSign}
            />
            <StatCard 
              title="Active Subscriptions" 
              value={subscriptions.filter(sub => sub.status === "active").length}
              description="Total services"
              icon={Clock}
            />
          </div>
          
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            <RecentlyPaid
              subscriptions={recentlyPaidSubscriptions}
              onViewAll={() => {
                // Navigate to subscriptions page
                navigate('/subscriptions')
              }}
            />

            <UpcomingRenewals
              subscriptions={upcomingRenewals}
              onViewAll={() => {
                // Navigate to subscriptions page
                navigate('/subscriptions')
              }}
            />

            <CategoryBreakdown data={spendingByCategory} />
          </div>
        </div>



      {/* Forms and Modals */}
      {editingSubscription && (
        <SubscriptionForm
          open={Boolean(editingSubscription)}
          onOpenChange={() => setEditingSubscription(null)}
          initialData={editingSubscription}
          onSubmit={(data) => handleUpdateSubscription(editingSubscription.id, data)}
        />
      )}
      
      <ImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImport={handleImportSubscriptions}
      />
    </>
  )
}

export default HomePage