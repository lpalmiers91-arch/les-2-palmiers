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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
          id: string
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
          id?: string
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
          id?: string
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
          id: string
          sender_id: string | null
          system: boolean
        }
        Insert: {
          attachments?: Json
          body?: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
          system?: boolean
        }
        Update: {
          attachments?: Json
          body?: string
          conversation_id?: string
          created_at?: string
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
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          internal_ref: string
          method: string
          paid_at: string | null
          payer_id: string
          provider: string
          provider_ref: string | null
          purpose: string
          raw_webhook: Json | null
          reservation_id: string | null
          service_order_id: string | null
          sim_outcome: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          internal_ref: string
          method: string
          paid_at?: string | null
          payer_id: string
          provider?: string
          provider_ref?: string | null
          purpose: string
          raw_webhook?: Json | null
          reservation_id?: string | null
          service_order_id?: string | null
          sim_outcome?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          internal_ref?: string
          method?: string
          paid_at?: string | null
          payer_id?: string
          provider?: string
          provider_ref?: string | null
          purpose?: string
          raw_webhook?: Json | null
          reservation_id?: string | null
          service_order_id?: string | null
          sim_outcome?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
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
      service_categories: {
        Row: {
          id: string
          label: string
          position: number
          slug: string
        }
        Insert: {
          id?: string
          label: string
          position?: number
          slug: string
        }
        Update: {
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
      site_settings: {
        Row: {
          company: Json
          id: number
          legal: Json
          locales: string[]
          notification_defaults: Json
          payment_config: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company?: Json
          id?: number
          legal?: Json
          locales?: string[]
          notification_defaults?: Json
          payment_config?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company?: Json
          id?: number
          legal?: Json
          locales?: string[]
          notification_defaults?: Json
          payment_config?: Json
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
    }
    Views: {
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
      apartment_is_visible: { Args: { aid: string }; Returns: boolean }
      auth_has_permission: { Args: { perm: string }; Returns: boolean }
      auth_has_role: { Args: { role_key: string }; Returns: boolean }
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
          created_at: string
          currency: string
          id: string
          internal_ref: string
          method: string
          paid_at: string | null
          payer_id: string
          provider: string
          provider_ref: string | null
          purpose: string
          raw_webhook: Json | null
          reservation_id: string | null
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
          created_at: string
          currency: string
          id: string
          internal_ref: string
          method: string
          paid_at: string | null
          payer_id: string
          provider: string
          provider_ref: string | null
          purpose: string
          raw_webhook: Json | null
          reservation_id: string | null
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
      send_message: {
        Args: { p_attachments?: Json; p_body: string; p_conversation: string }
        Returns: {
          attachments: Json
          body: string
          conversation_id: string
          created_at: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
