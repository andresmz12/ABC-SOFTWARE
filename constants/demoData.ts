import type { JobRequest, JobApplication, Document, ProviderProfile, ServiceArea } from '@/types';

const now = Date.now();
const mins = (n: number) => n * 60 * 1000;
const hrs  = (n: number) => n * 3600 * 1000;

// ── Provider Home: open job alerts ──────────────────────────────────────────
export const DEMO_JOB_ALERTS: JobRequest[] = [
  {
    id: 'job-1',
    client_id: 'client-1',
    title: 'Office Deep Clean',
    service_type: 'commercial',
    city: 'Miami',
    state: 'FL',
    zip: '33101',
    country: 'usa',
    scheduled_date: '2025-06-15',
    scheduled_time: '18:00',
    estimated_hours: 4,
    budget_usd: 150,
    budget_max_usd: 200,
    description: '4-floor office building — bathrooms, kitchen, and common areas. After-hours preferred.',
    status: 'open',
    expires_at: new Date(now + mins(115)).toISOString(),
    created_at: new Date(now - mins(5)).toISOString(),
  },
  {
    id: 'job-2',
    client_id: 'client-2',
    title: 'House Cleaning',
    service_type: 'residential',
    city: 'Miami Beach',
    state: 'FL',
    zip: '33139',
    country: 'usa',
    scheduled_date: '2025-06-16',
    scheduled_time: '10:00',
    estimated_hours: 3,
    budget_usd: 80,
    budget_max_usd: 120,
    description: '3-bedroom, 2-bath house. Standard cleaning service, bring own supplies.',
    status: 'open',
    expires_at: new Date(now + mins(100)).toISOString(),
    created_at: new Date(now - mins(20)).toISOString(),
  },
  {
    id: 'job-3',
    client_id: 'client-3',
    title: 'Post-Construction Clean',
    service_type: 'commercial',
    city: 'Coral Gables',
    state: 'FL',
    zip: '33134',
    country: 'usa',
    scheduled_date: '2025-06-17',
    scheduled_time: '08:00',
    estimated_hours: 8,
    budget_usd: 300,
    budget_max_usd: 400,
    description: 'New office renovation — debris removal and deep clean. All floors, windows, and fixtures.',
    status: 'open',
    expires_at: new Date(now + hrs(1)).toISOString(),
    created_at: new Date(now - hrs(1)).toISOString(),
  },
];

// ── Provider Jobs: applied / active / completed ──────────────────────────────
export const DEMO_APPLIED_JOBS: JobRequest[] = [
  {
    id: 'job-4',
    client_id: 'client-4',
    title: 'Restaurant Kitchen Clean',
    service_type: 'commercial',
    city: 'Brickell',
    state: 'FL',
    zip: '33129',
    country: 'usa',
    scheduled_date: '2025-06-20',
    scheduled_time: '22:00',
    estimated_hours: 5,
    budget_usd: 200,
    budget_max_usd: 250,
    description: 'Deep clean of commercial kitchen after dinner service.',
    status: 'open',
    expires_at: new Date(now + hrs(6)).toISOString(),
    created_at: new Date(now - hrs(3)).toISOString(),
  },
];

export const DEMO_ACTIVE_JOBS: JobRequest[] = [
  {
    id: 'job-5',
    client_id: 'client-5',
    title: 'Apartment Move-Out Clean',
    service_type: 'residential',
    city: 'Wynwood',
    state: 'FL',
    zip: '33127',
    country: 'usa',
    scheduled_date: '2025-06-10',
    scheduled_time: '09:00',
    estimated_hours: 4,
    budget_usd: 120,
    budget_max_usd: 150,
    description: 'Move-out cleaning for 2BR/2BA apartment. Must meet leasing office standards.',
    status: 'in_progress',
    created_at: new Date(now - hrs(24)).toISOString(),
  },
];

