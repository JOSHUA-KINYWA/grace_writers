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
      services: {
        Row: {
          id: string
          title: string
          slug: string
          category: string
          description: string | null
          pricing_type: 'fixed' | 'hourly' | 'package' | 'custom'
          base_price: number | null
          hourly_rate: number | null
          delivery_days: number | null
          skills: string[]
          status: 'active' | 'archived'
          images: string[]
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['services']['Insert']>
      }
      pricing_tiers: {
        Row: {
          id: string
          service_id: string
          tier_name: string
          price: number
          features: string[]
          delivery_days: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['pricing_tiers']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['pricing_tiers']['Insert']>
      }
      portfolio_items: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          client_name: string | null
          service_id: string | null
          technologies: string[]
          results: string | null
          images: string[]
          featured: boolean
          created_at: string
          display_order: number
        }
        Insert: Omit<Database['public']['Tables']['portfolio_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['portfolio_items']['Insert']>
      }
      testimonials: {
        Row: {
          id: string
          client_name: string
          company: string | null
          rating: number | null
          comment: string
          service_id: string | null
          avatar_url: string | null
          featured: boolean
          approved: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['testimonials']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['testimonials']['Insert']>
      }
      inquiries: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          service_id: string | null
          message: string | null
          status: 'new' | 'contacted' | 'won' | 'lost'
          notes: string | null
          created_at: string
          followed_up_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['inquiries']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['inquiries']['Insert']>
      }
      clients: {
        Row: {
          id: string
          email: string
          name: string
          phone: string | null
          company: string | null
          whatsapp_number: string | null
          date_registered: string
          total_projects: number
          total_spent: number
          last_contacted: string | null
        }
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'date_registered'>
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      order_history: {
        Row: {
          id: string
          client_id: string
          service_id: string | null
          date_contacted: string
          status: 'quote_sent' | 'in_progress' | 'delivered' | 'completed'
          quote_amount: number | null
          paid_amount: number | null
          whatsapp_chat_link: string | null
          deliverable_link: string | null
          notes: string | null
        }
        Insert: Omit<Database['public']['Tables']['order_history']['Row'], 'id' | 'date_contacted'>
        Update: Partial<Database['public']['Tables']['order_history']['Insert']>
      }
      site_settings: {
        Row: {
          id: string
          whatsapp_number: string | null
          email: string | null
          logo_url: string | null
          hero_headline: string | null
          hero_subtext: string | null
          about_me_text: string | null
          social_links: Json
          google_analytics_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['site_settings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['site_settings']['Insert']>
      }
      orders: {
        Row: {
          id: string
          client_id: string | null
          title: string | null
          description: string | null
          status: string | null
          total_revisions_requested: number | null
          current_revision_number: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }

      order_messages: {
        Row: {
          id: string
          order_id: string
          sender_id: string | null
          sender_name: string | null
          content: string | null
          is_admin: boolean | null
          read_status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['order_messages']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['order_messages']['Insert']>
      }

      revisions: {
        Row: {
          id: string
          order_id: string
          revision_number: number | null
          requested_by: string | null
          requested_reason: string | null
          status: string | null
          completed_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['revisions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['revisions']['Insert']>
      }

      revision_files: {
        Row: {
          id: string
          revision_id: string
          file_url: string | null
          created_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['revision_files']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['revision_files']['Insert']>
      }

      notifications: {
        Row: {
          id: string
          user_id: string
          order_id: string | null
          type: string | null
          title: string | null
          message: string | null
          read: boolean | null
          created_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }

      direct_messages: {
        Row: {
          id: string
          sender_id: string
          sender_name: string
          recipient_id: string
          content: string
          is_admin: boolean
          read_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['direct_messages']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['direct_messages']['Insert']>
      }

      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          phone: string | null
          account_type: 'client' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }

      admin_actions: {
        Row: {
          id: string
          admin_id: string
          action_type: string
          target_user_id: string | null
          details: Record<string, any> | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_actions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['admin_actions']['Insert']>
      }
    }
  }
}
