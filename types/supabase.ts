export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          is_admin?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          theme_config: Json;
          custom_features: Json;
          origin_url: string | null;
          origin_host: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          logo_url?: string | null;
          theme_config?: Json;
          custom_features?: Json;
          origin_url?: string | null;
          origin_host?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          logo_url?: string | null;
          theme_config?: Json;
          custom_features?: Json;
          origin_url?: string | null;
          origin_host?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          project_id: string;
          user_id: string;
          role: "admin" | "member";
          created_at: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
          role?: "admin" | "member";
          created_at?: string;
        };
        Update: {
          project_id?: string;
          user_id?: string;
          role?: "admin" | "member";
          created_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: "idea" | "planned" | "in-progress" | "done";
          author_id: string;
          created_at: string;
          tags: string[];
          project_id: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          status?: "idea" | "planned" | "in-progress" | "done";
          author_id: string;
          created_at?: string;
          tags?: string[];
          project_id?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: "idea" | "planned" | "in-progress" | "done";
          author_id?: string;
          created_at?: string;
          tags?: string[];
          project_id?: string | null;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      post_vote_counts: {
        Args: Record<string, never>;
        Returns: Array<{
          post_id: string;
          vote_count: number;
        }>;
      };
      assert_user_rate_limit: {
        Args: {
          action_key: string;
          max_count: number;
          window_seconds: number;
        };
        Returns: undefined;
      };
      create_post_with_vote: {
        Args: {
          post_title: string;
          post_description: string;
          post_tags?: string[];
          post_project_id?: string | null;
        };
        Returns: {
          id: string;
          title: string;
          description: string;
          status: "idea" | "planned" | "in-progress" | "done";
          author_id: string;
          created_at: string;
          tags: string[];
          project_id: string | null;
        };
      };
      merge_duplicate_posts: {
        Args: {
          canonical_post_id: string;
          duplicate_post_ids: string[];
        };
        Returns: undefined;
      };
      connect_project: {
        Args: {
          p_origin_url: string;
          p_name: string;
          p_slug: string;
          p_logo_url?: string | null;
          p_theme_config?: Json;
          p_custom_features?: Json | null;
        };
        Returns: {
          id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          theme_config: Json;
          custom_features: Json;
          origin_url: string | null;
          origin_host: string | null;
          created_at: string;
        };
      };
      claim_project_access: {
        Args: { p_project_id: string };
        Returns: string;
      };
      is_project_admin: {
        Args: { p_project_id: string };
        Returns: boolean;
      };
      can_admin_post: {
        Args: { p_post_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
