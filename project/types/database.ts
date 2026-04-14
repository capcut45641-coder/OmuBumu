export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Tables: {
      tournaments: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          cover_image: string;
          bracket_size: number;
          play_count: number;
          created_at: string;
          is_trending: boolean;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          cover_image: string;
          bracket_size?: number;
          play_count?: number;
          created_at?: string;
          is_trending?: boolean;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          cover_image?: string;
          bracket_size?: number;
          play_count?: number;
          created_at?: string;
          is_trending?: boolean;
          created_by?: string | null;
        };
        Relationships: [];
      };
      tournament_items: {
        Row: {
          id: string;
          tournament_id: string;
          image_url: string;
          name: string;
          win_count: number;
          total_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          image_url: string;
          name: string;
          win_count?: number;
          total_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          image_url?: string;
          name?: string;
          win_count?: number;
          total_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          id: string;
          tournament_id: string;
          item_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          item_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          item_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
  };
}


export type Tournament = Database['public']['Tables']['tournaments']['Row'];
export type TournamentItem = Database['public']['Tables']['tournament_items']['Row'];
export type Vote = Database['public']['Tables']['votes']['Row'];
