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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      beta_feedback: {
        Row: {
          created_at: string
          ease_of_use: number | null
          experience_level: string | null
          found_confusing: boolean | null
          id: string
          pay_features: string[] | null
          pay_features_other: string | null
          payment_comment: string | null
          payment_preference:
            | Database["public"]["Enums"]["payment_preference"]
            | null
          previous_management: string | null
          problem_to_solve: string | null
          rating: number | null
          recommend_comment: string | null
          similar_app_name: string | null
          usage_frequency: string | null
          usage_moment: string | null
          user_id: string
          uses_similar_app: boolean | null
          what_liked: string | null
          what_to_improve: string | null
          would_recommend: boolean | null
        }
        Insert: {
          created_at?: string
          ease_of_use?: number | null
          experience_level?: string | null
          found_confusing?: boolean | null
          id?: string
          pay_features?: string[] | null
          pay_features_other?: string | null
          payment_comment?: string | null
          payment_preference?:
            | Database["public"]["Enums"]["payment_preference"]
            | null
          previous_management?: string | null
          problem_to_solve?: string | null
          rating?: number | null
          recommend_comment?: string | null
          similar_app_name?: string | null
          usage_frequency?: string | null
          usage_moment?: string | null
          user_id: string
          uses_similar_app?: boolean | null
          what_liked?: string | null
          what_to_improve?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          created_at?: string
          ease_of_use?: number | null
          experience_level?: string | null
          found_confusing?: boolean | null
          id?: string
          pay_features?: string[] | null
          pay_features_other?: string | null
          payment_comment?: string | null
          payment_preference?:
            | Database["public"]["Enums"]["payment_preference"]
            | null
          previous_management?: string | null
          problem_to_solve?: string | null
          rating?: number | null
          recommend_comment?: string | null
          similar_app_name?: string | null
          usage_frequency?: string | null
          usage_moment?: string | null
          user_id?: string
          uses_similar_app?: boolean | null
          what_liked?: string | null
          what_to_improve?: string | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "beta_users"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_code: string
          role: Database["public"]["Enums"]["beta_role"]
          status: Database["public"]["Enums"]["invitation_status"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_code?: string
          role?: Database["public"]["Enums"]["beta_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_code?: string
          role?: Database["public"]["Enums"]["beta_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
        }
        Relationships: []
      }
      beta_users: {
        Row: {
          created_at: string
          email: string
          first_login_at: string | null
          gdpr_accepted: boolean
          gdpr_accepted_at: string | null
          id: string
          invitation_id: string | null
          last_login_at: string | null
          role: Database["public"]["Enums"]["beta_role"]
          user_id: string
          welcome_shown: boolean
        }
        Insert: {
          created_at?: string
          email: string
          first_login_at?: string | null
          gdpr_accepted?: boolean
          gdpr_accepted_at?: string | null
          id?: string
          invitation_id?: string | null
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["beta_role"]
          user_id: string
          welcome_shown?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          first_login_at?: string | null
          gdpr_accepted?: boolean
          gdpr_accepted_at?: string | null
          id?: string
          invitation_id?: string | null
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["beta_role"]
          user_id?: string
          welcome_shown?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "beta_users_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "beta_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_metrics: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          page_path: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          page_path?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          page_path?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "beta_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_beta_role: {
        Args: { p_user_id: string }
        Returns: Database["public"]["Enums"]["beta_role"]
      }
      is_beta_admin: { Args: { p_user_id: string }; Returns: boolean }
    }
    Enums: {
      beta_role: "admin" | "tester"
      invitation_status: "pending" | "accepted" | "expired"
      payment_preference: "one_time" | "subscription" | "undecided"
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
      beta_role: ["admin", "tester"],
      invitation_status: ["pending", "accepted", "expired"],
      payment_preference: ["one_time", "subscription", "undecided"],
    },
  },
} as const
