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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      active_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          message_id: string
          metadata: Json | null
          sender: string
          source: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          message_id: string
          metadata?: Json | null
          sender: string
          source?: string | null
          timestamp: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          message_id?: string
          metadata?: Json | null
          sender?: string
          source?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      ghl_installations: {
        Row: {
          access_token_encrypted: string | null
          company_id: string | null
          company_name: string | null
          connected_at: string
          connection_status: Database["public"]["Enums"]["ghl_connection_status"]
          created_at: string
          ghl_user_id: string | null
          id: string
          last_refresh_at: string | null
          location_id: string | null
          location_name: string | null
          refresh_error: string | null
          refresh_token_encrypted: string | null
          scopes: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          company_id?: string | null
          company_name?: string | null
          connected_at?: string
          connection_status?: Database["public"]["Enums"]["ghl_connection_status"]
          created_at?: string
          ghl_user_id?: string | null
          id?: string
          last_refresh_at?: string | null
          location_id?: string | null
          location_name?: string | null
          refresh_error?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          company_id?: string | null
          company_name?: string | null
          connected_at?: string
          connection_status?: Database["public"]["Enums"]["ghl_connection_status"]
          created_at?: string
          ghl_user_id?: string | null
          id?: string
          last_refresh_at?: string | null
          location_id?: string | null
          location_name?: string | null
          refresh_error?: string | null
          refresh_token_encrypted?: string | null
          scopes?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ghl_webhook_dedup: {
        Row: {
          created_at: string
          webhook_id: string
        }
        Insert: {
          created_at?: string
          webhook_id: string
        }
        Update: {
          created_at?: string
          webhook_id?: string
        }
        Relationships: []
      }
      hermes_allowed_users: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          custom_webhook_auth_header_name: string | null
          custom_webhook_auth_header_value: string | null
          custom_webhook_enabled: boolean | null
          custom_webhook_use_auth: boolean | null
          first_name: string | null
          id: string
          last_name: string | null
          location_address: string | null
          location_auto_update: boolean | null
          location_city: string | null
          location_country: string | null
          location_include_address: boolean | null
          location_latitude: number | null
          location_longitude: number | null
          location_permission_granted: boolean | null
          location_updated_at: string | null
          location_use_coarse: boolean | null
          phone_country_code: string | null
          phone_number: string | null
          preferred_backend: string
          theme_settings: string | null
          updated_at: string | null
          username: string | null
          webhook_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          custom_webhook_auth_header_name?: string | null
          custom_webhook_auth_header_value?: string | null
          custom_webhook_enabled?: boolean | null
          custom_webhook_use_auth?: boolean | null
          first_name?: string | null
          id: string
          last_name?: string | null
          location_address?: string | null
          location_auto_update?: boolean | null
          location_city?: string | null
          location_country?: string | null
          location_include_address?: boolean | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_permission_granted?: boolean | null
          location_updated_at?: string | null
          location_use_coarse?: boolean | null
          phone_country_code?: string | null
          phone_number?: string | null
          preferred_backend?: string
          theme_settings?: string | null
          updated_at?: string | null
          username?: string | null
          webhook_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          custom_webhook_auth_header_name?: string | null
          custom_webhook_auth_header_value?: string | null
          custom_webhook_enabled?: boolean | null
          custom_webhook_use_auth?: boolean | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location_address?: string | null
          location_auto_update?: boolean | null
          location_city?: string | null
          location_country?: string | null
          location_include_address?: boolean | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_permission_granted?: boolean | null
          location_updated_at?: string | null
          location_use_coarse?: boolean | null
          phone_country_code?: string | null
          phone_number?: string | null
          preferred_backend?: string
          theme_settings?: string | null
          updated_at?: string | null
          username?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      sound_settings: {
        Row: {
          chat_message_sound: string | null
          created_at: string
          id: string
          sounds_enabled: boolean
          toast_notification_sound: string | null
          updated_at: string
          user_id: string
          volume: number
        }
        Insert: {
          chat_message_sound?: string | null
          created_at?: string
          id?: string
          sounds_enabled?: boolean
          toast_notification_sound?: string | null
          updated_at?: string
          user_id: string
          volume?: number
        }
        Update: {
          chat_message_sound?: string | null
          created_at?: string
          id?: string
          sounds_enabled?: boolean
          toast_notification_sound?: string | null
          updated_at?: string
          user_id?: string
          volume?: number
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          notification_id_extracted: string | null
          read_at: string | null
          sender: string | null
          source: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          notification_id_extracted?: string | null
          read_at?: string | null
          sender?: string | null
          source?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          notification_id_extracted?: string | null
          read_at?: string | null
          sender?: string | null
          source?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_public_profile: {
        Args: { profile_id: string }
        Returns: {
          avatar_url: string
          first_name: string
          id: string
          last_name: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_safe_app_setting: { Args: { setting_key: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      ghl_connection_status:
        | "connected"
        | "expired"
        | "error"
        | "disconnected"
        | "pending"
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
      app_role: ["admin", "user"],
      ghl_connection_status: [
        "connected",
        "expired",
        "error",
        "disconnected",
        "pending",
      ],
    },
  },
} as const
