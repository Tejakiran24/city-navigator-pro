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
      favorite_locations: {
        Row: {
          created_at: string
          id: string
          intersection_id: string
          label: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intersection_id: string
          label: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intersection_id?: string
          label?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_locations_intersection_id_fkey"
            columns: ["intersection_id"]
            isOneToOne: false
            referencedRelation: "intersections"
            referencedColumns: ["id"]
          },
        ]
      }
      intersections: {
        Row: {
          created_at: string
          id: string
          latitude: number
          longitude: number
          name: string
          node_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          name: string
          node_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          node_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          theme: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          theme?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      roads: {
        Row: {
          base_time_minutes: number
          bidirectional: boolean
          created_at: string
          distance_km: number
          end_node: string
          id: string
          name: string
          start_node: string
          traffic_level: Database["public"]["Enums"]["traffic_level"]
          traffic_weight: number
          updated_at: string
        }
        Insert: {
          base_time_minutes: number
          bidirectional?: boolean
          created_at?: string
          distance_km: number
          end_node: string
          id?: string
          name: string
          start_node: string
          traffic_level?: Database["public"]["Enums"]["traffic_level"]
          traffic_weight?: number
          updated_at?: string
        }
        Update: {
          base_time_minutes?: number
          bidirectional?: boolean
          created_at?: string
          distance_km?: number
          end_node?: string
          id?: string
          name?: string
          start_node?: string
          traffic_level?: Database["public"]["Enums"]["traffic_level"]
          traffic_weight?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roads_end_node_fkey"
            columns: ["end_node"]
            isOneToOne: false
            referencedRelation: "intersections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roads_start_node_fkey"
            columns: ["start_node"]
            isOneToOne: false
            referencedRelation: "intersections"
            referencedColumns: ["id"]
          },
        ]
      }
      route_searches: {
        Row: {
          algorithm: Database["public"]["Enums"]["route_algorithm"]
          created_at: string
          destination_id: string
          distance_km: number
          fuel_liters: number
          id: string
          junction_count: number
          path: Json
          source_id: string
          traffic_status: Database["public"]["Enums"]["traffic_level"]
          travel_time_minutes: number
          user_id: string
        }
        Insert: {
          algorithm: Database["public"]["Enums"]["route_algorithm"]
          created_at?: string
          destination_id: string
          distance_km: number
          fuel_liters?: number
          id?: string
          junction_count: number
          path?: Json
          source_id: string
          traffic_status?: Database["public"]["Enums"]["traffic_level"]
          travel_time_minutes: number
          user_id: string
        }
        Update: {
          algorithm?: Database["public"]["Enums"]["route_algorithm"]
          created_at?: string
          destination_id?: string
          distance_km?: number
          fuel_liters?: number
          id?: string
          junction_count?: number
          path?: Json
          source_id?: string
          traffic_status?: Database["public"]["Enums"]["traffic_level"]
          travel_time_minutes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_searches_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "intersections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_searches_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "intersections"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_routes: {
        Row: {
          algorithm: Database["public"]["Enums"]["route_algorithm"]
          created_at: string
          destination_id: string
          distance_km: number
          id: string
          is_favorite: boolean
          name: string
          path: Json
          source_id: string
          travel_time_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          algorithm?: Database["public"]["Enums"]["route_algorithm"]
          created_at?: string
          destination_id: string
          distance_km?: number
          id?: string
          is_favorite?: boolean
          name: string
          path?: Json
          source_id: string
          travel_time_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          algorithm?: Database["public"]["Enums"]["route_algorithm"]
          created_at?: string
          destination_id?: string
          distance_km?: number
          id?: string
          is_favorite?: boolean
          name?: string
          path?: Json
          source_id?: string
          travel_time_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_routes_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "intersections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_routes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "intersections"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_alerts: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string
          ends_at: string | null
          id: string
          road_id: string | null
          severity: Database["public"]["Enums"]["traffic_level"]
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description: string
          ends_at?: string | null
          id?: string
          road_id?: string | null
          severity: Database["public"]["Enums"]["traffic_level"]
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string
          ends_at?: string | null
          id?: string
          road_id?: string | null
          severity?: Database["public"]["Enums"]["traffic_level"]
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "traffic_alerts_road_id_fkey"
            columns: ["road_id"]
            isOneToOne: false
            referencedRelation: "roads"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      route_algorithm: "dijkstra" | "astar" | "bfs" | "dfs"
      traffic_level: "low" | "medium" | "heavy" | "closed"
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
      route_algorithm: ["dijkstra", "astar", "bfs", "dfs"],
      traffic_level: ["low", "medium", "heavy", "closed"],
    },
  },
} as const
