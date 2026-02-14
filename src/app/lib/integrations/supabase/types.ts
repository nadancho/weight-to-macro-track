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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
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
