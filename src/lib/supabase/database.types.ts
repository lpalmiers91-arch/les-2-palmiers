export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_messages: {
        Row: {
          content: string
          created_at: string
          id: number
          model: string | null
          provider: string | null
          role: string
          thread_id: string
          tokens_in: number
          tokens_out: number
          tool_calls: Json | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: never
          model?: string | null
          provider?: string | null
          role: string
          thread_id: string
          tokens_in?: number
          tokens_out?: number
          tool_calls?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: never
          model?: string | null
          provider?: string | null
          role?: string
          thread_id?: string
          tokens_in?: number
          tokens_out?: number
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          default_model: string | null
          default_provider: string
          enabled_spaces: string[]
          id: number
          monthly_budget_usd: number | null
          provider_by_role: Json
          quotas: Json
          system_prompts: Json
          updated_at: string
          updated_by: string | null
          welcome_messages: Json
        }
        Insert: {
          default_model?: string | null
          default_provider?: string
          enabled_spaces?: string[]
          id?: number
          monthly_budget_usd?: number | null
          provider_by_role?: Json
          quotas?: Json
          system_prompts?: Json
          updated_at?: string
          updated_by?: string | null
          welcome_messages?: Json
        }
        Update: {
          default_model?: string | null
          default_provider?: string
          enabled_spaces?: string[]
          id?: number
          monthly_budget_usd?: number | null
          provider_by_role?: Json
          quotas?: Json
          system_prompts?: Json
          updated_at?: string
          updated_by?: string | null
          welcome_messages?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          space: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          space: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          space?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          day: string
          est_cost_usd: number
          id: number
          messages: number
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          day?: string
          est_cost_usd?: number
          id?: never
          messages?: number
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          day?: string
          est_cost_usd?: number
          id?: never
          messages?: number
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          country: string | null
          created_at: string
          event: string
          id: number
          meta: Json
          path: string | null
          referrer: string | null
          session_id: string
          ua: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          event: string
          id?: never
          meta?: Json
          path?: string | null
          referrer?: string | null
          session_id: string
          ua?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          event?: string
          id?: never
          meta?: Json
          path?: string | null
          referrer?: string | null
          session_id?: string
          ua?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      apartment_amenities: {
        Row: {
          amenity_key: string
          apartment_id: string
          detail: string | null
          id: string
          position: number
        }
        Insert: {
          amenity_key: string
          apartment_id: string
          detail?: string | null
          id?: string
          position?: number
        }
        Update: {
          amenity_key?: string
          apartment_id?: string
          detail?: string | null
          id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "apartment_amenities_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apartment_amenities_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "v_occupancy_monthly"
            referencedColumns: ["apartment_id"]
          },
        ]
      }
      apartment_ical_feeds: {
        Row: {
          active: boolean
          apartment_id: string
          created_at: string
          id: string
          label: string | null
          last_count: number | null
          last_status: string | null
          last_synced_at: string | null
          url: string
        }
        Insert: {
          active?: boolean
          apartment_id: string
          created_at?: string
          id?: string
          label?: string | null
          last_count?: number | null
          last_status?: string | null
          last_synced_at?: string | null
          url: string
        }
        Update: {
          active?: boolean
          apartment_id?: string
          created_at?: string
          id?: string
          label?: string | null
          last_count?: number | null
          last_status?: string | null
          last_synced_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartment_ical_feeds_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apartment_ical_feeds_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "v_occupancy_monthly"
            referencedColumns: ["apartment_id"]
          },
        ]
      }
      apartment_media: {
        Row: {
          alt: string | null
          apartment_id: string
          created_at: string
          id: string
          is_cover: boolean
          position: number
          storage_path: string
          type: string
        }
        Insert: {
          alt?: string | null
          apartment_id: string
          created_at?: string
          id?: string
          is_cover?: boolean
          position?: number
          storage_path: string
          type: string
        }
        Update: {
          alt?: string | null
          apartment_id?: string
          created_at?: string
          id?: string
          is_cover?: boolean
          position?: number
          storage_path?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartment_media_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apartment_media_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "v_occupancy_monthly"
            referencedColumns: ["apartment_id"]
          },
        ]
      }
      apartments: {
        Row: {
          address: string | null
          base_price: number
          bathrooms: number
          bedrooms: number
          cancellation_policy: string
          capacity: number
          checkin_from: string | null
          checkout_before: string | null
          cleaning_fee: number
          created_at: string
          currency: string
          description: string | null
          geo: unknown
          house_rules: Json
          i18n: Json
          ical_token: string | null
          id: string
          map_url: string | null
          name: string
          slug: string
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          base_price?: number
          bathrooms?: number
          bedrooms?: number
          cancellation_policy?: string
          capacity?: number
          checkin_from?: string | null
          checkout_before?: string | null
          cleaning_fee?: number
          created_at?: string
          currency?: string
          description?: string | null
          geo?: unknown
          house_rules?: Json
          i18n?: Json
          ical_token?: string | null
          id?: string
          map_url?: string | null
          name: string
          slug: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          base_price?: number
          bathrooms?: number
          bedrooms?: number
          cancellation_policy?: string
          capacity?: number
          checkin_from?: string | null
          checkout_before?: string | null
          cleaning_fee?: number
          created_at?: string
          currency?: string
          description?: string | null
          geo?: unknown
          house_rules?: Json
          i18n?: Json
          ical_token?: string | null
          id?: string
          map_url?: string | null
          name?: string
          slug?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          after: Json | null
          at: string
          before: Json | null
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity: string
          entity_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity?: string
          entity_id?: string | null
          id?: never
        }
        Relationships: []
      }
      availability_blocks: {
        Row: {
          apartment_id: string
          created_at: string
          created_by: string | null
          date_range: unknown
          id: string
          note: string | null
          reason: string
        }
        Insert: {
          apartment_id: string
          created_at?: string
          created_by?: string | null
          date_range: unknown
          id?: string
          note?: string | null
          reason?: string
        }
        Update: {
          apartment_id?: string
          created_at?: string
          created_by?: string | null
          date_range?: unknown
          id?: string
          note?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_blocks_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_blocks_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "v_occupancy_monthly"
            referencedColumns: ["apartment_id"]
          },
          {
            foreignKeyName: "availability_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      canned_responses: {
        Row: {
          active: boolean
          body: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          title: string
        }
        Insert: {
          active?: boolean
          body: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
        }
        Update: {
          active?: boolean
          body?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "canned_responses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          handled_at: string | null
          handled_by: string | null
          id: string
          locale: string | null
          message: string
          name: string
          phone: string | null
          source: string | null
          status: string
          subject: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          locale?: string | null
          message: string
          name: string
          phone?: string | null
          source?: string | null
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          locale?: string | null
          message?: string
          name?: string
          phone?: string | null
          source?: string | null
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string
          client_signature_name: string | null
          client_signed_at: string | null
          countersigned_at: string | null
          countersigned_by: string | null
          created_at: string
          id: string
          reference: string
          reservation_id: string | null
          sent_at: string | null
          sent_by: string | null
          staff_signature_name: string | null
          status: string
          template_version: string
          terms: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          client_signature_name?: string | null
          client_signed_at?: string | null
          countersigned_at?: string | null
          countersigned_by?: string | null
          created_at?: string
          id?: string
          reference: string
          reservation_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          staff_signature_name?: string | null
          status?: string
          template_version?: string
          terms?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          client_signature_name?: string | null
          client_signed_at?: string | null
          countersigned_at?: string | null
          countersigned_by?: string | null
          created_at?: string
          id?: string
          reference?: string
          reservation_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          staff_signature_name?: string | null
          status?: string
          template_version?: string
          terms?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_countersigned_by_fkey"
            columns: ["countersigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_staff_id: string | null
          created_at: string
          customer_id: string
          id: string
          last_message_at: string
          reservation_id: string | null
          status: string
          subject: string | null
          type: string
        }
        Insert: {
          assigned_staff_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          last_message_at?: string
          reservation_id?: string | null
          status?: string
          subject?: string | null
          type?: string
        }
        Update: {
          assigned_staff_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          last_message_at?: string
          reservation_id?: string | null
          status?: string
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          description: string | null
          id: string
          media: Json
          name: string
          position: number
          tag: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          media?: Json
          name: string
          position?: number
          tag?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          media?: Json
          name?: string
          position?: number
          tag?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          apartment_id: string
          client_id: string
          created_at: string
        }
        Insert: {
          apartment_id: string
          client_id: string
          created_at?: string
        }
        Update: {
          apartment_id?: string
          client_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "v_occupancy_monthly"
            referencedColumns: ["apartment_id"]
          },
          {
            foreignKeyName: "favorites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          activated_at: string | null
          amount: number
          balance: number
          code: string
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          message: string | null
          payment_id: string | null
          purchaser_id: string | null
          recipient_email: string | null
          recipient_name: string | null
          redeemed_by: string | null
          status: string
        }
        Insert: {
          activated_at?: string | null
          amount: number
          balance: number
          code: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          payment_id?: string | null
          purchaser_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_by?: string | null
          status?: string
        }
        Update: {
          activated_at?: string | null
          amount?: number
          balance?: number
          code?: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          message?: string | null
          payment_id?: string | null
          purchaser_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_purchaser_id_fkey"
            columns: ["purchaser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verifications: {
        Row: {
          created_at: string
          date_of_birth: string | null
          document_back_path: string | null
          document_expiry: string | null
          document_front_path: string
          document_number: string
          document_type: string
          id: string
          legal_full_name: string
          nationality: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          document_back_path?: string | null
          document_expiry?: string | null
          document_front_path: string
          document_number: string
          document_type: string
          id?: string
          legal_full_name: string
          nationality?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          document_back_path?: string | null
          document_expiry?: string | null
          document_front_path?: string
          document_number?: string
          document_type?: string
          id?: string
          legal_full_name?: string
          nationality?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          id: string
          issued_at: string
          number: string
          reservation_id: string
        }
        Insert: {
          id?: string
          issued_at?: string
          number: string
          reservation_id: string
        }
        Update: {
          id?: string
          issued_at?: string
          number?: string
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          audience: string
          body: string
          embedding: string | null
          id: string
          slug: string
          tags: string[]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience?: string
          body: string
          embedding?: string | null
          id?: string
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience?: string
          body?: string
          embedding?: string | null
          id?: string
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_accounts: {
        Row: {
          client_id: string
          credit_xof: number
          lifetime_points: number
          points: number
          tier: string
          updated_at: string
        }
        Insert: {
          client_id: string
          credit_xof?: number
          lifetime_points?: number
          points?: number
          tier?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          credit_xof?: number
          lifetime_points?: number
          points?: number
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_ledger: {
        Row: {
          actor_id: string | null
          client_id: string
          created_at: string
          delta: number
          id: number
          note: string | null
          reason: string
          ref: string | null
        }
        Insert: {
          actor_id?: string | null
          client_id: string
          created_at?: string
          delta: number
          id?: never
          note?: string | null
          reason: string
          ref?: string | null
        }
        Update: {
          actor_id?: string | null
          client_id?: string
          created_at?: string
          delta?: number
          id?: never
          note?: string | null
          reason?: string
          ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_ledger_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_ledger_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_settings: {
        Row: {
          currency_per_point: number
          enabled: boolean
          id: number
          min_redeem: number
          redeem_per_point: number
          referral_referred_points: number
          referral_referrer_points: number
          review_bonus: number
          signup_bonus: number
          tiers: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          currency_per_point?: number
          enabled?: boolean
          id?: number
          min_redeem?: number
          redeem_per_point?: number
          referral_referred_points?: number
          referral_referrer_points?: number
          review_bonus?: number
          signup_bonus?: number
          tiers?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          currency_per_point?: number
          enabled?: boolean
          id?: number
          min_redeem?: number
          redeem_per_point?: number
          referral_referred_points?: number
          referral_referrer_points?: number
          review_bonus?: number
          signup_bonus?: number
          tiers?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          body: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          sender_id: string | null
          system: boolean
        }
        Insert: {
          attachments?: Json
          body?: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          sender_id?: string | null
          system?: boolean
        }
        Update: {
          attachments?: Json
          body?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          sender_id?: string | null
          system?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channels: string[]
          created_at: string
          data: Json
          id: string
          read_at: string | null
          sent_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channels?: string[]
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          sent_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          channels?: string[]
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          sent_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          active_provider: string
          currency: string
          fedapay_public_key: string | null
          fx_rates: Json
          id: number
          kkiapay_public_key: string | null
          manual_instructions: string | null
          mode: string
          multicurrency_enabled: boolean
          stripe_public_key: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active_provider?: string
          currency?: string
          fedapay_public_key?: string | null
          fx_rates?: Json
          id?: number
          kkiapay_public_key?: string | null
          manual_instructions?: string | null
          mode?: string
          multicurrency_enabled?: boolean
          stripe_public_key?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active_provider?: string
          currency?: string
          fedapay_public_key?: string | null
          fx_rates?: Json
          id?: number
          kkiapay_public_key?: string | null
          manual_instructions?: string | null
          mode?: string
          multicurrency_enabled?: boolean
          stripe_public_key?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          channel: string
          charge_id: string | null
          created_at: string
          currency: string
          id: string
          internal_ref: string
          method: string
          paid_at: string | null
          payer_id: string
          proof_note: string | null
          proof_path: string | null
          provider: string
          provider_ref: string | null
          purpose: string
          raw_webhook: Json | null
          reservation_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_order_id: string | null
          sim_outcome: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          channel?: string
          charge_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          internal_ref: string
          method: string
          paid_at?: string | null
          payer_id: string
          proof_note?: string | null
          proof_path?: string | null
          provider?: string
          provider_ref?: string | null
          purpose: string
          raw_webhook?: Json | null
          reservation_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_order_id?: string | null
          sim_outcome?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          channel?: string
          charge_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          internal_ref?: string
          method?: string
          paid_at?: string | null
          payer_id?: string
          proof_note?: string | null
          proof_path?: string | null
          provider?: string
          provider_ref?: string | null
          purpose?: string
          raw_webhook?: Json | null
          reservation_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_order_id?: string | null
          sim_outcome?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "reservation_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string | null
          key: string
          label: string
        }
        Insert: {
          description?: string | null
          key: string
          label: string
        }
        Update: {
          description?: string | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      price_rules: {
        Row: {
          apartment_id: string
          created_at: string
          date_range: unknown
          discount_percent: number
          id: string
          label: string | null
          min_nights: number
          nightly_price: number
        }
        Insert: {
          apartment_id: string
          created_at?: string
          date_range: unknown
          discount_percent?: number
          id?: string
          label?: string | null
          min_nights?: number
          nightly_price: number
        }
        Update: {
          apartment_id?: string
          created_at?: string
          date_range?: unknown
          discount_percent?: number
          id?: string
          label?: string | null
          min_nights?: number
          nightly_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_rules_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "v_occupancy_monthly"
            referencedColumns: ["apartment_id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          full_name: string | null
          id: string
          last_seen_at: string | null
          locale: string
          nationality: string | null
          phone: string | null
          phone_verified: boolean
          postal_code: string | null
          preferences: Json
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          full_name?: string | null
          id: string
          last_seen_at?: string | null
          locale?: string
          nationality?: string | null
          phone?: string | null
          phone_verified?: boolean
          postal_code?: string | null
          preferences?: Json
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          full_name?: string | null
          id?: string
          last_seen_at?: string | null
          locale?: string
          nationality?: string | null
          phone?: string | null
          phone_verified?: boolean
          postal_code?: string | null
          preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          skills: string[]
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          skills?: string[]
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          skills?: string[]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: Json
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: Json
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: Json
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          hits: number
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          window_start?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          client_id: string
          code: string
          created_at: string
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          qualified_at: string | null
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          qualified_at?: string | null
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          qualified_at?: string | null
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_id: string
          provider_ref: string | null
          reason: string | null
          requested_by: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_id: string
          provider_ref?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_id?: string
          provider_ref?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_change_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          kind: string
          new_range: unknown
          reason: string | null
          requested_by: string
          reservation_id: string
          staff_note: string | null
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          kind: string
          new_range?: unknown
          reason?: string | null
          requested_by: string
          reservation_id: string
          staff_note?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          kind?: string
          new_range?: unknown
          reason?: string | null
          requested_by?: string
          reservation_id?: string
          staff_note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_change_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_change_requests_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_charges: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          id: string
          kind: string
          label: string
          note: string | null
          paid_at: string | null
          payment_id: string | null
          reference: string
          reservation_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          kind?: string
          label: string
          note?: string | null
          paid_at?: string | null
          payment_id?: string | null
          reference?: string
          reservation_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          kind?: string
          label?: string
          note?: string | null
          paid_at?: string | null
          payment_id?: string | null
          reference?: string
          reservation_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_charges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_charges_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_charges_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_events: {
        Row: {
          actor_id: string | null
          at: string
          id: number
          payload: Json
          reservation_id: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          at?: string
          id?: never
          payload?: Json
          reservation_id: string
          type: string
        }
        Update: {
          actor_id?: string | null
          at?: string
          id?: never
          payload?: Json
          reservation_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_events_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          amount_paid: number
          apartment_id: string
          cancellation: Json | null
          created_at: string
          currency: string
          date_range: unknown
          deposit_amount: number
          discount_amount: number
          fees: Json
          guest_id: string
          guests_count: number
          id: string
          nightly_price: number
          nights: number | null
          reference: string
          source: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          apartment_id: string
          cancellation?: Json | null
          created_at?: string
          currency?: string
          date_range: unknown
          deposit_amount?: number
          discount_amount?: number
          fees?: Json
          guest_id: string
          guests_count?: number
          id?: string
          nightly_price: number
          nights?: number | null
          reference: string
          source?: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          apartment_id?: string
          cancellation?: Json | null
          created_at?: string
          currency?: string
          date_range?: unknown
          deposit_amount?: number
          discount_amount?: number
          fees?: Json
          guest_id?: string
          guests_count?: number
          id?: string
          nightly_price?: number
          nights?: number | null
          reference?: string
          source?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "v_occupancy_monthly"
            referencedColumns: ["apartment_id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          apartment_id: string | null
          author_name: string | null
          body: string
          client_id: string
          created_at: string
          featured: boolean
          id: string
          rating: number
          reservation_id: string | null
          staff_reply: string | null
          staff_reply_at: string | null
          staff_reply_by: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          apartment_id?: string | null
          author_name?: string | null
          body?: string
          client_id: string
          created_at?: string
          featured?: boolean
          id?: string
          rating: number
          reservation_id?: string | null
          staff_reply?: string | null
          staff_reply_at?: string | null
          staff_reply_by?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          apartment_id?: string | null
          author_name?: string | null
          body?: string
          client_id?: string
          created_at?: string
          featured?: boolean
          id?: string
          rating?: number
          reservation_id?: string | null
          staff_reply?: string | null
          staff_reply_at?: string | null
          staff_reply_by?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "v_occupancy_monthly"
            referencedColumns: ["apartment_id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_staff_reply_by_fkey"
            columns: ["staff_reply_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_key: string
          role_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          label: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          is_system?: boolean
          label: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          label?: string
        }
        Relationships: []
      }
      seo_meta: {
        Row: {
          description: string | null
          no_index: boolean
          og_image: string | null
          path: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          no_index?: boolean
          og_image?: string | null
          path: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          no_index?: boolean
          og_image?: string | null
          path?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_meta_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          i18n: Json
          id: string
          label: string
          position: number
          slug: string
        }
        Insert: {
          i18n?: Json
          id?: string
          label: string
          position?: number
          slug: string
        }
        Update: {
          i18n?: Json
          id?: string
          label?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      service_order_events: {
        Row: {
          actor_id: string | null
          at: string
          id: number
          payload: Json
          service_order_id: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          at?: string
          id?: never
          payload?: Json
          service_order_id: string
          type: string
        }
        Update: {
          actor_id?: string | null
          at?: string
          id?: never
          payload?: Json
          service_order_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_events_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          address: string | null
          amount_paid: number
          assigned_provider_id: string | null
          assigned_staff_id: string | null
          created_at: string
          customer_id: string
          decline_reason: string | null
          id: string
          note: string | null
          options: Json
          payment_timing: string
          price: number | null
          reference: string
          requested_at: string
          reservation_id: string | null
          scheduled_for: string | null
          service_id: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          amount_paid?: number
          assigned_provider_id?: string | null
          assigned_staff_id?: string | null
          created_at?: string
          customer_id: string
          decline_reason?: string | null
          id?: string
          note?: string | null
          options?: Json
          payment_timing?: string
          price?: number | null
          reference: string
          requested_at?: string
          reservation_id?: string | null
          scheduled_for?: string | null
          service_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          amount_paid?: number
          assigned_provider_id?: string | null
          assigned_staff_id?: string | null
          created_at?: string
          customer_id?: string
          decline_reason?: string | null
          id?: string
          note?: string | null
          options?: Json
          payment_timing?: string
          price?: number | null
          reference?: string
          requested_at?: string
          reservation_id?: string | null
          scheduled_for?: string | null
          service_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_assigned_provider_id_fkey"
            columns: ["assigned_provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          base_price: number | null
          category_id: string | null
          created_at: string
          description: string | null
          i18n: Json
          icon: string | null
          id: string
          lead_time_hours: number
          options_schema: Json
          position: number
          pricing_mode: string
          slug: string
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          i18n?: Json
          icon?: string | null
          id?: string
          lead_time_hours?: number
          options_schema?: Json
          position?: number
          pricing_mode?: string
          slug: string
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          i18n?: Json
          icon?: string | null
          id?: string
          lead_time_hours?: number
          options_schema?: Json
          position?: number
          pricing_mode?: string
          slug?: string
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_blocks: {
        Row: {
          content: Json
          created_at: string
          id: string
          page_id: string
          position: number
          type: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          page_id: string
          position?: number
          type: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          page_id?: string
          position?: number
          type?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "site_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "site_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pages: {
        Row: {
          created_at: string
          id: string
          in_nav: boolean
          is_system: boolean
          nav_label: string | null
          nav_order: number
          seo: Json
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          in_nav?: boolean
          is_system?: boolean
          nav_label?: string | null
          nav_order?: number
          seo?: Json
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          in_nav?: boolean
          is_system?: boolean
          nav_label?: string | null
          nav_order?: number
          seo?: Json
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          branding: Json
          company: Json
          id: number
          legal: Json
          locales: string[]
          notification_defaults: Json
          payment_config: Json
          seo: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          branding?: Json
          company?: Json
          id?: number
          legal?: Json
          locales?: string[]
          notification_defaults?: Json
          payment_config?: Json
          seo?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          branding?: Json
          company?: Json
          id?: number
          legal?: Json
          locales?: string[]
          notification_defaults?: Json
          payment_config?: Json
          seo?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          active: boolean
          hired_at: string | null
          job_title: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          hired_at?: string | null
          job_title?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          hired_at?: string | null
          job_title?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_info: {
        Row: {
          apartment_id: string
          checkin_notes: string | null
          checkout_notes: string | null
          emergency_contact: string | null
          extras: Json
          house_manual: string | null
          updated_at: string
          updated_by: string | null
          wifi_password: string | null
          wifi_ssid: string | null
        }
        Insert: {
          apartment_id: string
          checkin_notes?: string | null
          checkout_notes?: string | null
          emergency_contact?: string | null
          extras?: Json
          house_manual?: string | null
          updated_at?: string
          updated_by?: string | null
          wifi_password?: string | null
          wifi_ssid?: string | null
        }
        Update: {
          apartment_id?: string
          checkin_notes?: string | null
          checkout_notes?: string | null
          emergency_contact?: string | null
          extras?: Json
          house_manual?: string | null
          updated_at?: string
          updated_by?: string | null
          wifi_password?: string | null
          wifi_ssid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stay_info_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: true
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_info_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: true
            referencedRelation: "v_occupancy_monthly"
            referencedColumns: ["apartment_id"]
          },
          {
            foreignKeyName: "stay_info_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_accounts: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          kind: string
          note: string | null
          payment_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          payment_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_analytics_daily: {
        Row: {
          bookings: number | null
          cta_clicks: number | null
          day: string | null
          sessions: number | null
          views: number | null
        }
        Relationships: []
      }
      v_occupancy_monthly: {
        Row: {
          apartment_id: string | null
          month: string | null
          nights_sold: number | null
        }
        Relationships: []
      }
      v_pending_queue: {
        Row: {
          created_at: string | null
          id: string | null
          kind: string | null
          reference: string | null
          status: string | null
        }
        Relationships: []
      }
      v_revenue_daily: {
        Row: {
          day: string | null
          gross_revenue: number | null
          paid_count: number | null
          purpose: string | null
        }
        Relationships: []
      }
      v_service_performance: {
        Row: {
          completed: number | null
          declined: number | null
          orders: number | null
          revenue: number | null
          slug: string | null
          title: string | null
        }
        Relationships: []
      }
      v_staff_activity: {
        Row: {
          actions: number | null
          actor_id: string | null
          actor_role: string | null
          day: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ai_space_enabled: { Args: { p_space: string }; Returns: boolean }
      analytics_countries: {
        Args: { p_days?: number }
        Returns: {
          country: string
          sessions: number
          views: number
        }[]
      }
      analytics_exit_pages: {
        Args: { p_days?: number }
        Returns: {
          exits: number
          path: string
        }[]
      }
      apartment_by_ical_token: {
        Args: { p_token: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      apartment_calendar: {
        Args: { p_apartment: string; p_from?: string; p_to?: string }
        Returns: string[]
      }
      apartment_ical_events: {
        Args: { p_apartment: string }
        Returns: {
          ends: string
          starts: string
          summary: string
          uid: string
        }[]
      }
      apartment_is_visible: { Args: { aid: string }; Returns: boolean }
      apply_ical_feed: {
        Args: { p_events: Json; p_feed: string }
        Returns: number
      }
      auth_has_permission: { Args: { perm: string }; Returns: boolean }
      auth_has_role: { Args: { role_key: string }; Returns: boolean }
      can_see_stay_info: { Args: { aid: string }; Returns: boolean }
      charge_pay_sim: {
        Args: { p_charge: string; p_method: string; p_outcome: string }
        Returns: {
          amount: number
          channel: string
          charge_id: string | null
          created_at: string
          currency: string
          id: string
          internal_ref: string
          method: string
          paid_at: string | null
          payer_id: string
          proof_note: string | null
          proof_path: string | null
          provider: string
          provider_ref: string | null
          purpose: string
          raw_webhook: Json | null
          reservation_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_order_id: string | null
          sim_outcome: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_referral: { Args: { p_code: string }; Returns: undefined }
      clear_notifications: { Args: never; Returns: undefined }
      countersign_contract: {
        Args: { p_contract: string; p_signature_name: string }
        Returns: {
          client_id: string
          client_signature_name: string | null
          client_signed_at: string | null
          countersigned_at: string | null
          countersigned_by: string | null
          created_at: string
          id: string
          reference: string
          reservation_id: string | null
          sent_at: string | null
          sent_by: string | null
          staff_signature_name: string | null
          status: string
          template_version: string
          terms: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_booking: {
        Args: {
          p_apartment: string
          p_deposit_percent?: number
          p_guests?: number
          p_range: unknown
          p_services?: string[]
        }
        Returns: {
          amount_paid: number
          apartment_id: string
          cancellation: Json | null
          created_at: string
          currency: string
          date_range: unknown
          deposit_amount: number
          discount_amount: number
          fees: Json
          guest_id: string
          guests_count: number
          id: string
          nightly_price: number
          nights: number | null
          reference: string
          source: string
          status: string
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_gift_card: {
        Args: {
          p_amount: number
          p_message?: string
          p_method?: string
          p_recipient_email: string
          p_recipient_name?: string
        }
        Returns: Json
      }
      create_reservation: {
        Args: {
          p_apartment: string
          p_deposit_percent?: number
          p_guests?: number
          p_range: unknown
        }
        Returns: {
          amount_paid: number
          apartment_id: string
          cancellation: Json | null
          created_at: string
          currency: string
          date_range: unknown
          deposit_amount: number
          discount_amount: number
          fees: Json
          guest_id: string
          guests_count: number
          id: string
          nightly_price: number
          nights: number | null
          reference: string
          source: string
          status: string
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_service: {
        Args: { p_pricing_mode?: string; p_title: string }
        Returns: {
          active: boolean
          base_price: number | null
          category_id: string | null
          created_at: string
          description: string | null
          i18n: Json
          icon: string | null
          id: string
          lead_time_hours: number
          options_schema: Json
          position: number
          pricing_mode: string
          slug: string
          title: string
          unit: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "services"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_service_order: {
        Args: {
          p_address?: string
          p_note?: string
          p_options?: Json
          p_reservation?: string
          p_scheduled_for?: string
          p_service: string
        }
        Returns: {
          address: string | null
          amount_paid: number
          assigned_provider_id: string | null
          assigned_staff_id: string | null
          created_at: string
          customer_id: string
          decline_reason: string | null
          id: string
          note: string | null
          options: Json
          payment_timing: string
          price: number | null
          reference: string
          requested_at: string
          reservation_id: string | null
          scheduled_for: string | null
          service_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_apartment: { Args: { p_apartment: string }; Returns: undefined }
      delete_contact_message: { Args: { p_id: string }; Returns: undefined }
      delete_message: { Args: { p_message: string }; Returns: undefined }
      delete_notification: { Args: { p_id: string }; Returns: undefined }
      delete_review: { Args: { p_id: string }; Returns: undefined }
      delete_service: { Args: { p_id: string }; Returns: undefined }
      delete_stay_info: { Args: { p_apartment: string }; Returns: undefined }
      fx_config: { Args: never; Returns: Json }
      gen_gift_code: { Args: never; Returns: string }
      gen_referral_code: { Args: { p_name: string }; Returns: string }
      get_or_create_invoice: {
        Args: { p_reservation: string }
        Returns: {
          issued_at: string
          number: string
        }[]
      }
      has_permission: { Args: { perm: string; uid: string }; Returns: boolean }
      has_role: { Args: { role_key: string; uid: string }; Returns: boolean }
      heartbeat: { Args: never; Returns: undefined }
      identity_status: { Args: { uid: string }; Returns: string }
      increment_ai_usage: {
        Args: { p_tokens_in?: number; p_tokens_out?: number; p_user: string }
        Returns: undefined
      }
      is_available: {
        Args: { p_apartment: string; p_range: unknown }
        Returns: boolean
      }
      is_identity_verified: { Args: { uid: string }; Returns: boolean }
      is_staff: { Args: { uid: string }; Returns: boolean }
      list_contracts: {
        Args: never
        Returns: {
          client_name: string
          client_signed_at: string
          countersigned_at: string
          created_at: string
          id: string
          reference: string
          reservation_ref: string
          status: string
          terms: Json
        }[]
      }
      list_identity_verifications: {
        Args: never
        Returns: {
          client_email: string
          client_name: string
          date_of_birth: string
          document_back_path: string
          document_expiry: string
          document_front_path: string
          document_number: string
          document_type: string
          id: string
          legal_full_name: string
          nationality: string
          rejection_reason: string
          reviewed_at: string
          selfie_path: string
          status: string
          submitted_at: string
          user_id: string
        }[]
      }
      loyalty_adjust: {
        Args: { p_client: string; p_delta: number; p_note: string }
        Returns: undefined
      }
      loyalty_award: {
        Args: { p_client: string; p_reason: string; p_ref: string }
        Returns: undefined
      }
      loyalty_award_payment: { Args: { p_payment: string }; Returns: undefined }
      loyalty_post: {
        Args: {
          p_actor?: string
          p_client: string
          p_delta: number
          p_note?: string
          p_reason: string
          p_ref?: string
        }
        Returns: undefined
      }
      loyalty_take_credit: {
        Args: { p_client: string; p_max: number }
        Returns: number
      }
      loyalty_tier_for: { Args: { pts: number }; Returns: string }
      mark_ical_feed_error: {
        Args: { p_feed: string; p_msg: string }
        Returns: undefined
      }
      moderate_review: {
        Args: {
          p_featured?: boolean
          p_id: string
          p_reply?: string
          p_status: string
        }
        Returns: {
          apartment_id: string | null
          author_name: string | null
          body: string
          client_id: string
          created_at: string
          featured: boolean
          id: string
          rating: number
          reservation_id: string | null
          staff_reply: string | null
          staff_reply_at: string | null
          staff_reply_by: string | null
          status: string
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_referral_code: { Args: never; Returns: string }
      notify_anon_key: { Args: never; Returns: string }
      notify_endpoint: { Args: never; Returns: string }
      notify_staff: {
        Args: { p_body: string; p_data?: Json; p_title: string; p_type: string }
        Returns: undefined
      }
      open_support_conversation: {
        Args: { p_subject?: string }
        Returns: {
          assigned_staff_id: string | null
          created_at: string
          customer_id: string
          id: string
          last_message_at: string
          reservation_id: string | null
          status: string
          subject: string | null
          type: string
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      payment_init: {
        Args: { p_method: string; p_purpose: string; p_target: string }
        Returns: {
          amount: number
          channel: string
          charge_id: string | null
          created_at: string
          currency: string
          id: string
          internal_ref: string
          method: string
          paid_at: string | null
          payer_id: string
          proof_note: string | null
          proof_path: string | null
          provider: string
          provider_ref: string | null
          purpose: string
          raw_webhook: Json | null
          reservation_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_order_id: string | null
          sim_outcome: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      payment_mark_failed_external: {
        Args: { p_internal_ref: string; p_raw?: Json }
        Returns: undefined
      }
      payment_mark_paid_external: {
        Args: {
          p_internal_ref: string
          p_provider: string
          p_provider_ref: string
          p_raw?: Json
        }
        Returns: {
          amount: number
          channel: string
          charge_id: string | null
          created_at: string
          currency: string
          id: string
          internal_ref: string
          method: string
          paid_at: string | null
          payer_id: string
          proof_note: string | null
          proof_path: string | null
          provider: string
          provider_ref: string | null
          purpose: string
          raw_webhook: Json | null
          reservation_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_order_id: string | null
          sim_outcome: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      payment_refund: {
        Args: { p_amount: number; p_payment: string; p_reason?: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          payment_id: string
          provider_ref: string | null
          reason: string | null
          requested_by: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "refunds"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      payment_resolve: {
        Args: { p_outcome: string; p_payment: string }
        Returns: {
          amount: number
          channel: string
          charge_id: string | null
          created_at: string
          currency: string
          id: string
          internal_ref: string
          method: string
          paid_at: string | null
          payer_id: string
          proof_note: string | null
          proof_path: string | null
          provider: string
          provider_ref: string | null
          purpose: string
          raw_webhook: Json | null
          reservation_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_order_id: string | null
          sim_outcome: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      payment_review_proof: {
        Args: { p_decision: string; p_note?: string; p_payment: string }
        Returns: {
          amount: number
          channel: string
          charge_id: string | null
          created_at: string
          currency: string
          id: string
          internal_ref: string
          method: string
          paid_at: string | null
          payer_id: string
          proof_note: string | null
          proof_path: string | null
          provider: string
          provider_ref: string | null
          purpose: string
          raw_webhook: Json | null
          reservation_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_order_id: string | null
          sim_outcome: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      payment_settings_public: { Args: never; Returns: Json }
      payment_submit_proof: {
        Args: {
          p_amount: number
          p_method: string
          p_note?: string
          p_proof_path: string
          p_purpose: string
          p_target: string
        }
        Returns: {
          amount: number
          channel: string
          charge_id: string | null
          created_at: string
          currency: string
          id: string
          internal_ref: string
          method: string
          paid_at: string | null
          payer_id: string
          proof_note: string | null
          proof_path: string | null
          provider: string
          provider_ref: string | null
          purpose: string
          raw_webhook: Json | null
          reservation_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_order_id: string | null
          sim_outcome: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      quote_stay: {
        Args: { p_apartment: string; p_guests?: number; p_range: unknown }
        Returns: Json
      }
      redeem_gift_card: { Args: { p_code: string }; Returns: Json }
      redeem_loyalty: {
        Args: { p_points: number }
        Returns: {
          client_id: string
          credit_xof: number
          lifetime_points: number
          points: number
          tier: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "loyalty_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_reservation_change: {
        Args: {
          p_kind: string
          p_new_range?: unknown
          p_reason?: string
          p_reservation: string
        }
        Returns: string
      }
      resolve_reservation_change: {
        Args: { p_approve: boolean; p_id: string; p_note?: string }
        Returns: undefined
      }
      review_identity_verification: {
        Args: { p_decision: string; p_id: string; p_reason?: string }
        Returns: {
          created_at: string
          date_of_birth: string | null
          document_back_path: string | null
          document_expiry: string | null
          document_front_path: string
          document_number: string
          document_type: string
          id: string
          legal_full_name: string
          nationality: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "identity_verifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      rl_hit: {
        Args: { p_key: string; p_max: number; p_window?: string }
        Returns: boolean
      }
      send_contract: {
        Args: { p_contract: string }
        Returns: {
          client_id: string
          client_signature_name: string | null
          client_signed_at: string | null
          countersigned_at: string | null
          countersigned_by: string | null
          created_at: string
          id: string
          reference: string
          reservation_id: string | null
          sent_at: string | null
          sent_by: string | null
          staff_signature_name: string | null
          status: string
          template_version: string
          terms: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_message: {
        Args: { p_attachments?: Json; p_body: string; p_conversation: string }
        Returns: {
          attachments: Json
          body: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          sender_id: string | null
          system: boolean
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      send_test_notification: { Args: never; Returns: undefined }
      set_contact_status: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      set_notification_prefs: {
        Args: { p_email: boolean; p_push: boolean }
        Returns: undefined
      }
      set_seo_meta: {
        Args: {
          p_description: string
          p_no_index?: boolean
          p_og_image?: string
          p_path: string
          p_title: string
        }
        Returns: undefined
      }
      set_seo_settings: { Args: { p_seo: Json }; Returns: undefined }
      sign_contract: {
        Args: { p_contract: string; p_fields?: Json; p_signature_name: string }
        Returns: {
          client_id: string
          client_signature_name: string | null
          client_signed_at: string | null
          countersigned_at: string | null
          countersigned_by: string | null
          created_at: string
          id: string
          reference: string
          reservation_id: string | null
          sent_at: string | null
          sent_by: string | null
          staff_signature_name: string | null
          status: string
          template_version: string
          terms: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      staff_add_charge: {
        Args: {
          p_amount: number
          p_kind: string
          p_label: string
          p_note?: string
          p_reservation: string
        }
        Returns: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          id: string
          kind: string
          label: string
          note: string | null
          paid_at: string | null
          payment_id: string | null
          reference: string
          reservation_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservation_charges"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      staff_place_booking: {
        Args: {
          p_apartment: string
          p_channel?: string
          p_guest_id: string
          p_guests?: number
          p_mark_paid?: string
          p_note?: string
          p_range: unknown
        }
        Returns: {
          amount_paid: number
          apartment_id: string
          cancellation: Json | null
          created_at: string
          currency: string
          date_range: unknown
          deposit_amount: number
          discount_amount: number
          fees: Json
          guest_id: string
          guests_count: number
          id: string
          nightly_price: number
          nights: number | null
          reference: string
          source: string
          status: string
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      staff_send_payment_details: {
        Args: { p_amount?: number; p_note?: string; p_reservation: string }
        Returns: {
          attachments: Json
          body: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          sender_id: string | null
          system: boolean
        }
        SetofOptions: {
          from: "*"
          to: "messages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      staff_update_charge: {
        Args: { p_charge: string; p_status: string }
        Returns: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          id: string
          kind: string
          label: string
          note: string | null
          paid_at: string | null
          payment_id: string | null
          reference: string
          reservation_id: string
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reservation_charges"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      staff_update_contract: {
        Args: { p_contract: string; p_terms: Json }
        Returns: {
          client_id: string
          client_signature_name: string | null
          client_signed_at: string | null
          countersigned_at: string | null
          countersigned_by: string | null
          created_at: string
          id: string
          reference: string
          reservation_id: string | null
          sent_at: string | null
          sent_by: string | null
          staff_signature_name: string | null
          status: string
          template_version: string
          terms: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contracts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_contact_message: {
        Args: {
          p_email: string
          p_locale?: string
          p_message: string
          p_name: string
          p_phone?: string
          p_rl_key?: string
          p_subject?: string
        }
        Returns: string
      }
      submit_identity_verification: {
        Args: {
          p_date_of_birth?: string
          p_document_back_path?: string
          p_document_expiry?: string
          p_document_front_path: string
          p_document_number: string
          p_document_type: string
          p_legal_full_name: string
          p_nationality?: string
          p_selfie_path: string
        }
        Returns: {
          created_at: string
          date_of_birth: string | null
          document_back_path: string | null
          document_expiry: string | null
          document_front_path: string
          document_number: string
          document_type: string
          id: string
          legal_full_name: string
          nationality: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "identity_verifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_review: {
        Args: {
          p_body: string
          p_rating: number
          p_reservation: string
          p_title: string
        }
        Returns: {
          apartment_id: string | null
          author_name: string | null
          body: string
          client_id: string
          created_at: string
          featured: boolean
          id: string
          rating: number
          reservation_id: string | null
          staff_reply: string | null
          staff_reply_at: string | null
          staff_reply_by: string | null
          status: string
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      toggle_favorite: { Args: { p_apartment: string }; Returns: boolean }
      track_event:
        | {
            Args: {
              p_event: string
              p_meta?: Json
              p_path?: string
              p_referrer?: string
              p_session: string
              p_ua?: string
              p_utm?: Json
            }
            Returns: undefined
          }
        | {
            Args: {
              p_country?: string
              p_event: string
              p_meta?: Json
              p_path?: string
              p_referrer?: string
              p_session: string
              p_ua?: string
              p_utm?: Json
            }
            Returns: undefined
          }
      trigger_ical_sync: { Args: never; Returns: undefined }
      wallet_apply: {
        Args: {
          p_amount: number
          p_kind: string
          p_note: string
          p_payment: string
          p_user: string
        }
        Returns: number
      }
      wallet_balance: { Args: { p_user?: string }; Returns: number }
      wallet_pay_charge: {
        Args: { p_charge: string }
        Returns: {
          amount: number
          channel: string
          charge_id: string | null
          created_at: string
          currency: string
          id: string
          internal_ref: string
          method: string
          paid_at: string | null
          payer_id: string
          proof_note: string | null
          proof_path: string | null
          provider: string
          provider_ref: string | null
          purpose: string
          raw_webhook: Json | null
          reservation_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_order_id: string | null
          sim_outcome: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_pay_reservation: {
        Args: { p_amount: number; p_reservation: string }
        Returns: {
          amount: number
          channel: string
          charge_id: string | null
          created_at: string
          currency: string
          id: string
          internal_ref: string
          method: string
          paid_at: string | null
          payer_id: string
          proof_note: string | null
          proof_path: string | null
          provider: string
          provider_ref: string | null
          purpose: string
          raw_webhook: Json | null
          reservation_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_order_id: string | null
          sim_outcome: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_topup_sim: {
        Args: { p_amount: number; p_method: string; p_outcome: string }
        Returns: {
          amount: number
          channel: string
          charge_id: string | null
          created_at: string
          currency: string
          id: string
          internal_ref: string
          method: string
          paid_at: string | null
          payer_id: string
          proof_note: string | null
          proof_path: string | null
          provider: string
          provider_ref: string | null
          purpose: string
          raw_webhook: Json | null
          reservation_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_order_id: string | null
          sim_outcome: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      withdraw_reservation_change: {
        Args: { p_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
