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
      attendances: {
        Row: {
          confirmed_at: string | null
          id: string
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          confirmed_at?: string | null
          id?: string
          session_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          confirmed_at?: string | null
          id?: string
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendances_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          status: Database["public"]["Enums"]["session_status"]
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          status?: Database["public"]["Enums"]["session_status"]
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          court_id: string
          created_at: string
          day_of_week: number[]
          end_time: string
          id: string
          level: Database["public"]["Enums"]["skill_level"]
          max_students: number
          name: string
          start_time: string
          status: Database["public"]["Enums"]["class_status"]
          teacher_id: string
          updated_at: string
        }
        Insert: {
          court_id: string
          created_at?: string
          day_of_week: number[]
          end_time: string
          id?: string
          level?: Database["public"]["Enums"]["skill_level"]
          max_students?: number
          name: string
          start_time: string
          status?: Database["public"]["Enums"]["class_status"]
          teacher_id: string
          updated_at?: string
        }
        Update: {
          court_id?: string
          created_at?: string
          day_of_week?: number[]
          end_time?: string
          id?: string
          level?: Database["public"]["Enums"]["skill_level"]
          max_students?: number
          name?: string
          start_time?: string
          status?: Database["public"]["Enums"]["class_status"]
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      court_bookings: {
        Row: {
          court_id: string
          created_at: string
          date: string
          end_time: string
          id: string
          payment_id: string | null
          price: number
          requester_name: string
          requester_phone: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          court_id: string
          created_at?: string
          date: string
          end_time: string
          id?: string
          payment_id?: string | null
          price: number
          requester_name: string
          requester_phone: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          court_id?: string
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          payment_id?: string | null
          price?: number
          requester_name?: string
          requester_phone?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          surface_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          surface_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          surface_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          class_id: string
          enrolled_at: string
          id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Insert: {
          class_id: string
          enrolled_at?: string
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
        }
        Update: {
          class_id?: string
          enrolled_at?: string
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          discount: number | null
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_id: string | null
          pix_copy_paste: string | null
          pix_qr_code: string | null
          reference_month: string
          status: Database["public"]["Enums"]["invoice_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          discount?: number | null
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_id?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          reference_month: string
          status?: Database["public"]["Enums"]["invoice_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          discount?: number | null
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_id?: string | null
          pix_copy_paste?: string | null
          pix_qr_code?: string | null
          reference_month?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_config: {
        Row: {
          content: Json | null
          display_order: number
          id: string
          image_url: string | null
          is_visible: boolean
          section_key: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: Json | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_visible?: boolean
          section_key: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_visible?: boolean
          section_key?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      landing_page_settings: {
        Row: {
          business_mode: string
          hero_image_url: string | null
          id: string
          instagram_url: string | null
          primary_cta_text: string
          primary_cta_url: string
          updated_at: string
          whatsapp_number: string | null
          youtube_url: string | null
        }
        Insert: {
          business_mode?: string
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          primary_cta_text?: string
          primary_cta_url?: string
          updated_at?: string
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Update: {
          business_mode?: string
          hero_image_url?: string | null
          id?: string
          instagram_url?: string | null
          primary_cta_text?: string
          primary_cta_url?: string
          updated_at?: string
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          id: string
          message: string
          read_at: string | null
          sent_at: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          id?: string
          message: string
          read_at?: string | null
          sent_at?: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          id?: string
          message?: string
          read_at?: string | null
          sent_at?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          classes_per_week: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          monthly_price: number
          name: string
          updated_at: string
        }
        Insert: {
          classes_per_week: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_price: number
          name: string
          updated_at?: string
        }
        Update: {
          classes_per_week?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_price?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          created_at: string
          id: string
          plan_id: string | null
          skill_level: Database["public"]["Enums"]["skill_level"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      teacher_payments: {
        Row: {
          created_at: string
          id: string
          paid_at: string | null
          rate_per_class: number
          reference_month: string
          status: Database["public"]["Enums"]["payment_status"]
          teacher_id: string
          total_amount: number
          total_classes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          paid_at?: string | null
          rate_per_class: number
          reference_month: string
          status?: Database["public"]["Enums"]["payment_status"]
          teacher_id: string
          total_amount: number
          total_classes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          paid_at?: string | null
          rate_per_class?: number
          reference_month?: string
          status?: Database["public"]["Enums"]["payment_status"]
          teacher_id?: string
          total_amount?: number
          total_classes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_payments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profiles: {
        Row: {
          created_at: string
          id: string
          rate_per_class: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rate_per_class?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rate_per_class?: number
          updated_at?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
      attendance_status:
        | "confirmed"
        | "cancelled"
        | "not_confirmed"
        | "present"
        | "absent"
      booking_status: "requested" | "confirmed" | "paid" | "cancelled"
      class_status: "active" | "paused" | "closed"
      enrollment_status: "active" | "cancelled" | "transferred"
      invoice_status: "pending" | "paid" | "overdue" | "cancelled"
      notification_channel: "push" | "whatsapp" | "both"
      notification_type:
        | "class_reminder"
        | "attendance_pending"
        | "invoice_created"
        | "invoice_due_reminder"
        | "invoice_paid"
        | "welcome"
        | "class_full"
      payment_status: "pending" | "paid"
      session_status: "scheduled" | "completed" | "cancelled"
      skill_level: "beginner" | "elementary" | "intermediate" | "advanced"
      user_status: "active" | "inactive" | "suspended" | "defaulter"
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
      app_role: ["admin", "teacher", "student"],
      attendance_status: [
        "confirmed",
        "cancelled",
        "not_confirmed",
        "present",
        "absent",
      ],
      booking_status: ["requested", "confirmed", "paid", "cancelled"],
      class_status: ["active", "paused", "closed"],
      enrollment_status: ["active", "cancelled", "transferred"],
      invoice_status: ["pending", "paid", "overdue", "cancelled"],
      notification_channel: ["push", "whatsapp", "both"],
      notification_type: [
        "class_reminder",
        "attendance_pending",
        "invoice_created",
        "invoice_due_reminder",
        "invoice_paid",
        "welcome",
        "class_full",
      ],
      payment_status: ["pending", "paid"],
      session_status: ["scheduled", "completed", "cancelled"],
      skill_level: ["beginner", "elementary", "intermediate", "advanced"],
      user_status: ["active", "inactive", "suspended", "defaulter"],
    },
  },
} as const
