/**
 * Database types for Supabase.
 * Regenerate with: pnpm exec supabase gen types typescript --project-id <id> > src/app/lib/integrations/supabase/types.generated.ts
 * Then re-export or replace this file.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          theme: string;
          week_start: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          theme?: string;
          week_start?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          theme?: string;
          week_start?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_collectibles: {
        Row: {
          id: string;
          user_id: string;
          collectible_id: string;
          awarded_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          collectible_id: string;
          awarded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          collectible_id?: string;
          awarded_at?: string;
        };
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          weight: number | null;
          carbs_g: number | null;
          protein_g: number | null;
          fat_g: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          weight?: number | null;
          carbs_g?: number | null;
          protein_g?: number | null;
          fat_g?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          weight?: number | null;
          carbs_g?: number | null;
          protein_g?: number | null;
          fat_g?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
      reveal_odds: {
        Row: {
          id: string;
          animation_id: string;
          weight: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          animation_id: string;
          weight: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          animation_id?: string;
          weight?: number;
          created_at?: string;
        };
      };
      reveal_log: {
        Row: {
          id: string;
          user_id: string;
          animation_id: string;
          creature_id: string | null;
          first_encounter: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          animation_id: string;
          creature_id?: string | null;
          first_encounter?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          animation_id?: string;
          creature_id?: string | null;
          first_encounter?: boolean;
          created_at?: string;
        };
      };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type ProfilesRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfilesInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfilesUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type DailyLogsRow = Database["public"]["Tables"]["daily_logs"]["Row"];
export type DailyLogsInsert = Database["public"]["Tables"]["daily_logs"]["Insert"];
export type DailyLogsUpdate = Database["public"]["Tables"]["daily_logs"]["Update"];
