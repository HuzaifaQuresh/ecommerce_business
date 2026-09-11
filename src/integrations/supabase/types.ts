export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      order_items: {
        Row: {
          id: string;
          order_id: string;
          price_pkr: number;
          product_id: string | null;
          quantity: number;
          title: string;
          fulfillment_status: string;
          expected_delivery_at: string | null;
          image_url: string | null;
          product_slug: string | null;
          dispatched_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          price_pkr: number;
          product_id?: string | null;
          quantity: number;
          title: string;
          fulfillment_status?: string;
          expected_delivery_at?: string | null;
          image_url?: string | null;
          product_slug?: string | null;
          dispatched_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          price_pkr?: number;
          product_id?: string | null;
          quantity?: number;
          title?: string;
          fulfillment_status?: string;
          expected_delivery_at?: string | null;
          image_url?: string | null;
          product_slug?: string | null;
          dispatched_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          address: string;
          city: string;
          province: string | null;
          postal_code: string | null;
          landmark: string | null;
          created_at: string;
          customer_name: string;
          discount_pkr: number;
          email: string;
          id: string;
          payment_method: string;
          phone: string;
          status: Database["public"]["Enums"]["order_status"];
          total_pkr: number;
          subtotal_pkr: number | null;
          shipping_pkr: number;
          tax_pkr: number;
          payment_fee_pkr: number;
          delivery_method: string;
          expected_delivery_at: string | null;
          tracking_number: string | null;
          admin_notes: string | null;
          user_id: string | null;
          voucher_code: string | null;
        };
        Insert: {
          address: string;
          city: string;
          province?: string | null;
          postal_code?: string | null;
          landmark?: string | null;
          created_at?: string;
          customer_name: string;
          discount_pkr?: number;
          email: string;
          id?: string;
          payment_method?: string;
          phone: string;
          status?: Database["public"]["Enums"]["order_status"];
          total_pkr: number;
          subtotal_pkr?: number | null;
          shipping_pkr?: number;
          tax_pkr?: number;
          payment_fee_pkr?: number;
          delivery_method?: string;
          expected_delivery_at?: string | null;
          tracking_number?: string | null;
          admin_notes?: string | null;
          user_id?: string | null;
          voucher_code?: string | null;
        };
        Update: {
          address?: string;
          city?: string;
          province?: string | null;
          postal_code?: string | null;
          landmark?: string | null;
          created_at?: string;
          customer_name?: string;
          discount_pkr?: number;
          email?: string;
          id?: string;
          payment_method?: string;
          phone?: string;
          status?: Database["public"]["Enums"]["order_status"];
          total_pkr?: number;
          subtotal_pkr?: number | null;
          shipping_pkr?: number;
          tax_pkr?: number;
          payment_fee_pkr?: number;
          delivery_method?: string;
          expected_delivery_at?: string | null;
          tracking_number?: string | null;
          admin_notes?: string | null;
          user_id?: string | null;
          voucher_code?: string | null;
        };
        Relationships: [];
      };
      product_reviews: {
        Row: {
          body: string;
          created_at: string;
          customer_name: string;
          id: string;
          product_id: string;
          rating: number;
          user_id: string | null;
          verified: boolean;
        };
        Insert: {
          body: string;
          created_at?: string;
          customer_name: string;
          id?: string;
          product_id: string;
          rating: number;
          user_id?: string | null;
          verified?: boolean;
        };
        Update: {
          body?: string;
          created_at?: string;
          customer_name?: string;
          id?: string;
          product_id?: string;
          rating?: number;
          user_id?: string | null;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          availability: Database["public"]["Enums"]["availability_status"];
          category: string;
          color: string | null;
          created_at: string;
          description: string | null;
          discount_pct: number;
          gallery_urls: string[];
          id: string;
          image_url: string | null;
          manufacturer: string | null;
          price_pkr: number;
          rating: number | null;
          slug: string;
          specs: Json;
          stock: number;
          tags: string[] | null;
          title: string;
          updated_at: string;
          vendor_id: string | null;
        };
        Insert: {
          availability?: Database["public"]["Enums"]["availability_status"];
          category: string;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          discount_pct?: number;
          gallery_urls?: string[];
          id?: string;
          image_url?: string | null;
          manufacturer?: string | null;
          price_pkr?: number;
          rating?: number | null;
          slug: string;
          specs?: Json;
          stock?: number;
          tags?: string[] | null;
          title: string;
          updated_at?: string;
          vendor_id?: string | null;
        };
        Update: {
          availability?: Database["public"]["Enums"]["availability_status"];
          category?: string;
          color?: string | null;
          created_at?: string;
          description?: string | null;
          discount_pct?: number;
          gallery_urls?: string[];
          id?: string;
          image_url?: string | null;
          manufacturer?: string | null;
          price_pkr?: number;
          rating?: number | null;
          slug?: string;
          specs?: Json;
          stock?: number;
          tags?: string[] | null;
          title?: string;
          updated_at?: string;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendors: {
        Row: {
          commission_pct: number;
          created_at: string;
          id: string;
          is_active: boolean;
          shop_name: string;
          slug: string;
          user_id: string;
        };
        Insert: {
          commission_pct?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          shop_name: string;
          slug: string;
          user_id: string;
        };
        Update: {
          commission_pct?: number;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          shop_name?: string;
          slug?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      vouchers: {
        Row: {
          code: string;
          created_at: string;
          discount_flat_pkr: number;
          discount_pct: number;
          expires_at: string | null;
          id: string;
          is_active: boolean;
          label: string | null;
          max_uses: number | null;
          min_order_pkr: number;
          used_count: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          discount_flat_pkr?: number;
          discount_pct?: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          label?: string | null;
          max_uses?: number | null;
          min_order_pkr?: number;
          used_count?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          discount_flat_pkr?: number;
          discount_pct?: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          label?: string | null;
          max_uses?: number | null;
          min_order_pkr?: number;
          used_count?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      vendor_applications: {
        Row: {
          admin_notes: string | null;
          business_email: string;
          cnic_or_tax_id: string;
          created_at: string;
          description: string | null;
          id: string;
          phone: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          shop_name: string;
          status: "pending" | "approved" | "rejected";
          user_id: string;
        };
        Insert: {
          admin_notes?: string | null;
          business_email: string;
          cnic_or_tax_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          phone: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          shop_name: string;
          status?: "pending" | "approved" | "rejected";
          user_id: string;
        };
        Update: {
          admin_notes?: string | null;
          business_email?: string;
          cnic_or_tax_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          phone?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          shop_name?: string;
          status?: "pending" | "approved" | "rejected";
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      staff_list_users: {
        Args: Record<PropertyKey, never>;
        Returns: {
          user_id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          role: Database["public"]["Enums"]["app_role"];
          created_at: string;
          is_disabled: boolean;
        }[];
      };
      admin_remove_user: {
        Args: {
          _target_user_id: string;
          _mode: string;
        };
        Returns: Json;
      };
      admin_assign_role: {
        Args: {
          _target_user_id: string;
          _new_role: Database["public"]["Enums"]["app_role"];
        };
        Returns: Json;
      };
      staff_assign_role_by_email: {
        Args: {
          _email: string;
          _new_role: Database["public"]["Enums"]["app_role"];
        };
        Returns: Json;
      };
      admin_provision_vendor: {
        Args: {
          _email: string;
          _shop_name: string;
          _phone?: string | null;
          _cnic?: string | null;
          _description?: string | null;
          _commission_pct?: number;
        };
        Returns: Json;
      };
      admin_review_vendor_application: {
        Args: {
          _app_id: string;
          _approve: boolean;
          _notes?: string | null;
        };
        Returns: Json;
      };
      hold_unverified_email_signup: {
        Args: {
          _email: string;
        };
        Returns: Json;
      };
      is_platform_staff: {
        Args: {
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user" | "super_admin" | "vendor";
      availability_status: "in_stock" | "on_demand" | "coming_soon" | "obsolete";
      order_status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "super_admin", "vendor"],
      availability_status: ["in_stock", "on_demand", "coming_soon", "obsolete"],
      order_status: ["pending", "processing", "shipped", "delivered", "cancelled"],
    },
  },
} as const;
