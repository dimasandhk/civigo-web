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
      agencies: {
        Row: {
          close_time: string
          description: string | null
          id: number
          name: string
          open_time: string
          operating_days: number[]
        }
        Insert: {
          close_time?: string
          description?: string | null
          id?: number
          name: string
          open_time?: string
          operating_days?: number[]
        }
        Update: {
          close_time?: string
          description?: string | null
          id?: number
          name?: string
          open_time?: string
          operating_days?: number[]
        }
        Relationships: []
      }
      agency_locations: {
        Row: {
          agency_id: number
          created_at: string
          location_id: number
        }
        Insert: {
          agency_id: number
          created_at?: string
          location_id: number
        }
        Update: {
          agency_id?: number
          created_at?: string
          location_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "agency_locations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      counters: {
        Row: {
          agency_id: number | null
          counter_name: string
          id: number
          location_id: number | null
          status: string | null
        }
        Insert: {
          agency_id?: number | null
          counter_name: string
          id?: number
          location_id?: number | null
          status?: string | null
        }
        Update: {
          agency_id?: number | null
          counter_name?: string
          id?: number
          location_id?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "counters_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counters_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content: string
          embedding?: string | null
          id?: never
          metadata?: Json | null
        }
        Update: {
          content?: string
          embedding?: string | null
          id?: never
          metadata?: Json | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string | null
          full_name: string
          id: number
          nik: string
          relationship: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: number
          nik: string
          relationship: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: number
          nik?: string
          relationship?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string
          city: string | null
          created_at: string
          id: number
          latitude: number | null
          longitude: number | null
          name: string
          type: string
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string
          id?: number
          latitude?: number | null
          longitude?: number | null
          name: string
          type?: string
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string
          id?: number
          latitude?: number | null
          longitude?: number | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      queues: {
        Row: {
          counter_id: number | null
          created_at: string | null
          id: string
          location_id: number | null
          nik: string | null
          postponed: boolean
          postponed_at: string | null
          queue_number: string
          rescheduled_from: string | null
          schedule_date: string
          service_id: number | null
          status: string
          time_block: string | null
          user_id: string | null
        }
        Insert: {
          counter_id?: number | null
          created_at?: string | null
          id?: string
          location_id?: number | null
          nik?: string | null
          postponed?: boolean
          postponed_at?: string | null
          queue_number: string
          rescheduled_from?: string | null
          schedule_date: string
          service_id?: number | null
          status?: string
          time_block?: string | null
          user_id?: string | null
        }
        Update: {
          counter_id?: number | null
          created_at?: string | null
          id?: string
          location_id?: number | null
          nik?: string | null
          postponed?: boolean
          postponed_at?: string | null
          queue_number?: string
          rescheduled_from?: string | null
          schedule_date?: string
          service_id?: number | null
          status?: string
          time_block?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queues_counter_id_fkey"
            columns: ["counter_id"]
            isOneToOne: false
            referencedRelation: "counters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queues_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queues_rescheduled_from_fkey"
            columns: ["rescheduled_from"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queues_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queues_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          agency_id: number
          comment: string | null
          counter_id: number | null
          created_at: string
          id: number
          queue_id: string | null
          rating: number
          service_id: number | null
          user_id: string | null
        }
        Insert: {
          agency_id: number
          comment?: string | null
          counter_id?: number | null
          created_at?: string
          id?: never
          queue_id?: string | null
          rating: number
          service_id?: number | null
          user_id?: string | null
        }
        Update: {
          agency_id?: number
          comment?: string | null
          counter_id?: number | null
          created_at?: string
          id?: never
          queue_id?: string | null
          rating?: number
          service_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_counter_id_fkey"
            columns: ["counter_id"]
            isOneToOne: false
            referencedRelation: "counters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_documents: {
        Row: {
          agency_id: number | null
          created_at: string
          description: string | null
          id: number
          name: string
        }
        Insert: {
          agency_id?: number | null
          created_at?: string
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          agency_id?: number | null
          created_at?: string
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          agency_id: number | null
          estimated_time: number | null
          id: number
          info_procedure: string | null
          name: string
          output_doc_ids: number[]
          output_documents: string[]
          requirement_doc_ids: number[]
          requirements: Json | null
        }
        Insert: {
          agency_id?: number | null
          estimated_time?: number | null
          id?: number
          info_procedure?: string | null
          name: string
          output_doc_ids?: number[]
          output_documents?: string[]
          requirement_doc_ids?: number[]
          requirements?: Json | null
        }
        Update: {
          agency_id?: number | null
          estimated_time?: number | null
          id?: number
          info_procedure?: string | null
          name?: string
          output_doc_ids?: number[]
          output_documents?: string[]
          requirement_doc_ids?: number[]
          requirements?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "services_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          agency_id: number | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          location_id: number | null
          nik: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          agency_id?: number | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          location_id?: number | null
          nik?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          agency_id?: number | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          location_id?: number | null
          nik?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_agency_queue_analytics: {
        Args: { p_agency_id: number; p_date?: string; p_location_id?: number }
        Returns: Json
      }
      get_agency_satisfaction_analytics: {
        Args: { p_agency_id: number; p_location_id?: number }
        Returns: Json
      }
      match_documents: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      nik_available: { Args: { p_nik: string }; Returns: boolean }
    }
    Enums: {
      user_role: "user" | "instansi" | "super_admin"
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
    Enums: {
      user_role: ["user", "instansi", "super_admin"],
    },
  },
} as const
