export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          name: string
          plan: string
          billing_cycle: string
          next_billing_date: string
          amount: number
          currency: string
          payment_method: string
          start_date: string
          status: string
          category: string
          notes: string
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          plan: string
          billing_cycle: string
          next_billing_date: string
          amount: number
          currency: string
          payment_method: string
          start_date: string
          status: string
          category: string
          notes: string
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          plan?: string
          billing_cycle?: string
          next_billing_date?: string
          amount?: number
          currency?: string
          payment_method?: string
          start_date?: string
          status?: string
          category?: string
          notes?: string
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          currency: string
          default_view: string
          show_inactive_subs: boolean
          show_original_currency: boolean
          theme: string
          enable_email_notifications: boolean
          email_address: string | null
          reminder_days: number
          notification_frequency: string
          enable_browser_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          currency: string
          default_view: string
          show_inactive_subs: boolean
          show_original_currency: boolean
          theme: string
          enable_email_notifications: boolean
          email_address?: string | null
          reminder_days: number
          notification_frequency: string
          enable_browser_notifications: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          currency?: string
          default_view?: string
          show_inactive_subs?: boolean
          show_original_currency?: boolean
          theme?: string
          enable_email_notifications?: boolean
          email_address?: string | null
          reminder_days?: number
          notification_frequency?: string
          enable_browser_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}