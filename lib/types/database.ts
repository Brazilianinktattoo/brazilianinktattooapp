export type UserRole = "admin" | "tatuador" | "piercer";
export type AppointmentStatus = "confirmado" | "cancelado";
export type DepositStatus = "pago" | "pendente";
export type ComandaStatus = "aberta" | "fechada";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Unit = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Maca = {
  id: string;
  label: string;
  unit_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Appointment = {
  id: string;
  collaborator_id: string;
  unit_id: string;
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
  unit: Pick<Unit, "id" | "name"> | null;
};

export type Notification = {
  id: string;
  profile_id: string;
  appointment_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  code: string;
  quantity: number;
  min_stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type StockEntry = {
  id: string;
  product_id: string;
  quantity: number;
  note: string;
  created_by: string | null;
  created_at: string;
};

export type Comanda = {
  id: string;
  appointment_id: string;
  collaborator_id: string;
  unit_id: string;
  status: ComandaStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export type ComandaWithRelations = Comanda & {
  appointment: Pick<Appointment, "id" | "client_name" | "starts_at"> | null;
  collaborator: Pick<Profile, "id" | "full_name" | "role"> | null;
  unit: Pick<Unit, "id" | "name"> | null;
};

export type ComandaService = {
  id: string;
  comanda_id: string;
  description: string;
  price: number;
  created_at: string;
  updated_at: string;
};

export type ComandaProduct = {
  id: string;
  comanda_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
};

export type ComandaProductWithRelations = ComandaProduct & {
  product: Pick<Product, "id" | "name" | "code"> | null;
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
      units: {
        Row: Unit;
        Insert: Partial<Unit> & { name: string };
        Update: Partial<Unit>;
        Relationships: [];
      };
      macas: {
        Row: Maca;
        Insert: Partial<Maca> & { label: string; unit_id: string };
        Update: Partial<Maca>;
        Relationships: [];
      };
      appointments: {
        Row: Appointment;
        Insert: Partial<Appointment> & {
          collaborator_id: string;
          unit_id: string;
          client_name: string;
          starts_at: string;
          ends_at: string;
        };
        Update: Partial<Appointment>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { profile_id: string; message: string };
        Update: Partial<Notification>;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: Partial<Product> & { name: string; code: string };
        Update: Partial<Product>;
        Relationships: [];
      };
      stock_entries: {
        Row: StockEntry;
        Insert: Partial<StockEntry> & { product_id: string; quantity: number };
        Update: Partial<StockEntry>;
        Relationships: [];
      };
      comandas: {
        Row: Comanda;
        Insert: Partial<Comanda> & { appointment_id: string };
        Update: Partial<Comanda>;
        Relationships: [];
      };
      comanda_services: {
        Row: ComandaService;
        Insert: Partial<ComandaService> & {
          comanda_id: string;
          description: string;
        };
        Update: Partial<ComandaService>;
        Relationships: [];
      };
      comanda_products: {
        Row: ComandaProduct;
        Insert: Partial<ComandaProduct> & {
          comanda_id: string;
          product_id: string;
          quantity: number;
        };
        Update: Partial<ComandaProduct>;
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
