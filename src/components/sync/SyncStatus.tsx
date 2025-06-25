import React, { useEffect, useState } from 'react';
import { forceSync, getSyncState } from '@/lib/sync/subscription-sync';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { Check, Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';

const SyncStatus: React.FC = () => {
  const { subscriptions, setSubscriptions } = useSubscriptionStore((state) => ({
    subscriptions: state.subscriptions,
    setSubscriptions: (subs: any) => {
      state.subscriptions = subs;
      localStorage.setItem('subscription-data', JSON.stringify(subs));
    }
  }));
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [syncState, setSyncState] = useState(getSyncState());
  
  // Update sync state display every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncState(getSyncState());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleManualSync = async () => {
    if (!user) {
      toast({
        title: "Sync Failed",
        description: "You must be logged in to sync data.",
        variant: "destructive"
      });
      return;
    }
    
    if (syncing) return;
    
    setSyncing(true);
    
    try {
      const result = await forceSync(subscriptions, user.id);
      
      if (result.status === 'success') {
        setSubscriptions(result.subscriptions);
        setSyncState(getSyncState());
        
        toast({
          title: "Sync Successful",
          description: "Your subscription data has been synchronized across devices."
        });
      } else {
        toast({
          title: "Sync Failed",
          description: result.error?.message || "Failed to synchronize data.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        title: "Sync Error",
        description: "An unexpected error occurred during synchronization.",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };
  
  // Get status icon
  const getStatusIcon = () => {
    if (syncing) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    
    if (!user) {
      return <CloudOff className="h-4 w-4 text-muted-foreground" />;
    }
    
    switch (syncState.status) {
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Cloud className="h-4 w-4" />;
    }
  };
  
  // Get tooltip text
  const getTooltipText = () => {
    if (!user) {
      return "Log in to enable sync across devices";
    }
    
    if (syncing) {
      return "Syncing your subscription data...";
    }
    
    if (syncState.lastSync) {
      return `Last synced ${formatDistanceToNow(syncState.lastSync)} ago`;
    }
    
    return "Click to sync subscription data across devices";
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleManualSync}
            disabled={!user || syncing}
          >
            {getStatusIcon()}
            <span className="sr-only">Sync status</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SyncStatus;