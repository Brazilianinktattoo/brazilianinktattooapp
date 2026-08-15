export type UserRole = "admin" | "tatuador" | "piercer";
export type AppointmentStatus = "confirmado" | "cancelado";
export type DepositStatus = "pago" | "pendente";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Maca = {
  id: string;
  label: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Appointment = {
  id: string;
  collaborator_id: string;
  maca_id: string | null;
  client_name: string;
  client_phone: string;
  notes: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  deposit_amount: number;
  deposit_status: DepositStatus;
  created_at: string;
  updated_at: string;
};

export type AppointmentWithRelations = Appointment & {
  collaborator: Pick<Profile, "id" | "full_name" | "role"> | null;
  maca: Pick<Maca, "id" | "label"> | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      macas: {
        Row: Maca;
        Insert: Partial<Maca> & { label: string };
        Update: Partial<Maca>;
        Relationships: [];
      };
      appointments: {
        Row: Appointment;
        Insert: Partial<Appointment> & {
          collaborator_id: string;
          client_name: string;
          starts_at: string;
          ends_at: string;
        };
        Update: Partial<Appointment>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
