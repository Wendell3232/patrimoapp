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
      accounts: {
        Row: {
          archived: boolean
          color: string
          created_at: string
          id: string
          institution: string | null
          name: string
          opening_balance: number
          type: Database["public"]["Enums"]["account_type"]
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string
          created_at?: string
          id?: string
          institution?: string | null
          name: string
          opening_balance?: number
          type?: Database["public"]["Enums"]["account_type"]
          user_id: string
        }
        Update: {
          archived?: boolean
          color?: string
          created_at?: string
          id?: string
          institution?: string | null
          name?: string
          opening_balance?: number
          type?: Database["public"]["Enums"]["account_type"]
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          category_id: string
          created_at: string
          id: string
          limit_amount: number
          month: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          limit_amount: number
          month: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          limit_amount?: number
          month?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      commitments: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          description: string
          due_date: string
          id: string
          kind: Database["public"]["Enums"]["category_kind"]
          status: Database["public"]["Enums"]["commitment_status"]
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          description: string
          due_date: string
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          status?: Database["public"]["Enums"]["commitment_status"]
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          description?: string
          due_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["category_kind"]
          status?: Database["public"]["Enums"]["commitment_status"]
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commitments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          archived: boolean
          brand: string | null
          closing_day: number
          color: string
          created_at: string
          due_day: number
          id: string
          limit_amount: number
          name: string
          payment_account_id: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean
          brand?: string | null
          closing_day?: number
          color?: string
          created_at?: string
          due_day?: number
          id?: string
          limit_amount?: number
          name: string
          payment_account_id?: string | null
          user_id: string
        }
        Update: {
          archived?: boolean
          brand?: string | null
          closing_day?: number
          color?: string
          created_at?: string
          due_day?: number
          id?: string
          limit_amount?: number
          name?: string
          payment_account_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          account_id: string | null
          created_at: string
          current_amount: number
          id: string
          name: string
          target_amount: number
          target_date: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          current_amount?: number
          id?: string
          name: string
          target_amount: number
          target_date: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          current_amount?: number
          id?: string
          name?: string
          target_amount?: number
          target_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          level: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          level?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          level?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          main_goal: string | null
          monthly_income: number | null
          onboarding_completed: boolean
          onboarding_step: number
          plan: Database["public"]["Enums"]["plan_kind"] | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          main_goal?: string | null
          monthly_income?: number | null
          onboarding_completed?: boolean
          onboarding_step?: number
          plan?: Database["public"]["Enums"]["plan_kind"] | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          main_goal?: string | null
          monthly_income?: number | null
          onboarding_completed?: boolean
          onboarding_step?: number
          plan?: Database["public"]["Enums"]["plan_kind"] | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          description: string
          id: string
          installment_group: string | null
          installment_number: number | null
          installment_total: number | null
          is_invoice_payment: boolean
          kind: Database["public"]["Enums"]["tx_kind"]
          notes: string | null
          occurred_on: string
          paid: boolean
          to_account_id: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          description?: string
          id?: string
          installment_group?: string | null
          installment_number?: number | null
          installment_total?: number | null
          is_invoice_payment?: boolean
          kind: Database["public"]["Enums"]["tx_kind"]
          notes?: string | null
          occurred_on: string
          paid?: boolean
          to_account_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          description?: string
          id?: string
          installment_group?: string | null
          installment_number?: number | null
          installment_total?: number | null
          is_invoice_payment?: boolean
          kind?: Database["public"]["Enums"]["tx_kind"]
          notes?: string | null
          occurred_on?: string
          paid?: boolean
          to_account_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_user_data: {
        Args: { p_email?: string; p_full_name?: string }
        Returns: undefined
      }
      ensure_profile: {
        Args: { p_email?: string; p_full_name?: string }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "corrente" | "poupanca" | "dinheiro" | "investimentos"
      category_kind: "receita" | "despesa"
      commitment_status: "pendente" | "pago"
      plan_kind: "mensal" | "anual"
      tx_kind: "receita" | "despesa" | "transferencia"
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
      account_type: ["corrente", "poupanca", "dinheiro", "investimentos"],
      category_kind: ["receita", "despesa"],
      commitment_status: ["pendente", "pago"],
      plan_kind: ["mensal", "anual"],
      tx_kind: ["receita", "despesa", "transferencia"],
    },
  },
} as const
