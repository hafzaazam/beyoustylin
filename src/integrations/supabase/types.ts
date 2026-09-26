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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      appointment_requests: {
        Row: {
          booking_id: string | null
          budget: string | null
          created_at: string
          deal_id: string | null
          email: string | null
          event_date: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          preferred_date: string | null
          preferred_time: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["request_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          budget?: string | null
          created_at?: string
          deal_id?: string | null
          email?: string | null
          event_date?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          preferred_date?: string | null
          preferred_time?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          type?: Database["public"]["Enums"]["request_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          budget?: string | null
          created_at?: string
          deal_id?: string | null
          email?: string | null
          event_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          preferred_date?: string | null
          preferred_time?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          type?: Database["public"]["Enums"]["request_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          chair_id: string
          created_at: string
          custom_total: number | null
          customer_id: string
          deal_id: string | null
          end_time: string
          id: string
          notes: string | null
          service_ids: string[]
          staff_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          total_duration: number
          total_price: number
          updated_at: string
        }
        Insert: {
          chair_id: string
          created_at?: string
          custom_total?: number | null
          customer_id: string
          deal_id?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          service_ids?: string[]
          staff_id: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_duration?: number
          total_price?: number
          updated_at?: string
        }
        Update: {
          chair_id?: string
          created_at?: string
          custom_total?: number | null
          customer_id?: string
          deal_id?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          service_ids?: string[]
          staff_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_duration?: number
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_chair_id_fkey"
            columns: ["chair_id"]
            isOneToOne: false
            referencedRelation: "chairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      chairs: {
        Row: {
          created_at: string
          id: string
          name: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          created_at: string
          discounted_price: number
          id: string
          name: string
          service_ids: string[]
          status: Database["public"]["Enums"]["entity_status"]
          total_duration: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          discounted_price?: number
          id?: string
          name: string
          service_ids?: string[]
          status?: Database["public"]["Enums"]["entity_status"]
          total_duration?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          discounted_price?: number
          id?: string
          name?: string
          service_ids?: string[]
          status?: Database["public"]["Enums"]["entity_status"]
          total_duration?: number
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          deal_id: string | null
          id: string
          service_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          id?: string
          service_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          id?: string
          service_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          booking_id: string
          created_at: string
          customer_id: string
          id: string
          invoice_number: string
          items: Json
          paid_at: string | null
          payment_method: string | null
          pdf_data_url: string | null
          pdf_generated_at: string | null
          staff_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_id: string
          id?: string
          invoice_number?: string
          items?: Json
          paid_at?: string | null
          payment_method?: string | null
          pdf_data_url?: string | null
          pdf_generated_at?: string | null
          staff_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          invoice_number?: string
          items?: Json
          paid_at?: string | null
          payment_method?: string | null
          pdf_data_url?: string | null
          pdf_generated_at?: string | null
          staff_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          birthday: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          loyalty_points: number
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          loyalty_points?: number
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          loyalty_points?: number
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration: number
          id: string
          name: string
          price: number
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          name: string
          price?: number
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          name?: string
          price?: number
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
          role: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          role: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_my_booking: { Args: { _booking_id: string }; Returns: undefined }
      ensure_customer_record: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      link_customer_account: {
        Args: { _customer_id: string; _email: string | null }
        Returns: string | null
      }
      list_team_members: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      my_bookings: {
        Args: never
        Returns: {
          chair_name: string | null
          deal_id: string | null
          end_time: string
          id: string
          invoice_id: string | null
          invoice_number: string | null
          invoice_status: Database["public"]["Enums"]["invoice_status"] | null
          notes: string | null
          service_ids: string[]
          staff_name: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          total_duration: number
          total_price: number
        }[]
      }
      remove_team_member: { Args: { _user_id: string }; Returns: undefined }
      set_member_role: {
        Args: {
          _email: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      withdraw_my_request: { Args: { _request_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "owner" | "manager" | "stylist" | "receptionist"
      booking_status:
        | "pending"
        | "confirmed"
        | "started"
        | "completed"
        | "canceled"
      entity_status: "active" | "disabled"
      invoice_status: "paid" | "unpaid" | "void"
      request_status: "pending" | "approved" | "dismissed" | "withdrawn"
      request_type: "booking" | "quote"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["owner", "manager", "stylist", "receptionist"],
      booking_status: [
        "pending",
        "confirmed",
        "started",
        "completed",
        "canceled",
      ],
      entity_status: ["active", "disabled"],
      invoice_status: ["paid", "unpaid", "void"],
      request_status: ["pending", "approved", "dismissed", "withdrawn"],
      request_type: ["booking", "quote"],
    },
  },
} as const