export const DEMO_COMPLETED_JOBS: JobRequest[] = [
  {
    id: 'job-6',
    client_id: 'client-6',
    title: 'Retail Store Weekly Clean',
    service_type: 'commercial',
    city: 'Doral',
    state: 'FL',
    zip: '33178',
    country: 'usa',
    scheduled_date: '2025-06-05',
    scheduled_time: '07:00',
    estimated_hours: 3,
    budget_usd: 110,
    description: 'Weekly storefront and fitting rooms. Completed on time.',
    status: 'completed',
    created_at: new Date(now - hrs(120)).toISOString(),
  },
];

// ── Provider Documents: mixed statuses ──────────────────────────────────────
export interface DemoDoc {
  key: string;
  label: string;
  status: 'approved' | 'rejected' | 'pending';
  fileName?: string;
  adminNote?: string;
}

export const DEMO_DOCUMENTS: DemoDoc[] = [
  { key: 'w9',               label: 'W-9 Form',                   status: 'approved', fileName: 'w9_form_2024.pdf' },
  { key: 'insurance',        label: 'Certificate of Insurance',   status: 'approved', fileName: 'coi_cleanpro.pdf' },
  { key: 'business_license', label: 'Business License',           status: 'rejected', fileName: 'biz_license.jpg',  adminNote: 'License appears expired (exp. Jan 2024). Please upload a current copy.' },
  { key: 'ein_letter',       label: 'EIN Confirmation Letter',    status: 'pending',  fileName: 'ein_letter.pdf' },
  { key: 'service_agreement',label: 'Signed Service Agreement',   status: 'pending' },
];

// ── Client Requests ──────────────────────────────────────────────────────────
export interface DemoRequest {
  id: string;
  title: string;
  serviceType: 'commercial' | 'residential';
  location: string;
  date: string;
  status: 'open' | 'in_progress' | 'completed';
  budget: string;
  bidsCount: number;
}

export const DEMO_REQUESTS: DemoRequest[] = [
  {
    id: 'req-1',
    title: 'Home Cleaning — Miami Beach',
    serviceType: 'residential',
    location: 'Miami Beach, FL',
    date: 'Jun 16, 2025',
    status: 'open',
    budget: '$80–$120',
    bidsCount: 3,
  },
  {
    id: 'req-2',
    title: 'Office Cleaning — Downtown Miami',
    serviceType: 'commercial',
    location: 'Miami, FL',
    date: 'Jun 20, 2025',
    status: 'open',
    budget: '$150–$200',
    bidsCount: 1,
  },
];

// ── Browse Providers: 4 cards ────────────────────────────────────────────────
export interface DemoProvider {
  id: string;
  name: string;
  type: 'company' | 'independent';
  rating: number;
  reviewCount: number;
  badges: string[];
  serviceType: string;
  location: string;
  priceRange: string;
}

export const DEMO_PROVIDERS: DemoProvider[] = [
  {
    id: 'prov-1',
    name: 'CleanPro Services LLC',
    type: 'company',
    rating: 4.9,
    reviewCount: 87,
    badges: ['identity_verified', 'insured', 'top_rated'],
    serviceType: 'Commercial & Residential',
    location: 'Miami, FL',
    priceRange: '$80–$250/job',
  },
  {
    id: 'prov-2',
    name: 'Maria Gonzalez',
    type: 'independent',
    rating: 4.8,
    reviewCount: 43,
    badges: ['identity_verified', 'background_checked'],
    serviceType: 'Residential',
    location: 'Miami Beach, FL',
    priceRange: '$60–$120/job',
  },
  {
    id: 'prov-3',
    name: 'Sparkle Clean Co.',
    type: 'company',
    rating: 4.7,
    reviewCount: 61,
    badges: ['identity_verified', 'insured'],
    serviceType: 'Commercial',
    location: 'Coral Gables, FL',
    priceRange: '$120–$400/job',
  },
  {
    id: 'prov-4',
    name: 'Juan Carlos Reyes',
    type: 'independent',
    rating: 4.6,
    reviewCount: 29,
    badges: ['identity_verified'],
    serviceType: 'Residential',
    location: 'Doral, FL',
    priceRange: '$55–$100/job',
  },
];

