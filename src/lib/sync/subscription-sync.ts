import { Subscription } from '@/store/subscriptionStore';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Constants
const SYNC_DEBOUNCE_MS = 2000;
const DEVICE_ID_KEY = 'sub-tracker-device-id';
const LAST_SYNC_KEY = 'sub-tracker-last-sync';
const SYNC_STATUS_KEY = 'sub-sync-status';

// Types
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict';
export type SyncDirection = 'push' | 'pull' | 'both';

export interface SyncState {
  status: SyncStatus;
  lastSync: Date | null;
  lastError: Error | null;
  deviceId: string;
  syncCount: number;
}

// Initialize device ID if not exists
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
};

// Initial sync state
const initialSyncState: SyncState = {
  status: 'idle',
  lastSync: null,
  lastError: null,
  deviceId: getDeviceId(),
  syncCount: 0
};

// Manage sync state
let syncState: SyncState = { ...initialSyncState };
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

// Helper function to check if subscriptions table exists
const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('count')
      .limit(1);
    
    return !error || !error.message.includes('does not exist');
  } catch {
    return false;
  }
};

// Helper function to transform subscription data for DB
const transformToDbFormat = (sub: Subscription, userId: string) => {
  return {
    id: sub.id,  // We'll keep the existing ID for syncing
    user_id: userId,
    name: sub.name,
    plan: sub.plan,
    billing_cycle: sub.billingCycle,
    next_billing_date: sub.nextBillingDate,
    amount: sub.amount,
    currency: sub.currency,
    payment_method: sub.paymentMethod,
    start_date: sub.startDate,
    status: sub.status,
    category: sub.category,
    notes: sub.notes,
    website: sub.website || null
  };
};

// Helper function to transform subscription data from DB to frontend format
const transformFromDbFormat = (sub: any): Subscription => {
  return {
    id: sub.id,
    name: sub.name,
    plan: sub.plan,
    billingCycle: sub.billing_cycle,
    nextBillingDate: sub.next_billing_date,
    amount: sub.amount,
    currency: sub.currency,
    paymentMethod: sub.payment_method,
    startDate: sub.start_date,
    status: sub.status,
    category: sub.category,
    notes: sub.notes,
    website: sub.website
  };
};

// Update sync status
const updateSyncState = (state: Partial<SyncState>) => {
  syncState = { ...syncState, ...state };
  
  // Save status to localStorage for persistence
  if (state.status) {
    localStorage.setItem(SYNC_STATUS_KEY, state.status);
  }
  
  if (state.lastSync) {
    localStorage.setItem(LAST_SYNC_KEY, state.lastSync.toISOString());
  }
  
  return syncState;
};

// Record sync event in the Supabase
const recordSyncEvent = async (status: SyncStatus, userId: string | undefined): Promise<void> => {
  if (!userId) return;
  
  try {
    const tableExists = await checkTableExists('subscription_sync');
    if (!tableExists) return;
    
    const syncData = {
      user_id: userId,
      last_sync: new Date().toISOString(),
      sync_status: status,
      device_id: syncState.deviceId,
      sync_count: syncState.syncCount + 1,
      updated_at: new Date().toISOString()
    };
    
    await supabase
      .from('subscription_sync')
      .upsert(syncData, { onConflict: 'user_id' });
      
    updateSyncState({ 
      syncCount: syncState.syncCount + 1 
    });
  } catch (error) {
    console.error('Failed to record sync event:', error);
  }
};

/**
 * Main function to synchronize subscription data with Supabase
 */
