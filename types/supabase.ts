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
      posts: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: "idea" | "planned" | "in-progress" | "done";
          author_id: string;
          created_at: string;
          tags: string[];
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          status?: "idea" | "planned" | "in-progress" | "done";
          author_id: string;
          created_at?: string;
          tags?: string[];
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: "idea" | "planned" | "in-progress" | "done";
          author_id?: string;
          created_at?: string;
          tags?: string[];
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
        };
        Returns: {
          id: string;
          title: string;
          description: string;
          status: "idea" | "planned" | "in-progress" | "done";
          author_id: string;
          created_at: string;
          tags: string[];
        };
      };
      merge_duplicate_posts: {
        Args: {
          canonical_post_id: string;
          duplicate_post_ids: string[];
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
