export type EventStatus = 'draft' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed';
export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'disqualified';
export type SessionStatus = 'scheduled' | 'staging' | 'countdown' | 'live' | 'finished';
export type ScanType = 'checkin' | 'finish';
export type Gender = 'male' | 'female';
export type StaffRole = 'admin' | 'timing_operator';

export interface EventRow {
  id: string;
  name: string;
  event_date: string;
  location: string | null;
  description: string | null;
  status: EventStatus;
  registration_close_at: string | null;
  created_at: string;
}

export interface AgeGroupRow {
  id: string;
  event_id: string;
  label: string;
  min_age: number;
  max_age: number;
  sort_order: number;
}

export interface RaceCategoryRow {
  id: string;
  event_id: string;
  name: string;
  distance_m: number;
  gender_restriction: Gender | null;
  min_age: number | null;
  max_age: number | null;
  max_participants: number | null;
  entry_fee: number;
  scheduled_start: string | null;
  next_race_number: number;
  created_at: string;
}

export interface SwimmerRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: Gender;
  club: string | null;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  medical_notes: string | null;
  created_at: string;
}

export interface RegistrationRow {
  id: string;
  swimmer_id: string;
  event_id: string;
  category_id: string;
  race_number: number;
  status: RegistrationStatus;
  waiver_signed: boolean;
  created_at: string;
  confirmed_at: string | null;
}

export interface TimingChipRow {
  id: string;
  chip_code: string;
  status: 'available' | 'assigned' | 'lost' | 'retired';
  registration_id: string | null;
  assigned_at: string | null;
}

export interface RaceSessionRow {
  id: string;
  category_id: string;
  status: SessionStatus;
  countdown_seconds: number | null;
  countdown_started_at: string | null;
  gun_time: string | null;
  finished_at: string | null;
}

export interface ScanEventRow {
  id: string;
  session_id: string;
  chip_code: string;
  registration_id: string | null;
  scan_type: ScanType;
  scanned_at: string;
  station_id: string | null;
  is_duplicate: boolean;
  note: string | null;
}

export interface StaffProfileRow {
  id: string;
  full_name: string;
  role: StaffRole;
  created_at: string;
}

export interface ResultRow {
  registration_id: string;
  event_id: string;
  category_id: string;
  category_name: string;
  race_number: number;
  full_name: string;
  gender: Gender;
  club: string | null;
  age_at_event: number;
  session_status: SessionStatus;
  gun_time: string | null;
  finish_time: string | null;
  elapsed: string | null; // Postgres interval, e.g. "00:12:34.5"
  checked_in_at: string | null;
}

export interface MedalResultRow extends ResultRow {
  age_group_id: string | null;
  age_group_label: string | null;
  age_group_rank: number | null;
  overall_rank: number | null;
}

export interface RegistrationSummary {
  registration_id: string;
  full_name: string;
  race_number: number;
  category_name: string;
  event_name: string;
  event_date: string;
  status: RegistrationStatus;
  chip_code: string | null;
}

export interface Database {
  public: {
    Tables: {
      events: { Row: EventRow; Insert: Partial<EventRow>; Update: Partial<EventRow> };
      age_groups: { Row: AgeGroupRow; Insert: Partial<AgeGroupRow>; Update: Partial<AgeGroupRow> };
      race_categories: { Row: RaceCategoryRow; Insert: Partial<RaceCategoryRow>; Update: Partial<RaceCategoryRow> };
      swimmers: { Row: SwimmerRow; Insert: Partial<SwimmerRow>; Update: Partial<SwimmerRow> };
      registrations: { Row: RegistrationRow; Insert: Partial<RegistrationRow>; Update: Partial<RegistrationRow> };
      timing_chips: { Row: TimingChipRow; Insert: Partial<TimingChipRow>; Update: Partial<TimingChipRow> };
      race_sessions: { Row: RaceSessionRow; Insert: Partial<RaceSessionRow>; Update: Partial<RaceSessionRow> };
      scan_events: { Row: ScanEventRow; Insert: Partial<ScanEventRow>; Update: Partial<ScanEventRow> };
      staff_profiles: { Row: StaffProfileRow; Insert: Partial<StaffProfileRow>; Update: Partial<StaffProfileRow> };
    };
    Views: {
      v_results: { Row: ResultRow };
      v_medal_results: { Row: MedalResultRow };
    };
    Functions: {
      register_swimmer: {
        Args: {
          p_event_id: string;
          p_category_id: string;
          p_full_name: string;
          p_email: string;
          p_phone: string;
          p_date_of_birth: string;
          p_gender: Gender;
          p_club: string | null;
          p_emergency_contact_name: string;
          p_emergency_contact_phone: string;
          p_medical_notes: string | null;
          p_waiver_signed: boolean;
        };
        Returns: { registration_id: string; race_number: number; swimmer_id: string }[];
      };
      get_registration_summary: {
        Args: { p_registration_id: string };
        Returns: RegistrationSummary[];
      };
      assign_timing_chip: {
        Args: { p_chip_code: string; p_registration_id: string };
        Returns: void;
      };
      start_countdown: {
        Args: { p_session_id: string; p_seconds: number };
        Returns: RaceSessionRow;
      };
      fire_gun: {
        Args: { p_session_id: string };
        Returns: RaceSessionRow;
      };
      finish_session: {
        Args: { p_session_id: string };
        Returns: RaceSessionRow;
      };
      record_scan: {
        Args: { p_session_id: string; p_chip_code: string; p_scan_type: ScanType; p_station_id: string | null };
        Returns: {
          scan_id: string;
          registration_id: string | null;
          race_number: number | null;
          full_name: string | null;
          is_duplicate: boolean;
          chip_known: boolean;
        }[];
      };
    };
  };
}