export const synchronizeSubscriptions = async (
  subscriptions: Subscription[],
  userId: string | undefined,
  direction: SyncDirection = 'both'
): Promise<{ 
  subscriptions: Subscription[],
  status: SyncStatus,
  error: Error | null 
}> => {
  // If no user ID, we can't sync
  if (!userId) {
    return { 
      subscriptions, 
      status: 'error', 
      error: new Error('No user ID available. Please log in to sync data.') 
    };
  }
  
  updateSyncState({ status: 'syncing' });
  
  try {
    // Check if the table exists
    const tableExists = await checkTableExists('subscriptions');
    if (!tableExists) {
      throw new Error('Subscriptions table does not exist in Supabase. Run the SQL setup script.');
    }
    
    let resultSubscriptions = [...subscriptions];
    
    // Pull data from server if needed
    if (direction === 'pull' || direction === 'both') {
      const { data: remoteData, error: pullError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId);
        
      if (pullError) throw pullError;
      
      // Transform the remote data
      let remoteSubscriptions: Subscription[] = [];
      if (remoteData && remoteData.length > 0) {
        remoteSubscriptions = remoteData.map(transformFromDbFormat);
      }
      
      // If this is a pull-only operation, return the remote data
      if (direction === 'pull') {
        resultSubscriptions = remoteSubscriptions;
      } 
      // For 'both' direction, merge local and remote data with preference to most recently updated
      else {
        // Create a map of existing subscriptions by ID
        const localSubsMap = new Map<string, Subscription>();
        subscriptions.forEach(sub => localSubsMap.set(sub.id, sub));
        
        // Process remote subscriptions, preferring them over local ones
        // This simple strategy assumes the server has the most accurate data
        remoteSubscriptions.forEach(remoteSub => {
          localSubsMap.set(remoteSub.id, remoteSub);
        });
        
        // Convert map back to array
        resultSubscriptions = Array.from(localSubsMap.values());
      }
    }
    
    // Push data to server if needed
    if (direction === 'push' || direction === 'both') {
      // Transform subscriptions to DB format
      const dbSubscriptions = resultSubscriptions.map(sub => transformToDbFormat(sub, userId));
      
      // Upsert all subscriptions
      const { error: pushError } = await supabase
        .from('subscriptions')
        .upsert(dbSubscriptions, { 
          onConflict: 'id'
        });
        
      if (pushError) throw pushError;
    }
    
    // Save to localStorage as backup
    localStorage.setItem('subscription-data', JSON.stringify(resultSubscriptions));
    
    // Update sync status
    const now = new Date();
    updateSyncState({ 
      status: 'success', 
      lastSync: now,
      lastError: null
    });
    
    // Record sync event
    await recordSyncEvent('success', userId);
    
    return { 
      subscriptions: resultSubscriptions, 
      status: 'success', 
      error: null 
    };
    
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error : new Error('Unknown sync error');
    console.error('Sync error:', errorMessage);
    
    // Update sync status with error
    updateSyncState({ 
      status: 'error',
      lastError: errorMessage
    });
    
    // Record sync event
    await recordSyncEvent('error', userId);
    
    return { 
      subscriptions, 
      status: 'error', 
      error: errorMessage 
    };
  }
};

/**
 * Schedule a sync operation with debounce
 */
export const scheduleSync = (
  subscriptions: Subscription[],
  userId: string | undefined,
  immediate = false
): void => {
  // Clear existing timeout if any
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  
  if (immediate) {
    synchronizeSubscriptions(subscriptions, userId);
    return;
  }
  
  // Schedule a new sync with debounce
  syncTimeout = setTimeout(() => {
    synchronizeSubscriptions(subscriptions, userId);
  }, SYNC_DEBOUNCE_MS);
};

/**
 * Get the current sync state
 */
export const getSyncState = (): SyncState => {
  const savedStatus = localStorage.getItem(SYNC_STATUS_KEY) as SyncStatus | null;
  const savedLastSync = localStorage.getItem(LAST_SYNC_KEY);
  
  return {
    ...syncState,
    status: savedStatus || syncState.status,
    lastSync: savedLastSync ? new Date(savedLastSync) : syncState.lastSync
  };
};

/**
 * Force immediate sync
 */
export const forceSync = async (
  subscriptions: Subscription[],
  userId: string | undefined
): Promise<{ 
  subscriptions: Subscription[],
  status: SyncStatus,
  error: Error | null 
}> => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  
  return synchronizeSubscriptions(subscriptions, userId);
};

/**
 * Reset sync status (for testing)
 */
export const resetSyncState = (): void => {
  syncState = { ...initialSyncState, deviceId: getDeviceId() };
  localStorage.removeItem(SYNC_STATUS_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
};