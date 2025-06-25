-- SQL Script to create the necessary tables for subscription management
-- Run this script in your Supabase SQL Editor to set up required database tables

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