export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      ai_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_monthly_usage: {
        Row: {
          cost_usd: number
          month_start: string
          requests_made: number
          tokens_used: number
          user_id: string
        }
        Insert: {
          cost_usd?: number
          month_start: string
          requests_made?: number
          tokens_used?: number
          user_id: string
        }
        Update: {
          cost_usd?: number
          month_start?: string
          requests_made?: number
          tokens_used?: number
          user_id?: string
        }
        Relationships: []
      }
      ai_plans: {
        Row: {
          created_at: string
          id: string
          name: string
          per_user_cost_cap_usd: number
          requests_per_minute: number
          tokens_per_month: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          per_user_cost_cap_usd?: number
          requests_per_minute: number
          tokens_per_month: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          per_user_cost_cap_usd?: number
          requests_per_minute?: number
          tokens_per_month?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          created_at: string
          global_monthly_budget_usd: number
          id: number
          kill_switch: boolean
          request_timeout_ms: number
          token_limit_per_request: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          global_monthly_budget_usd?: number
          id?: number
          kill_switch?: boolean
          request_timeout_ms?: number
          token_limit_per_request?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          global_monthly_budget_usd?: number
          id?: number
          kill_switch?: boolean
          request_timeout_ms?: number
          token_limit_per_request?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          completion_tokens: number | null
          cost_usd: number | null
          created_at: string
          error_code: string | null
          id: string
          image_count: number | null
          model: string | null
          operation: string
          plan_name: string | null
          prompt_tokens: number | null
          status: string | null
          task: string
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string
          error_code?: string | null
          id?: string
          image_count?: number | null
          model?: string | null
          operation: string
          plan_name?: string | null
          prompt_tokens?: number | null
          status?: string | null
          task: string
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          cost_usd?: number | null
          created_at?: string
          error_code?: string | null
          id?: string
          image_count?: number | null
          model?: string | null
          operation?: string
          plan_name?: string | null
          prompt_tokens?: number | null
          status?: string | null
          task?: string
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_user_plans: {
        Row: {
          created_at: string
          plan_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          plan_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          plan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_user_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "ai_plans"
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
          invoice_url: string | null
          paid_at: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          provider?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_period_end: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          ad_campaign_completed: boolean
          business_plan: Json | null
          business_plan_assumptions: string[] | null
          business_plan_completed: boolean
          business_plan_inputs: Json | null
          cost_saved: number
          created_at: string
          description: string | null
          domain_completed: boolean
          id: string
          industry: string | null
          logo_branding_completed: boolean
          name: string
          progress: number
          status: string
          time_saved_hours: number
          updated_at: string
          user_id: string
          website_completed: boolean
        }
        Insert: {
          ad_campaign_completed?: boolean
          business_plan?: Json | null
          business_plan_assumptions?: string[] | null
          business_plan_completed?: boolean
          business_plan_inputs?: Json | null
          cost_saved?: number
          created_at?: string
          description?: string | null
          domain_completed?: boolean
          id?: string
          industry?: string | null
          logo_branding_completed?: boolean
          name: string
          progress?: number
          status?: string
          time_saved_hours?: number
          updated_at?: string
          user_id: string
          website_completed?: boolean
        }
        Update: {
          ad_campaign_completed?: boolean
          business_plan?: Json | null
          business_plan_assumptions?: string[] | null
          business_plan_completed?: boolean
          business_plan_inputs?: Json | null
          cost_saved?: number
          created_at?: string
          description?: string | null
          domain_completed?: boolean
          id?: string
          industry?: string | null
          logo_branding_completed?: boolean
          name?: string
          progress?: number
          status?: string
          time_saved_hours?: number
          updated_at?: string
          user_id?: string
          website_completed?: boolean
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          paypal_plan_id: string | null
          paypal_subscription_id: string | null
          plan: string
          provider: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          paypal_plan_id?: string | null
          paypal_subscription_id?: string | null
          plan: string
          provider?: string
          started_at?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          paypal_plan_id?: string | null
          paypal_subscription_id?: string | null
          plan?: string
          provider?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          ads: number
          created_at: string
          id: string
          last_reset_at: string
          logos: number
          month: string
          projects: number
          sites: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ads?: number
          created_at?: string
          id?: string
          last_reset_at?: string
          logos?: number
          month: string
          projects?: number
          sites?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ads?: number
          created_at?: string
          id?: string
          last_reset_at?: string
          logos?: number
          month?: string
          projects?: number
          sites?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          active_projects: number
          completed_projects: number
          created_at: string
          id: string
          success_rate: number
          total_cost_saved: number
          total_projects: number
          total_time_saved_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active_projects?: number
          completed_projects?: number
          created_at?: string
          id?: string
          success_rate?: number
          total_cost_saved?: number
          total_projects?: number
          total_time_saved_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active_projects?: number
          completed_projects?: number
          created_at?: string
          id?: string
          success_rate?: number
          total_cost_saved?: number
          total_projects?: number
          total_time_saved_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_user_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_cost_savings_multiplier: {
        Args: { task_type: string }
        Returns: number
      }
      get_time_savings_multiplier: {
        Args: { task_type: string }
        Returns: number
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
    Enums: {},
  },
} as const
