export type UserRole =
  | "admin"
  | "tatuador"
  | "piercer"
  | "chefe_piercing"
  | "visitante";
export type ProductCategory = "geral" | "piercing";
export type AppointmentStatus = "confirmado" | "cancelado";
export type DepositStatus = "pago" | "pendente";
export type ComandaStatus = "aberta" | "fechada";
export type PaymentMethod = "credito" | "debito" | "pix" | "dinheiro" | "paypal";
export type CardFeeMethod = "debito" | "credito";
export type ServiceCategory = "tatuagem" | "piercing";
export type JewelryOperation = "aplicada" | "trocada" | "vendida";
export type ClientOrigin =
  | "trazido_pelo_tatuador"
  | "indicado_pelo_estudio"
  | "barra_shopping";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  birthday: string | null;
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
  client_id: string | null;
  client_name: string;
  client_phone: string;
  client_is_own: boolean;
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

export type Client = {
  id: string;
  full_name: string;
  phone: string;
  birthday: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type MessageTrigger =
  | "aniversario"
  | "pos_tattoo_1"
  | "pos_tattoo_7"
  | "pos_tattoo_15"
  | "pos_tattoo_30"
  | "pos_tattoo_60";

export type MessageTemplate = {
  id: string;
  trigger: MessageTrigger;
  active: boolean;
  body: string;
  updated_at: string;
};

export type MessageQueueStatus = "pendente" | "enviada" | "cancelada" | "erro";

export type MessageQueueItem = {
  id: string;
  client_id: string;
  kind: string;
  comanda_id: string | null;
  body: string;
  status: MessageQueueStatus;
  scheduled_for: string;
  created_by: string | null;
  created_at: string;
  sent_at: string | null;
  send_attempts: number;
  last_error: string | null;
  provider_message_id: string | null;
};

export type MessageQueueItemWithClient = MessageQueueItem & {
  client: Pick<Client, "id" | "full_name" | "phone"> | null;
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
  category: ProductCategory;
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
  payment_method: PaymentMethod | null;
  installments: number;
  fee_rate_percent: number;
  gross_amount: number | null;
  net_amount: number | null;
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
  service_id: string | null;
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

export type CardFeeRate = {
  id: string;
  method: CardFeeMethod;
  installments: number;
  rate_percent: number;
  effective_from: string;
  created_by: string | null;
  created_at: string;
};

export type ServiceSubcategory =
  | ""
  | "so_perfuracao"
  | "perfuracao_joia"
  | "joia_titanio"
  | "joia_aco";

export type FormText = {
  key: string;
  label: string;
  body: string;
  updated_at: string;
};

export type FixedBill = {
  id: string;
  name: string;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  created_at: string;
  updated_at: string;
};

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  subcategory: ServiceSubcategory;
  price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type JewelryCatalogItem = {
  id: string;
  name: string;
  code: string;
  barcode: string;
  category: string;
  material: string;
  cost_value: number;
  stock_quantity: number;
  price_aplicacao: number;
  price_troca: number;
  price_venda: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ComandaJewelry = {
  id: string;
  comanda_id: string;
  jewelry_catalog_id: string | null;
  jewelry_name: string;
  operation: JewelryOperation;
  value: number;
  created_at: string;
  updated_at: string;
};

export type HealthDeclarationAnswer = { yes: boolean; detail: string };
export type HealthDeclaration = Record<string, HealthDeclarationAnswer>;

export type ProcedureType = "tatuagem" | "piercing" | "ambos";
export type CoworkingProcedureType = "tatuagem" | "piercing";
export type AnamneseLanguage = "portugues" | "ingles" | "espanhol";

export type AnamneseForm = {
  id: string;
  appointment_id: string;
  full_name: string;
  birth_date: string | null;
  cpf: string;
  rg: string;
  address: string;
  cep: string;
  phone: string;
  email: string;
  is_minor: boolean | null;
  procedure_type: ProcedureType | null;
  procedure_description: string;
  body_location: string;
  total_amount: number;
  deposit_amount: number;
  health_declaration: HealthDeclaration;
  client_origin: ClientOrigin | null;
  file_path: string | null;
  sign_token: string;
  signed_at: string | null;
  signer_name: string | null;
  created_at: string;
  updated_at: string;
};

export type AnamneseFormWithAppointment = AnamneseForm & {
  appointment: Pick<Appointment, "id" | "client_name" | "starts_at"> | null;
};

export type MinorAuthorizationForm = {
  id: string;
  anamnese_form_id: string;
  guardian_name: string;
  guardian_rg: string;
  guardian_cpf: string;
  guardian_birth_date: string | null;
  guardian_marital_status: string;
  guardian_address: string;
  guardian_neighborhood: string;
  guardian_city: string;
  guardian_state: string;
  guardian_cep: string;
  guardian_phone: string;
  guardian_email: string;
  minor_name: string;
  minor_rg: string;
  minor_cpf: string;
  minor_birth_date: string | null;
  minor_phone: string;
  minor_email: string;
  minor_health_declaration: HealthDeclaration;
  piercer_name: string;
  body_location: string;
  file_path: string | null;
  sign_token: string;
  signed_at: string | null;
  signer_name: string | null;
  created_at: string;
  updated_at: string;
};

export type CoworkingAnamneseForm = {
  id: string;
  coworking_pass_id: string;
  language: AnamneseLanguage;
  full_name: string;
  cpf: string;
  address: string;
  cep: string;
  birth_date: string | null;
  phone: string;
  procedure_type: CoworkingProcedureType | null;
  health_declaration: HealthDeclaration;
  file_path: string | null;
  sign_token: string;
  signed_at: string | null;
  signer_name: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseReceipt = {
  id: string;
  course_payment_id: string;
  file_path: string | null;
  access_token: string;
  created_by: string | null;
  created_at: string;
};

export type FixedFeePeriod = "hora" | "dia" | "semana";

export type CoworkingPass = {
  id: string;
  profile_id: string;
  unit_id: string;
  maca_id: string;
  guest_name: string;
  guest_contact: string;
  guest_email: string;
  guest_password: string;
  starts_at: string;
  ends_at: string;
  fixed_fee: number;
  fixed_fee_period: FixedFeePeriod;
  percentage: number;
  reported_revenue: number;
  token: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CoworkingPassWithRelations = CoworkingPass & {
  unit: Pick<Unit, "id" | "name"> | null;
  maca: Pick<Maca, "id" | "label"> | null;
};

export type CourseType =
  | "tatuagem_iniciante"
  | "tatuagem_especializacao"
  | "piercing_iniciante"
  | "piercing_especializacao";

// "confirmado" não é persistido — é derivado em lib/cursos.ts a partir de
// status='inscrito' + mais de 7 dias desde a inscrição.
export type EnrollmentStatus =
  | "inscrito"
  | "lista_espera"
  | "convocado"
  | "matriculado"
  | "desistente";

export type CoursePaymentType = "sinal" | "final";

export type CourseClass = {
  id: string;
  course_type: CourseType;
  name: string;
  start_date: string | null;
  max_seats: number;
  price_total: number;
  deposit_percentage: number;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseSignupLink = {
  id: string;
  course_class_id: string;
  token: string;
  created_by: string | null;
  created_at: string;
  used_at: string | null;
  enrollment_id: string | null;
};

export type CourseEnrollment = {
  id: string;
  course_class_id: string;
  signup_link_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  rg: string;
  address: string;
  state: string;
  status: EnrollmentStatus;
  waitlist_position: number | null;
  signed_up_at: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type CourseEnrollmentWithRelations = CourseEnrollment & {
  course_class: Pick<
    CourseClass,
    "id" | "name" | "course_type" | "price_total" | "deposit_percentage"
  > | null;
};

export type CoursePayment = {
  id: string;
  enrollment_id: string;
  type: CoursePaymentType;
  amount: number;
  paid_at: string;
  notes: string;
  created_by: string | null;
  created_at: string;
};

export type CourseContract = {
  id: string;
  enrollment_id: string;
  content: string;
  file_path: string | null;
  signed: boolean;
  generated_at: string | null;
  uploaded_at: string | null;
  sign_token: string;
  signed_at: string | null;
  signer_name: string | null;
  updated_at: string;
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
      card_fee_rates: {
        Row: CardFeeRate;
        Insert: Partial<CardFeeRate> & {
          method: CardFeeMethod;
          rate_percent: number;
        };
        Update: Partial<CardFeeRate>;
        Relationships: [];
      };
      services: {
        Row: Service;
        Insert: Partial<Service> & { name: string; category: ServiceCategory };
        Update: Partial<Service>;
        Relationships: [];
      };
      jewelry_catalog: {
        Row: JewelryCatalogItem;
        Insert: Partial<JewelryCatalogItem> & { name: string };
        Update: Partial<JewelryCatalogItem>;
        Relationships: [];
      };
      comanda_jewelry: {
        Row: ComandaJewelry;
        Insert: Partial<ComandaJewelry> & {
          comanda_id: string;
          jewelry_name: string;
          operation: JewelryOperation;
        };
        Update: Partial<ComandaJewelry>;
        Relationships: [];
      };
      form_texts: {
        Row: FormText;
        Insert: Partial<FormText> & { key: string; label: string };
        Update: Partial<FormText>;
        Relationships: [];
      };
      fixed_bills: {
        Row: FixedBill;
        Insert: Partial<FixedBill> & { name: string };
        Update: Partial<FixedBill>;
        Relationships: [];
      };
      anamnese_forms: {
        Row: AnamneseForm;
        Insert: Partial<AnamneseForm> & { appointment_id: string };
        Update: Partial<AnamneseForm>;
        Relationships: [];
      };
      minor_authorization_forms: {
        Row: MinorAuthorizationForm;
        Insert: Partial<MinorAuthorizationForm> & { anamnese_form_id: string };
        Update: Partial<MinorAuthorizationForm>;
        Relationships: [];
      };
      coworking_anamnese_forms: {
        Row: CoworkingAnamneseForm;
        Insert: Partial<CoworkingAnamneseForm> & {
          coworking_pass_id: string;
          language: AnamneseLanguage;
        };
        Update: Partial<CoworkingAnamneseForm>;
        Relationships: [];
      };
      course_receipts: {
        Row: CourseReceipt;
        Insert: Partial<CourseReceipt> & { course_payment_id: string };
        Update: Partial<CourseReceipt>;
        Relationships: [];
      };
      coworking_passes: {
        Row: CoworkingPass;
        Insert: Partial<CoworkingPass> & {
          profile_id: string;
          unit_id: string;
          maca_id: string;
          guest_name: string;
          guest_email: string;
          guest_password: string;
          starts_at: string;
          ends_at: string;
        };
        Update: Partial<CoworkingPass>;
        Relationships: [];
      };
      course_classes: {
        Row: CourseClass;
        Insert: Partial<CourseClass> & {
          course_type: CourseType;
          name: string;
          max_seats: number;
          price_total: number;
        };
        Update: Partial<CourseClass>;
        Relationships: [];
      };
      course_signup_links: {
        Row: CourseSignupLink;
        Insert: Partial<CourseSignupLink> & { course_class_id: string };
        Update: Partial<CourseSignupLink>;
        Relationships: [];
      };
      course_enrollments: {
        Row: CourseEnrollment;
        Insert: Partial<CourseEnrollment> & {
          course_class_id: string;
          full_name: string;
          email: string;
          phone: string;
        };
        Update: Partial<CourseEnrollment>;
        Relationships: [];
      };
      course_payments: {
        Row: CoursePayment;
        Insert: Partial<CoursePayment> & {
          enrollment_id: string;
          type: CoursePaymentType;
          amount: number;
        };
        Update: Partial<CoursePayment>;
        Relationships: [];
      };
      course_contracts: {
        Row: CourseContract;
        Insert: Partial<CourseContract> & { enrollment_id: string };
        Update: Partial<CourseContract>;
        Relationships: [];
      };
      clients: {
        Row: Client;
        Insert: Partial<Client> & { full_name: string; phone: string };
        Update: Partial<Client>;
        Relationships: [];
      };
      message_templates: {
        Row: MessageTemplate;
        Insert: Partial<MessageTemplate> & { trigger: MessageTrigger };
        Update: Partial<MessageTemplate>;
        Relationships: [];
      };
      message_queue: {
        Row: MessageQueueItem;
        Insert: Partial<MessageQueueItem> & {
          client_id: string;
          kind: string;
          body: string;
          scheduled_for: string;
        };
        Update: Partial<MessageQueueItem>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_due_messages: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: {
      user_role: UserRole;
      course_type: CourseType;
      enrollment_status: EnrollmentStatus;
      course_payment_type: CoursePaymentType;
    };
    CompositeTypes: Record<string, never>;
  };
};
