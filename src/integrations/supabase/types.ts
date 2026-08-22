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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      announcement_reactions: {
        Row: {
          announcement_id: string
          created_at: string
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reactions_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          attachment_url: string | null
          author_name: string
          company: string | null
          created_at: string
          drive_type: string | null
          expires_at: string | null
          id: string
          message: string
          pinned: boolean
          publish_at: string
          status: string
          target_course: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          author_name?: string
          company?: string | null
          created_at?: string
          drive_type?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          pinned?: boolean
          publish_at?: string
          status?: string
          target_course?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          author_name?: string
          company?: string | null
          created_at?: string
          drive_type?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          pinned?: boolean
          publish_at?: string
          status?: string
          target_course?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      application_status_history: {
        Row: {
          application_id: string
          changed_by: string | null
          created_at: string
          id: string
          status: string
        }
        Insert: {
          application_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          status: string
        }
        Update: {
          application_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applied_at: string
          id: string
          job_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          id?: string
          job_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          id?: string
          job_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          admin_name: string | null
          admin_user_id: string | null
          created_at: string
          details: string | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          admin_name?: string | null
          admin_user_id?: string | null
          created_at?: string
          details?: string | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_name?: string | null
          admin_user_id?: string | null
          created_at?: string
          details?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          company_type: string | null
          created_at: string
          description: string | null
          eligible_courses: string[]
          email: string | null
          hr_email: string | null
          hr_name: string | null
          id: string
          industry: string | null
          is_active: boolean
          location: string | null
          logo_color: string
          logo_url: string | null
          min_cgpa: number
          name: string
          phone: string | null
          short_name: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          company_type?: string | null
          created_at?: string
          description?: string | null
          eligible_courses?: string[]
          email?: string | null
          hr_email?: string | null
          hr_name?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          location?: string | null
          logo_color?: string
          logo_url?: string | null
          min_cgpa?: number
          name: string
          phone?: string | null
          short_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_type?: string | null
          created_at?: string
          description?: string | null
          eligible_courses?: string[]
          email?: string | null
          hr_email?: string | null
          hr_name?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          location?: string | null
          logo_color?: string
          logo_url?: string | null
          min_cgpa?: number
          name?: string
          phone?: string | null
          short_name?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          branches: string[]
          company_id: string
          courses: string[]
          created_at: string
          deadline: string
          description: string
          doc_url: string | null
          drive_date: string | null
          graduation_years: number[]
          id: string
          job_type: string
          location: string
          max_backlogs: number
          min_cgpa: number
          open_date: string
          openings: string
          package_lpa: number
          role_tag: string | null
          selection_process: string[]
          skills: string[]
          status: string
          title: string
          updated_at: string
          work_mode: string
        }
        Insert: {
          branches?: string[]
          company_id: string
          courses?: string[]
          created_at?: string
          deadline?: string
          description?: string
          doc_url?: string | null
          drive_date?: string | null
          graduation_years?: number[]
          id?: string
          job_type?: string
          location?: string
          max_backlogs?: number
          min_cgpa?: number
          open_date?: string
          openings?: string
          package_lpa?: number
          role_tag?: string | null
          selection_process?: string[]
          skills?: string[]
          status?: string
          title: string
          updated_at?: string
          work_mode?: string
        }
        Update: {
          branches?: string[]
          company_id?: string
          courses?: string[]
          created_at?: string
          deadline?: string
          description?: string
          doc_url?: string | null
          drive_date?: string | null
          graduation_years?: number[]
          id?: string
          job_type?: string
          location?: string
          max_backlogs?: number
          min_cgpa?: number
          open_date?: string
          openings?: string
          package_lpa?: number
          role_tag?: string | null
          selection_process?: string[]
          skills?: string[]
          status?: string
          title?: string
          updated_at?: string
          work_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          scheduled_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          scheduled_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          scheduled_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          avatar_url: string | null
          backlog_count: number
          branch: string
          cgpa: number
          college: string
          course: string
          created_at: string
          email: string
          full_name: string
          gender: string | null
          graduation_year: number
          is_active: boolean
          must_change_password: boolean
          phone: string | null
          placement_status: string
          resume_name: string | null
          resume_size: number | null
          resume_url: string | null
          skills: string[]
          student_id: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          backlog_count?: number
          branch?: string
          cgpa?: number
          college?: string
          course?: string
          created_at?: string
          email: string
          full_name: string
          gender?: string | null
          graduation_year?: number
          is_active?: boolean
          must_change_password?: boolean
          phone?: string | null
          placement_status?: string
          resume_name?: string | null
          resume_size?: number | null
          resume_url?: string | null
          skills?: string[]
          student_id: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          backlog_count?: number
          branch?: string
          cgpa?: number
          college?: string
          course?: string
          created_at?: string
          email?: string
          full_name?: string
          gender?: string | null
          graduation_year?: number
          is_active?: boolean
          must_change_password?: boolean
          phone?: string | null
          placement_status?: string
          resume_name?: string | null
          resume_size?: number | null
          resume_url?: string | null
          skills?: string[]
          student_id?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_answers: {
        Row: {
          attempt_id: string
          id: string
          is_correct: boolean
          marked_for_review: boolean
          question_id: string
          selected_option: string | null
        }
        Insert: {
          attempt_id: string
          id?: string
          is_correct?: boolean
          marked_for_review?: boolean
          question_id: string
          selected_option?: string | null
        }
        Update: {
          attempt_id?: string
          id?: string
          is_correct?: boolean
          marked_for_review?: boolean
          question_id?: string
          selected_option?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          accuracy: number
          correct_count: number
          id: string
          incorrect_count: number
          percentage: number
          started_at: string
          submitted_at: string | null
          test_id: string
          time_taken_sec: number
          total_questions: number
          unanswered_count: number
          user_id: string
        }
        Insert: {
          accuracy?: number
          correct_count?: number
          id?: string
          incorrect_count?: number
          percentage?: number
          started_at?: string
          submitted_at?: string | null
          test_id: string
          time_taken_sec?: number
          total_questions?: number
          unanswered_count?: number
          user_id: string
        }
        Update: {
          accuracy?: number
          correct_count?: number
          id?: string
          incorrect_count?: number
          percentage?: number
          started_at?: string
          submitted_at?: string | null
          test_id?: string
          time_taken_sec?: number
          total_questions?: number
          unanswered_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          correct_option: string
          explanation: string | null
          id: string
          marks: number
          negative_marks: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          position: number
          question: string
          test_id: string
        }
        Insert: {
          correct_option: string
          explanation?: string | null
          id?: string
          marks?: number
          negative_marks?: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          position?: number
          question: string
          test_id: string
        }
        Update: {
          correct_option?: string
          explanation?: string | null
          id?: string
          marks?: number
          negative_marks?: number
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          position?: number
          question?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          attempts_allowed: number
          category: string
          course: string | null
          created_at: string
          description: string | null
          difficulty: string
          duration_min: number
          end_at: string | null
          id: string
          name: string
          negative_marking: number
          passing_marks: number
          published: boolean
          start_at: string | null
          total_marks: number
        }
        Insert: {
          attempts_allowed?: number
          category?: string
          course?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_min?: number
          end_at?: string | null
          id?: string
          name: string
          negative_marking?: number
          passing_marks?: number
          published?: boolean
          start_at?: string | null
          total_marks?: number
        }
        Update: {
          attempts_allowed?: number
          category?: string
          course?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string
          duration_min?: number
          end_at?: string | null
          id?: string
          name?: string
          negative_marking?: number
          passing_marks?: number
          published?: boolean
          start_at?: string | null
          total_marks?: number
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
