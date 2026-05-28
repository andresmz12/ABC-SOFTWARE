export type UserRole = 'company' | 'independent' | 'client' | 'admin';
export type UserStatus = 'active' | 'pending' | 'approved' | 'rejected' | 'suspended';
export type Country = 'usa' | 'colombia';
export type Language = 'en' | 'es';
export type ServiceType = 'commercial' | 'residential' | 'both';
export type DocStatus = 'pending' | 'approved' | 'rejected';
export type JobStatus = 'open' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type PaymentStatus = 'held' | 'released' | 'refunded';
export type Currency = 'usd' | 'cop';
export type Frequency = 'one_time' | 'weekly' | 'biweekly' | 'monthly';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  country: Country;
  preferred_language: Language;
  push_token?: string | null;
  created_at: string;
}

export interface Company {
  id: string;
  user_id: string;
  company_name: string;
  ein: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  service_type: ServiceType;
  stripe_customer_id?: string;
  created_at: string;
}

export interface Independent {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  date_of_birth: string;
  service_type: ServiceType;
  stripe_customer_id?: string;
  identity_verified: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  country: Country;
  service_preference?: ServiceType;
  frequency?: Frequency;
  stripe_customer_id?: string;
  created_at: string;
}

export interface ServiceArea {
  id: string;
  provider_id: string;
  provider_type: 'company' | 'independent';
  state: string;
  city: string;
  county?: string;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  doc_type: string;
  file_url: string;
  file_name?: string;
  status: DocStatus;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  uploaded_at: string;
}

export interface JobRequest {
  id: string;
  client_id: string;
  title?: string;
  service_type: 'commercial' | 'residential';
  city: string;
  county?: string;
  state: string;
  zip: string;
  country: Country;
  scheduled_date: string;
  scheduled_time: string;
  estimated_hours: number;
  budget_usd?: number;
  budget_max_usd?: number;
  budget_cop?: number;
  budget_max_cop?: number;
  description?: string;
  photos?: string[];
  status: JobStatus;
  expires_at?: string;
  frequency?: string;
  min_staff?: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_meters?: number | null;
  is_emergency?: boolean | null;
  start_photo_url?: string | null;
  completion_photo_url?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface JobApplication {
  id: string;
  job_request_id: string;
  provider_id: string;
  provider_type: 'company' | 'independent';
  bid_amount_usd?: number;
  bid_amount_cop?: number;
  message?: string;
  status: ApplicationStatus;
  applied_at: string;
}

export interface Review {
  id: string;
  job_request_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  job_request_id: string;
  client_id: string;
  provider_id: string;
  stripe_payment_intent_id?: string;
  amount_usd?: number;
  amount_cop?: number;
  currency: Currency;
  status: PaymentStatus;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title_en: string;
  title_es: string;
  body_en: string;
  body_es: string;
  type: string;
  data?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface ProviderProfile {
  user: User;
  profile: Company | Independent;
  service_areas: ServiceArea[];
  documents: Document[];
  average_rating?: number;
  review_count?: number;
  badges: ProviderBadge[];
}

export type ProviderBadge =
  | 'identity_verified'
  | 'insured'
  | 'background_checked'
  | 'top_rated';

// ─── Extended User with geolocation & push token ─────────────────────────────

export interface UserWithGeo extends User {
  latitude?: number | null;
  longitude?: number | null;
  push_token?: string | null;
}

// ─── Chat & Messages (FASE 2) ─────────────────────────────────────────────────

export interface Chat {
  id: string;
  admin_id: string | null;
  user_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

// ─── Reviews (FASE 3) ─────────────────────────────────────────────────────────
// Replaces the previous Review interface (which used reviewer_id/reviewee_id)

export interface JobReview {
  id: string;
  job_id: string;
  client_id: string;
  provider_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
}

// ─── Extended JobRequest with before/after photos ─────────────────────────────

export interface JobRequestWithPhotos extends JobRequest {
  photos_before?: string[] | null;
  photos_after?: string[] | null;
}
