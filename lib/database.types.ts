export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          points_awarded: number
          question_id: string
          response: Json
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          points_awarded?: number
          question_id: string
          response: Json
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          points_awarded?: number
          question_id?: string
          response?: Json
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          subject_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string | null
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id?: string | null
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          period: string
          student_id: string
          subject_id: string
          value: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          period?: string
          student_id: string
          subject_id: string
          value: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          period?: string
          student_id?: string
          subject_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "grades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          extracted_text: string | null
          id: string
          pdf_path: string
          subject_id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          id?: string
          pdf_path: string
          subject_id: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          id?: string
          pdf_path?: string
          subject_id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_periods: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          period: string
          pool_amount: number
          school_id: string
          status: string
          teacher_share: number
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          period: string
          pool_amount?: number
          school_id: string
          status?: string
          teacher_share?: number
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          period?: string
          pool_amount?: number
          school_id?: string
          status?: string
          teacher_share?: number
        }
        Relationships: [
          {
            foreignKeyName: "payout_periods_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      points_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          reason: string
          ref_id: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          reason: string
          ref_id?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          ref_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          points_balance: number
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          points_balance?: number
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          points_balance?: number
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct: Json
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["question_kind"]
          prompt: Json
          session_id: string
        }
        Insert: {
          correct: Json
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["question_kind"]
          prompt: Json
          session_id: string
        }
        Update: {
          correct?: Json
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["question_kind"]
          prompt?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      student_scores: {
        Row: {
          composite: number
          computed_at: string
          grade_score: number
          id: string
          payout_amount: number
          period_id: string
          student_id: string
          study_points: number
        }
        Insert: {
          composite?: number
          computed_at?: string
          grade_score?: number
          id?: string
          payout_amount?: number
          period_id: string
          student_id: string
          study_points?: number
        }
        Update: {
          composite?: number
          computed_at?: string
          grade_score?: number
          id?: string
          payout_amount?: number
          period_id?: string
          student_id?: string
          study_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_scores_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payout_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          ended_at: string | null
          id: string
          material_id: string
          mode: Database["public"]["Enums"]["study_mode"]
          started_at: string
          student_id: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          material_id: string
          mode: Database["public"]["Enums"]["study_mode"]
          started_at?: string
          student_id: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          material_id?: string
          mode?: Database["public"]["Enums"]["study_mode"]
          started_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          course_id: string
          created_at: string
          id: string
          name: string
          teacher_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          name: string
          teacher_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          name?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          amount: number
          destination: Json | null
          id: string
          notes: string | null
          period_id: string | null
          processed_at: string | null
          requested_at: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          student_id: string
        }
        Insert: {
          amount: number
          destination?: Json | null
          id?: string
          notes?: string | null
          period_id?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          student_id: string
        }
        Update: {
          amount?: number
          destination?: Json | null
          id?: string
          notes?: string | null
          period_id?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payout_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      recompute_student_scores: {
        Args: { p_period_id: string }
        Returns: undefined
      }
    }
    Enums: {
      attendance_status: "present" | "absent" | "late"
      question_kind: "multiple_choice" | "flashcard" | "fill_blank" | "open" | "true_false"
      study_mode: "quiz" | "flashcards" | "fill_blank" | "open" | "true_false"
      user_role: "admin" | "teacher" | "student"
      withdrawal_status: "requested" | "processing" | "paid" | "rejected"
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
      attendance_status: ["present", "absent", "late"],
      question_kind: ["multiple_choice", "flashcard", "fill_blank", "open", "true_false"],
      study_mode: ["quiz", "flashcards", "fill_blank", "open", "true_false"],
      user_role: ["admin", "teacher", "student"],
      withdrawal_status: ["requested", "processing", "paid", "rejected"],
    },
  },
} as const
