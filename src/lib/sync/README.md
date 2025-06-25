# Subscription Data Synchronization

This document explains how to set up subscription data synchronization across multiple devices using Supabase.

## How Synchronization Works

In this application, subscription data is synchronized across devices when:

1. The user is logged in with a Supabase account
2. The required database tables exist in Supabase
3. The synchronization feature is enabled

Synchronization happens automatically when:
- The user logs in
- Subscription data is added, updated, or deleted
- Data is imported from external files

The user can also manually trigger synchronization from the UI.

## Setting Up Required Tables in Supabase

### Step 1: Access the Supabase SQL Editor

1. Log in to your Supabase dashboard
2. Select your project
3. Navigate to the "SQL Editor" section
4. Click "New query"

### Step 2: Run the Table Creation Script

Copy and paste the following SQL script into the SQL Editor:

```sql
-- Create subscriptions table for multi-device synchronization
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    plan TEXT NOT NULL,
    billing_cycle TEXT NOT NULL,
    next_billing_date DATE,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_method TEXT NOT NULL,
    start_date DATE,
    status TEXT NOT NULL DEFAULT 'active',
    category TEXT NOT NULL DEFAULT 'other',
    notes TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Index for faster queries by user
    CONSTRAINT subscription_user_id_idx UNIQUE (id, user_id)
);

-- Add Row Level Security (RLS) for the subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow users to only see and modify their own subscription data
CREATE POLICY "Users can only view their own subscriptions" ON public.subscriptions
    FOR ALL
    USING (auth.uid() = user_id);

-- Create the subscription_sync table to track synchronization status
CREATE TABLE IF NOT EXISTS public.subscription_sync (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT now(),
    sync_status TEXT DEFAULT 'success',
    sync_count INTEGER DEFAULT 0,
    device_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS for the subscription_sync table
ALTER TABLE public.subscription_sync ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for the subscription_sync table
CREATE POLICY "Users can only view their own sync data" ON public.subscription_sync
    FOR ALL
    USING (auth.uid() = user_id);
```

Click "Run" to execute the script.

## Using Subscription Synchronization

### Automatic Synchronization

The application automatically synchronizes subscription data in the following scenarios:

1. **Login**: When a user logs in, the application fetches the latest data from Supabase
2. **Data Changes**: After adding, updating, or deleting subscriptions
3. **Data Import**: When subscriptions are imported from external files

### Manual Synchronization

Users can manually synchronize data in two ways:

1. **From the navigation bar**: Click the sync icon in the top navigation bar
2. **From the options menu**: Click the "Options" button and select "Sync Across Devices"

### Sync Status Indicator

The sync status indicator in the navigation bar shows:

- **Check mark (green)**: Data is synced across devices
- **Alert icon (red)**: Sync error occurred
- **Cloud icon (normal)**: Ready to sync
- **Spinning icon**: Currently syncing

Hover over the icon to see the last sync time and status.

## Fallback Behavior

If Supabase is unavailable or tables don't exist:

1. The app falls back to local storage for data persistence
2. The sync indicator will show an error state
3. Data will still be preserved locally until connectivity is restored

## Troubleshooting

If synchronization is not working:

1. Ensure you're logged in with a valid Supabase account
2. Check that the required tables exist in your Supabase database
3. Verify your network connection
4. Try a manual sync to force a data refresh
5. Check browser console for error messages
6. Clear browser cache and reload if issues persist