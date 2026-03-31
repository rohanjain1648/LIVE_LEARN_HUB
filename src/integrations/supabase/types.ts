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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          created_at: string
          criteria: Json | null
          description: string | null
          icon: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      code_reviews: {
        Row: {
          correctness_score: number
          created_at: string
          efficiency_score: number
          feedback: string
          id: string
          readability_score: number
          review_quality_score: number | null
          reviewer_id: string
          submission_id: string
          xp_earned: number | null
        }
        Insert: {
          correctness_score?: number
          created_at?: string
          efficiency_score?: number
          feedback: string
          id?: string
          readability_score?: number
          review_quality_score?: number | null
          reviewer_id: string
          submission_id: string
          xp_earned?: number | null
        }
        Update: {
          correctness_score?: number
          created_at?: string
          efficiency_score?: number
          feedback?: string
          id?: string
          readability_score?: number
          review_quality_score?: number | null
          reviewer_id?: string
          submission_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "code_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "code_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      code_submissions: {
        Row: {
          ai_feedback: string | null
          ai_score: number | null
          code: string
          created_at: string
          id: string
          language: string
          problem_description: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          ai_feedback?: string | null
          ai_score?: number | null
          code: string
          created_at?: string
          id?: string
          language?: string
          problem_description: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          ai_feedback?: string | null
          ai_score?: number | null
          code?: string
          created_at?: string
          id?: string
          language?: string
          problem_description?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      concept_maps: {
        Row: {
          created_at: string
          edges: Json
          id: string
          nodes: Json
          source_text: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          edges?: Json
          id?: string
          nodes?: Json
          source_text?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          edges?: Json
          id?: string
          nodes?: Json
          source_text?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      flashcard_decks: {
        Row: {
          card_count: number
          created_at: string
          description: string | null
          id: string
          last_reviewed_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          card_count?: number
          created_at?: string
          description?: string | null
          id?: string
          last_reviewed_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          card_count?: number
          created_at?: string
          description?: string | null
          id?: string
          last_reviewed_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          box: number
          correct_count: number
          created_at: string
          deck_id: string
          front: string
          id: string
          next_review_at: string
          review_count: number
          user_id: string
        }
        Insert: {
          back: string
          box?: number
          correct_count?: number
          created_at?: string
          deck_id: string
          front: string
          id?: string
          next_review_at?: string
          review_count?: number
          user_id: string
        }
        Update: {
          back?: string
          box?: number
          correct_count?: number
          created_at?: string
          deck_id?: string
          front?: string
          id?: string
          next_review_at?: string
          review_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      misconception_corrections: {
        Row: {
          correction_module: Json
          created_at: string
          id: string
          misconception: string
          quiz_context: Json | null
          resolved: boolean
          topic: string
          user_id: string
        }
        Insert: {
          correction_module?: Json
          created_at?: string
          id?: string
          misconception: string
          quiz_context?: Json | null
          resolved?: boolean
          topic: string
          user_id: string
        }
        Update: {
          correction_module?: Json
          created_at?: string
          id?: string
          misconception?: string
          quiz_context?: Json | null
          resolved?: boolean
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      mood_checkins: {
        Row: {
          created_at: string
          energy_level: number
          id: string
          mood: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          energy_level?: number
          id?: string
          mood: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          energy_level?: number
          id?: string
          mood?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role_preference: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role_preference?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role_preference?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_answer: number
          course_id: string | null
          created_at: string
          created_by: string
          id: string
          options: Json
          question: string
        }
        Insert: {
          correct_answer?: number
          course_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          options?: Json
          question: string
        }
        Update: {
          correct_answer?: number
          course_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_room_answers: {
        Row: {
          answered_at: string
          id: string
          is_correct: boolean
          question_id: string
          room_id: string
          selected_option: number
          user_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          room_id: string
          selected_option: number
          user_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          room_id?: string
          selected_option?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_room_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_room_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_room_answers_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "quiz_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_room_participants: {
        Row: {
          created_at: string
          display_name: string
          id: string
          last_answer_correct: boolean | null
          room_id: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          last_answer_correct?: boolean | null
          room_id: string
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          last_answer_correct?: boolean | null
          room_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "quiz_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_room_questions: {
        Row: {
          correct_answer: number
          id: string
          options: Json
          order_index: number
          question: string
          room_id: string
          time_limit_seconds: number
        }
        Insert: {
          correct_answer?: number
          id?: string
          options?: Json
          order_index?: number
          question: string
          room_id: string
          time_limit_seconds?: number
        }
        Update: {
          correct_answer?: number
          id?: string
          options?: Json
          order_index?: number
          question?: string
          room_id?: string
          time_limit_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_room_questions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "quiz_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_rooms: {
        Row: {
          code: string
          created_at: string
          current_question_index: number
          host_id: string
          id: string
          question_end_time: string | null
          status: Database["public"]["Enums"]["quiz_room_status"]
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          current_question_index?: number
          host_id: string
          id?: string
          question_end_time?: string | null
          status?: Database["public"]["Enums"]["quiz_room_status"]
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          current_question_index?: number
          host_id?: string
          id?: string
          question_end_time?: string | null
          status?: Database["public"]["Enums"]["quiz_room_status"]
          title?: string
        }
        Relationships: []
      }
      screenshot_explanations: {
        Row: {
          created_at: string
          explanation: string
          id: string
          image_url: string
          quiz: Json | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          explanation: string
          id?: string
          image_url: string
          quiz?: Json | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          explanation?: string
          id?: string
          image_url?: string
          quiz?: Json | null
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      socratic_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json
          reasoning_depth: number
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          reasoning_depth?: number
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          reasoning_depth?: number
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_group_members: {
        Row: {
          display_name: string
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          display_name?: string
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          display_name?: string
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_messages: {
        Row: {
          content: string
          created_at: string
          display_name: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          display_name: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display_name?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_group_notes: {
        Row: {
          content: string
          created_at: string
          display_name: string
          group_id: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          display_name: string
          group_id: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display_name?: string
          group_id?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_group_notes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      study_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string
          max_members: number
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code: string
          max_members?: number
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string
          max_members?: number
          name?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          created_at: string
          id: string
          last_activity_date: string | null
          quizzes_completed: number
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity_date?: string | null
          quizzes_completed?: number
          streak_days?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_activity_date?: string | null
          quizzes_completed?: number
          streak_days?: number
          updated_at?: string
          user_id?: string
          xp?: number
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "instructor" | "student"
      quiz_room_status: "waiting" | "playing" | "finished"
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
      app_role: ["admin", "instructor", "student"],
      quiz_room_status: ["waiting", "playing", "finished"],
    },
  },
} as const