// ── Admin Providers ──────────────────────────────────────────────────────────
export interface AdminProvider {
  id: string;
  name: string;
  type: 'company' | 'independent';
  email: string;
  phone: string;
  location: string;
  serviceType: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  joinedDate: string;
  docsCount: number;
  docsPending: number;
}

export const ADMIN_PROVIDERS: AdminProvider[] = [
  {
    id: 'ap-1',
    name: 'CleanPro Services LLC',
    type: 'company',
    email: 'admin@cleanpro.com',
    phone: '(305) 555-0123',
    location: 'Miami, FL',
    serviceType: 'Commercial & Residential',
    status: 'pending',
    joinedDate: 'May 18, 2025',
    docsCount: 5,
    docsPending: 2,
  },
  {
    id: 'ap-2',
    name: 'Maria Gonzalez',
    type: 'independent',
    email: 'maria.g@email.com',
    phone: '(305) 555-0187',
    location: 'Miami Beach, FL',
    serviceType: 'Residential',
    status: 'approved',
    joinedDate: 'Apr 3, 2025',
    docsCount: 5,
    docsPending: 0,
  },
  {
    id: 'ap-3',
    name: 'Sparkle Clean Co.',
    type: 'company',
    email: 'hello@sparkleclean.com',
    phone: '(786) 555-0042',
    location: 'Coral Gables, FL',
    serviceType: 'Commercial',
    status: 'pending',
    joinedDate: 'May 20, 2025',
    docsCount: 3,
    docsPending: 3,
  },
  {
    id: 'ap-4',
    name: 'Juan Carlos Reyes',
    type: 'independent',
    email: 'jc.reyes@email.com',
    phone: '(305) 555-0091',
    location: 'Doral, FL',
    serviceType: 'Residential',
    status: 'rejected',
    joinedDate: 'May 10, 2025',
    docsCount: 4,
    docsPending: 0,
  },
  {
    id: 'ap-5',
    name: 'Elite Commercial Cleaners',
    type: 'company',
    email: 'ops@eliteclean.com',
    phone: '(786) 555-0218',
    location: 'Hialeah, FL',
    serviceType: 'Commercial',
    status: 'approved',
    joinedDate: 'Mar 15, 2025',
    docsCount: 5,
    docsPending: 0,
  },
];

// ── Admin Document Queue ─────────────────────────────────────────────────────
export interface AdminDocQueue {
  providerId: string;
  providerName: string;
  type: 'company' | 'independent';
  submittedDate: string;
  docs: { label: string; status: 'pending' | 'approved' | 'rejected' }[];
}

export const ADMIN_DOC_QUEUE: AdminDocQueue[] = [
  {
    providerId: 'ap-1',
    providerName: 'CleanPro Services LLC',
    type: 'company',
    submittedDate: 'May 18, 2025',
    docs: [
      { label: 'W-9 Form', status: 'approved' },
      { label: 'Certificate of Insurance', status: 'approved' },
      { label: 'Business License', status: 'pending' },
      { label: 'EIN Letter', status: 'pending' },
      { label: 'Service Agreement', status: 'approved' },
    ],
  },
  {
    providerId: 'ap-3',
    providerName: 'Sparkle Clean Co.',
    type: 'company',
    submittedDate: 'May 20, 2025',
    docs: [
      { label: 'W-9 Form', status: 'pending' },
      { label: 'Certificate of Insurance', status: 'pending' },
      { label: 'Business License', status: 'pending' },
    ],
  },
  {
    providerId: 'ap-4',
    providerName: 'Juan Carlos Reyes',
    type: 'independent',
    submittedDate: 'May 10, 2025',
    docs: [
      { label: 'W-9 Form', status: 'approved' },
      { label: 'Government ID Front', status: 'rejected' },
      { label: 'Government ID Back', status: 'rejected' },
      { label: 'Background Check Consent', status: 'approved' },
    ],
  },
];
