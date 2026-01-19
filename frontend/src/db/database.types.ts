export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          embedding_model: string | null
          id: string
          metadata: Json | null
          project_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          error_message: string | null
          file_type: string | null
          id: string
          name: string
          processing_state: Database["public"]["Enums"]["processing_state"]
          project_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_type?: string | null
          id?: string
          name: string
          processing_state?: Database["public"]["Enums"]["processing_state"]
          project_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_type?: string | null
          id?: string
          name?: string
          processing_state?: Database["public"]["Enums"]["processing_state"]
          project_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_audit_trail: {
        Row: {
          agent_id: string | null
          change_summary: string | null
          created_at: string
          id: string
          new_data: Json | null
          previous_data: Json | null
          project_id: string
        }
        Insert: {
          agent_id?: string | null
          change_summary?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          project_id: string
        }
        Update: {
          agent_id?: string | null
          change_summary?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          previous_data?: Json | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_audit_trail_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          agent_id: string | null
          content: string
          created_at: string
          csat_rating: number | null
          id: string
          project_id: string
          role: string
          routing_metadata: Json | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          content: string
          created_at?: string
          csat_rating?: number | null
          id?: string
          project_id: string
          role: string
          routing_metadata?: Json | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          content?: string
          created_at?: string
          csat_rating?: number | null
          id?: string
          project_id?: string
          role?: string
          routing_metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          language: string
          preferred_units: Database["public"]["Enums"]["measurement_unit"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          language?: string
          preferred_units?: Database["public"]["Enums"]["measurement_unit"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string
          preferred_units?: Database["public"]["Enums"]["measurement_unit"]
          updated_at?: string
        }
        Relationships: []
      }
      project_memory: {
        Row: {
          data: Json
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          data?: Json
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_memory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          current_phase: Database["public"]["Enums"]["construction_phase"]
          id: string
          location: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_phase?: Database["public"]["Enums"]["construction_phase"]
          id?: string
          location?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_phase?: Database["public"]["Enums"]["construction_phase"]
          id?: string
          location?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routing_audits: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          message_id: string
          orchestrator_decision: string | null
          reasoning: string | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          message_id: string
          orchestrator_decision?: string | null
          reasoning?: string | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          message_id?: string
          orchestrator_decision?: string | null
          reasoning?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routing_audits_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          api_name: string | null
          created_at: string
          estimated_cost: number | null
          id: string
          project_id: string | null
          token_count: number | null
          user_id: string
        }
        Insert: {
          api_name?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          project_id?: string | null
          token_count?: number | null
          user_id: string
        }
        Update: {
          api_name?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          project_id?: string | null
          token_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      web_search_cache: {
        Row: {
          created_at: string
          expires_at: string
          query: string
          query_hash: string
          results: Json
        }
        Insert: {
          created_at?: string
          expires_at: string
          query: string
          query_hash: string
          results: Json
        }
        Update: {
          created_at?: string
          expires_at?: string
          query?: string
          query_hash?: string
          results?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      construction_phase:
        | "LAND_SELECTION"
        | "FEASIBILITY"
        | "PERMITTING"
        | "DESIGN"
        | "SITE_PREP"
        | "FOUNDATION"
        | "SHELL_SYSTEMS"
        | "PROCUREMENT"
        | "FINISHES_FURNISHING"
        | "COMPLETED"
      measurement_unit: "METRIC" | "IMPERIAL"
      processing_state: "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      construction_phase: [
        "LAND_SELECTION",
        "FEASIBILITY",
        "PERMITTING",
        "DESIGN",
        "SITE_PREP",
        "FOUNDATION",
        "SHELL_SYSTEMS",
        "PROCUREMENT",
        "FINISHES_FURNISHING",
        "COMPLETED",
      ],
      measurement_unit: ["METRIC", "IMPERIAL"],
      processing_state: ["UPLOADED", "PROCESSING", "COMPLETED", "FAILED"],
    },
  },
} as const

