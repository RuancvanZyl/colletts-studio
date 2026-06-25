// Auto-generated from schema — update by running:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type JobPhase =
  | 'intake'
  | 'skin_processing'
  | 'skull_processing'
  | 'storage_pre'
  | 'tannery'
  | 'storage_post'
  | 'mounting'
  | 'finishing'
  | 'quality_check'
  | 'packing'
  | 'shipped'
  | 'delivered';

export type PartType = 'skull' | 'horns' | 'cape_skin' | 'full_skin' | 'tusks' | 'antlers' | 'full_body';

export type StaffRole = 'admin' | 'studio_manager' | 'department_staff' | 'ground_staff' | 'bookkeeper';

export type AlertType = 'overdue_paid' | 'stalled_in_phase' | 'missing_target_date';

export interface Database {
  public: {
    Tables: {
      species: {
        Row: {
          id: string;
          common_name: string;
          scientific_name: string | null;
          category: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['species']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['species']['Insert']>;
      };
      outfitters: {
        Row: {
          id: string;
          name: string;
          contact_name: string | null;
          email: string | null;
          phone: string | null;
          country: string | null;
          province: string | null;
          farm_name: string | null;
          commission_pct: number | null;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['outfitters']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['outfitters']['Insert']>;
      };
      clients: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          country: string | null;
          nationality: string | null;
          passport_number: string | null;
          passport_expiry: string | null;
          outfitter_id: string | null;
          auth_user_id: string | null;
          onboarding_status: 'not_started' | 'in_progress' | 'complete';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      specimens: {
        Row: {
          id: string;
          client_id: string;
          species_id: string | null;
          species_name: string | null;
          hunt_date: string | null;
          hunt_location: string | null;
          outfitter_id: string | null;
          tag_number: string | null;
          destination: 'local' | 'export' | null;
          receiving_batch_id: string | null;
          intake_condition: string | null;
          current_location: string | null;
          status: 'expected' | 'received';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['specimens']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['specimens']['Insert']>;
      };
      jobs: {
        Row: {
          id: string;
          specimen_id: string;
          mount_type_id: string | null;
          instructions: string | null;
          instructions_received_at: string | null;
          current_phase: JobPhase;
          assigned_department_id: string | null;
          assigned_staff_id: string | null;
          production_started_at: string | null;
          due_date: string | null;
          rush: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>;
      };
      parts: {
        Row: {
          id: string;
          job_id: string;
          part_type: PartType;
          tag_number: string | null;
          current_phase: JobPhase | null;
          current_location: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['parts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['parts']['Insert']>;
      };
      departments: {
        Row: { id: string; name: string; sort_order: number };
        Insert: Omit<Database['public']['Tables']['departments']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['departments']['Insert']>;
      };
      mount_types: {
        Row: { id: string; name: string };
        Insert: Omit<Database['public']['Tables']['mount_types']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['mount_types']['Insert']>;
      };
      work_sessions: {
        Row: {
          id: string;
          job_id: string;
          staff_id: string;
          department_id: string | null;
          started_at: string;
          ended_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['work_sessions']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['work_sessions']['Insert']>;
      };
      phase_checkpoints: {
        Row: {
          id: string;
          job_id: string;
          phase: JobPhase;
          staff_id: string;
          comment: string | null;
          attachment_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['phase_checkpoints']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['phase_checkpoints']['Insert']>;
      };
      attachments: {
        Row: {
          id: string;
          entity_type: 'specimen' | 'job';
          entity_id: string;
          storage_path: string;
          caption: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['attachments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['attachments']['Insert']>;
      };
      invoices: {
        Row: {
          id: string;
          client_id: string;
          invoice_number: string;
          status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
          issue_date: string;
          due_date: string | null;
          currency: string;
          deposit_amount: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };
      invoice_line_items: {
        Row: {
          id: string;
          invoice_id: string;
          job_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          line_total: number;
        };
        Insert: Omit<Database['public']['Tables']['invoice_line_items']['Row'], 'id' | 'line_total'>;
        Update: Partial<Database['public']['Tables']['invoice_line_items']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          invoice_id: string;
          amount: number;
          payment_type: 'deposit' | 'progress' | 'final' | null;
          paid_at: string;
          method: string | null;
          payfast_payment_id: string | null;
          notes: string | null;
        };
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
      job_alerts: {
        Row: {
          id: string;
          job_id: string;
          alert_type: AlertType;
          triggered_at: string;
          acknowledged: boolean;
          acknowledged_by: string | null;
          acknowledged_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['job_alerts']['Row'], 'id' | 'triggered_at'>;
        Update: Partial<Database['public']['Tables']['job_alerts']['Insert']>;
      };
      inventory_items: {
        Row: {
          id: string;
          name: string;
          unit: string | null;
          quantity_on_hand: number;
          reorder_threshold: number;
          unit_cost: number | null;
          supplier: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['inventory_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['inventory_items']['Insert']>;
      };
      inventory_usage_log: {
        Row: {
          id: string;
          inventory_item_id: string;
          job_id: string | null;
          quantity_used: number;
          used_at: string;
          logged_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['inventory_usage_log']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['inventory_usage_log']['Insert']>;
      };
      staff_profiles: {
        Row: {
          id: string;
          full_name: string;
          role: StaffRole;
          department_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['staff_profiles']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['staff_profiles']['Insert']>;
      };
      client_communications: {
        Row: {
          id: string;
          client_id: string;
          channel: string | null;
          summary: string;
          occurred_at: string;
          logged_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['client_communications']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['client_communications']['Insert']>;
      };
      receiving_batches: {
        Row: {
          id: string;
          received_date: string;
          outfitter_id: string | null;
          source_other: string | null;
          received_by: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['receiving_batches']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['receiving_batches']['Insert']>;
      };
      storage_locations: {
        Row: {
          id: string;
          zone: string;
          rack: string;
          bin: string;
          capacity: number;
          current_part_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['storage_locations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['storage_locations']['Insert']>;
      };
    };
    Views: {
      v_active_alerts: {
        Row: {
          job_id: string;
          current_phase: JobPhase;
          due_date: string | null;
          production_started_at: string | null;
          client_name: string;
          species_name: string | null;
          is_overdue_paid: boolean;
          is_missing_target_date: boolean;
          is_stalled: boolean;
        };
      };
    };
    Functions: {
      get_dashboard_summary: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_my_role: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
}
