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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_owners: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          owner_id: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          owner_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_owners_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          payload?: Json | null
        }
        Relationships: []
      }
      contract_units: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          is_primary: boolean
          unit_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          unit_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_units_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          due_day: number
          end_date: string | null
          id: string
          is_demo: boolean
          notes: string | null
          owner_id: string
          periodicity: Database["public"]["Enums"]["contract_periodicity"]
          property_id: string
          rent_amount: number
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          tenant_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_day?: number
          end_date?: string | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          owner_id: string
          periodicity?: Database["public"]["Enums"]["contract_periodicity"]
          property_id: string
          rent_amount?: number
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          tenant_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_day?: number
          end_date?: string | null
          id?: string
          is_demo?: boolean
          notes?: string | null
          owner_id?: string
          periodicity?: Database["public"]["Enums"]["contract_periodicity"]
          property_id?: string
          rent_amount?: number
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          tenant_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          display_name: string
          email: string | null
          id: string
          is_demo: boolean
          legal_name: string | null
          notes: string | null
          party_type: Database["public"]["Enums"]["party_type"]
          phone: string | null
          status: Database["public"]["Enums"]["entity_status"]
          tax_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          display_name: string
          email?: string | null
          id?: string
          is_demo?: boolean
          legal_name?: string | null
          notes?: string | null
          party_type?: Database["public"]["Enums"]["party_type"]
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tax_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          display_name?: string
          email?: string | null
          id?: string
          is_demo?: boolean
          legal_name?: string | null
          notes?: string | null
          party_type?: Database["public"]["Enums"]["party_type"]
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tax_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          first_name?: string
          id: string
          last_name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          alias: string
          archived_at: string | null
          city: string | null
          comuna: string | null
          country: string
          created_at: string
          created_by: string | null
          id: string
          is_demo: boolean
          owner_id: string
          property_type: Database["public"]["Enums"]["property_type"]
          region: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          address?: string
          alias: string
          archived_at?: string | null
          city?: string | null
          comuna?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          owner_id: string
          property_type?: Database["public"]["Enums"]["property_type"]
          region?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          alias?: string
          archived_at?: string | null
          city?: string | null
          comuna?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean
          owner_id?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          region?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          id: string
          is_demo: boolean
          last_name: string
          owner_id: string
          party_type: Database["public"]["Enums"]["party_type"]
          phone: string | null
          status: Database["public"]["Enums"]["entity_status"]
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_demo?: boolean
          last_name?: string
          owner_id: string
          party_type?: Database["public"]["Enums"]["party_type"]
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_demo?: boolean
          last_name?: string
          owner_id?: string
          party_type?: Database["public"]["Enums"]["party_type"]
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          alias: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          id: string
          identifier: string
          is_demo: boolean
          parent_unit_id: string | null
          property_id: string
          rental_mode: Database["public"]["Enums"]["unit_rental_mode"]
          status: Database["public"]["Enums"]["entity_status"]
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          alias?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          identifier: string
          is_demo?: boolean
          parent_unit_id?: string | null
          property_id: string
          rental_mode?: Database["public"]["Enums"]["unit_rental_mode"]
          status?: Database["public"]["Enums"]["entity_status"]
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          alias?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          identifier?: string
          is_demo?: boolean
          parent_unit_id?: string | null
          property_id?: string
          rental_mode?: Database["public"]["Enums"]["unit_rental_mode"]
          status?: Database["public"]["Enums"]["entity_status"]
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_parent_unit_id_fkey"
            columns: ["parent_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      can_access_owner: { Args: { _owner_id: string }; Returns: boolean }
      can_access_property: { Args: { _property_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owner_of_property: { Args: { _property_id: string }; Returns: string }
      seed_demo_data: { Args: never; Returns: Json }
      set_primary_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "propietario" | "administrador" | "superadmin"
      contract_periodicity:
        | "mensual"
        | "bimestral"
        | "trimestral"
        | "semestral"
        | "anual"
      contract_status: "BORRADOR" | "ACTIVO" | "FINALIZADO" | "CANCELADO"
      entity_status: "activo" | "inactivo" | "archivado"
      party_type: "natural" | "empresa"
      property_type:
        | "departamento"
        | "casa"
        | "oficina"
        | "local"
        | "estacionamiento"
        | "bodega"
        | "terreno"
        | "otro"
      unit_rental_mode: "independiente" | "conjunta" | "parte_de_conjunto"
      unit_type:
        | "departamento"
        | "casa"
        | "oficina"
        | "local"
        | "estacionamiento"
        | "bodega"
        | "terreno"
        | "otro"
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
      app_role: ["propietario", "administrador", "superadmin"],
      contract_periodicity: [
        "mensual",
        "bimestral",
        "trimestral",
        "semestral",
        "anual",
      ],
      contract_status: ["BORRADOR", "ACTIVO", "FINALIZADO", "CANCELADO"],
      entity_status: ["activo", "inactivo", "archivado"],
      party_type: ["natural", "empresa"],
      property_type: [
        "departamento",
        "casa",
        "oficina",
        "local",
        "estacionamiento",
        "bodega",
        "terreno",
        "otro",
      ],
      unit_rental_mode: ["independiente", "conjunta", "parte_de_conjunto"],
      unit_type: [
        "departamento",
        "casa",
        "oficina",
        "local",
        "estacionamiento",
        "bodega",
        "terreno",
        "otro",
      ],
    },
  },
} as const
