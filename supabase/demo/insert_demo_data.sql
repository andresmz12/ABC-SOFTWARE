-- ══════════════════════════════════════════════════════════════════════════════
-- ProVendor · Demo Data — INSERT
-- ══════════════════════════════════════════════════════════════════════════════
-- Purpose : Realistic dataset for a sales / presentation video.
-- Safety  : Every row uses a fixed UUID in the 00000000-0000-0000-0000-00000000XXXX
--           namespace so delete_demo_data.sql can remove them with no side-effects.
-- How to run : Supabase → SQL Editor → paste → Run
--              (Requires service_role access; the SQL editor already has it.)
-- Password   : All demo accounts → Demo@1234
-- ══════════════════════════════════════════════════════════════════════════════
--
-- UUID map
-- ─────────────────────────────────────────────────────────────────
--  CLIENTS
--   ..0001  Sarah Johnson           Atlanta, GA  🇺🇸 (EN)
--   ..0002  Carlos A. Mendoza       Medellín     🇨🇴 (ES)
--   ..0003  Emily Chen              Miami, FL    🇺🇸 (EN)
--  COMPANIES
--   ..0010  Sparkling Clean LLC     Atlanta, GA  🇺🇸
--   ..0011  Limpiezas del Norte SAS Medellín     🇨🇴
--  INDEPENDENTS
--   ..0020  Michael Torres          Miami, FL    🇺🇸
--   ..0021  María Fernanda López    Medellín     🇨🇴
--  ADMIN
--   ..0099  Demo Admin
--  JOB REQUESTS
--   ..0100  open        Sarah / residential / Atlanta
--   ..0101  in_progress Sarah / commercial  / Atlanta  ← Sparkling Clean assigned
--   ..0102  open        Carlos / residential / Medellín
--   ..0103  completed   Emily  / residential / Miami    ← Michael Torres
--   ..0104  completed   Carlos / residential / Medellín ← María Fernanda
--  JOB APPLICATIONS
--   ..0200  job ..0100 ← Michael Torres   (pending)
--   ..0201  job ..0101 ← Sparkling Clean  (accepted)
--   ..0202  job ..0103 ← Michael Torres   (accepted)
--   ..0203  job ..0104 ← María Fernanda   (accepted)
--  DOCUMENTS  ..0401–..0408
--  CHAT       ..0500 (Sarah ↔ Admin)   ..0501 (Emily ↔ Admin)
--  MESSAGES   ..0601–..0606
--  REVIEWS    ..0700 (Emily → Michael 5★)  ..0701 (Carlos → María 4★)
--  NOTIFICATIONS ..0800–..0803
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. AUTH USERS  (required first — all other tables FK here)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change_token_new, email_change,
  is_sso_user, is_anonymous
) VALUES
-- ── Clients ──────────────────────────────────────────────────────────────────
('00000000-0000-0000-0000-000000000000',
 '00000000-0000-0000-0000-000000000001',
 'authenticated', 'authenticated',
 'sarah.johnson.demo@provendor.app',
 crypt('Demo@1234', gen_salt('bf')),
 now(), '{"provider":"email","providers":["email"]}', '{}',
 false, now() - interval '45 days', now(),
 '', '', '', '', false, false),

('00000000-0000-0000-0000-000000000000',
 '00000000-0000-0000-0000-000000000002',
 'authenticated', 'authenticated',
 'carlos.mendoza.demo@provendor.app',
 crypt('Demo@1234', gen_salt('bf')),
 now(), '{"provider":"email","providers":["email"]}', '{}',
 false, now() - interval '38 days', now(),
 '', '', '', '', false, false),

('00000000-0000-0000-0000-000000000000',
 '00000000-0000-0000-0000-000000000003',
 'authenticated', 'authenticated',
 'emily.chen.demo@provendor.app',
 crypt('Demo@1234', gen_salt('bf')),
 now(), '{"provider":"email","providers":["email"]}', '{}',
 false, now() - interval '30 days', now(),
 '', '', '', '', false, false),

-- ── Companies ─────────────────────────────────────────────────────────────────
('00000000-0000-0000-0000-000000000000',
 '00000000-0000-0000-0000-000000000010',
 'authenticated', 'authenticated',
 'info.sparkling.demo@provendor.app',
 crypt('Demo@1234', gen_salt('bf')),
 now(), '{"provider":"email","providers":["email"]}', '{}',
 false, now() - interval '60 days', now(),
 '', '', '', '', false, false),

('00000000-0000-0000-0000-000000000000',
 '00000000-0000-0000-0000-000000000011',
 'authenticated', 'authenticated',
 'limpiezas.norte.demo@provendor.app',
 crypt('Demo@1234', gen_salt('bf')),
 now(), '{"provider":"email","providers":["email"]}', '{}',
 false, now() - interval '55 days', now(),
 '', '', '', '', false, false),

-- ── Independents ──────────────────────────────────────────────────────────────
('00000000-0000-0000-0000-000000000000',
 '00000000-0000-0000-0000-000000000020',
 'authenticated', 'authenticated',
 'michael.torres.demo@provendor.app',
 crypt('Demo@1234', gen_salt('bf')),
 now(), '{"provider":"email","providers":["email"]}', '{}',
 false, now() - interval '50 days', now(),
 '', '', '', '', false, false),

('00000000-0000-0000-0000-000000000000',
 '00000000-0000-0000-0000-000000000021',
 'authenticated', 'authenticated',
 'mfernanda.lopez.demo@provendor.app',
 crypt('Demo@1234', gen_salt('bf')),
 now(), '{"provider":"email","providers":["email"]}', '{}',
 false, now() - interval '48 days', now(),
 '', '', '', '', false, false),

-- ── Admin ─────────────────────────────────────────────────────────────────────
('00000000-0000-0000-0000-000000000000',
 '00000000-0000-0000-0000-000000000099',
 'authenticated', 'authenticated',
 'admin.demo@provendor.app',
 crypt('Demo@1234', gen_salt('bf')),
 now(), '{"provider":"email","providers":["email"]}', '{}',
 false, now() - interval '90 days', now(),
 '', '', '', '', false, false)

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. AUTH IDENTITIES  (enables email login for demo accounts)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES
('00000000-0001-0000-0000-000000000001',
 'sarah.johnson.demo@provendor.app',
 '00000000-0000-0000-0000-000000000001',
 '{"sub":"00000000-0000-0000-0000-000000000001","email":"sarah.johnson.demo@provendor.app","email_verified":true}',
 'email', now(), now(), now()),

('00000000-0001-0000-0000-000000000002',
 'carlos.mendoza.demo@provendor.app',
 '00000000-0000-0000-0000-000000000002',
 '{"sub":"00000000-0000-0000-0000-000000000002","email":"carlos.mendoza.demo@provendor.app","email_verified":true}',
 'email', now(), now(), now()),

('00000000-0001-0000-0000-000000000003',
 'emily.chen.demo@provendor.app',
 '00000000-0000-0000-0000-000000000003',
 '{"sub":"00000000-0000-0000-0000-000000000003","email":"emily.chen.demo@provendor.app","email_verified":true}',
 'email', now(), now(), now()),

('00000000-0001-0000-0000-000000000010',
 'info.sparkling.demo@provendor.app',
 '00000000-0000-0000-0000-000000000010',
 '{"sub":"00000000-0000-0000-0000-000000000010","email":"info.sparkling.demo@provendor.app","email_verified":true}',
 'email', now(), now(), now()),

('00000000-0001-0000-0000-000000000011',
 'limpiezas.norte.demo@provendor.app',
 '00000000-0000-0000-0000-000000000011',
 '{"sub":"00000000-0000-0000-0000-000000000011","email":"limpiezas.norte.demo@provendor.app","email_verified":true}',
 'email', now(), now(), now()),

('00000000-0001-0000-0000-000000000020',
 'michael.torres.demo@provendor.app',
 '00000000-0000-0000-0000-000000000020',
 '{"sub":"00000000-0000-0000-0000-000000000020","email":"michael.torres.demo@provendor.app","email_verified":true}',
 'email', now(), now(), now()),

('00000000-0001-0000-0000-000000000021',
 'mfernanda.lopez.demo@provendor.app',
 '00000000-0000-0000-0000-000000000021',
 '{"sub":"00000000-0000-0000-0000-000000000021","email":"mfernanda.lopez.demo@provendor.app","email_verified":true}',
 'email', now(), now(), now()),

('00000000-0001-0000-0000-000000000099',
 'admin.demo@provendor.app',
 '00000000-0000-0000-0000-000000000099',
 '{"sub":"00000000-0000-0000-0000-000000000099","email":"admin.demo@provendor.app","email_verified":true}',
 'email', now(), now(), now())

ON CONFLICT (provider, provider_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PUBLIC.USERS  (bridge table — role, status, country)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.users (id, email, role, status, country, preferred_language, available) VALUES
-- Clients (auto-approved)
('00000000-0000-0000-0000-000000000001', 'sarah.johnson.demo@provendor.app',        'client',      'approved', 'usa',      'en', false),
('00000000-0000-0000-0000-000000000002', 'carlos.mendoza.demo@provendor.app',        'client',      'approved', 'colombia', 'es', false),
('00000000-0000-0000-0000-000000000003', 'emily.chen.demo@provendor.app',            'client',      'approved', 'usa',      'en', false),
-- Providers (pre-approved for demo)
('00000000-0000-0000-0000-000000000010', 'info.sparkling.demo@provendor.app',        'company',     'approved', 'usa',      'en', true),
('00000000-0000-0000-0000-000000000011', 'limpiezas.norte.demo@provendor.app',       'company',     'approved', 'colombia', 'es', true),
('00000000-0000-0000-0000-000000000020', 'michael.torres.demo@provendor.app',        'independent', 'approved', 'usa',      'en', true),
('00000000-0000-0000-0000-000000000021', 'mfernanda.lopez.demo@provendor.app',       'independent', 'approved', 'colombia', 'es', true),
-- Admin
('00000000-0000-0000-0000-000000000099', 'admin.demo@provendor.app',                 'admin',       'approved', 'usa',      'en', false)
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CLIENTS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO clients (user_id, full_name, phone, address, city, state, zip, country, preferred_language, status) VALUES

('00000000-0000-0000-0000-000000000001',
 'Sarah Johnson',
 '+1 (404) 555-0182',
 '245 Peachtree St NE, Apt 8B',
 'Atlanta', 'GA', '30303', 'usa', 'en', 'approved'),

('00000000-0000-0000-0000-000000000002',
 'Carlos Andrés Mendoza',
 '+57 312 456 7890',
 'Calle 10 #43D-10, El Poblado',
 'Medellín', 'Antioquia', '050022', 'colombia', 'es', 'approved'),

('00000000-0000-0000-0000-000000000003',
 'Emily Chen',
 '+1 (305) 555-0247',
 '1800 Brickell Ave, Unit 2204',
 'Miami', 'FL', '33129', 'usa', 'en', 'approved')

ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. COMPANIES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO companies (user_id, company_name, ein, phone, address, city, state, zip, service_type, country, preferred_language, status, available) VALUES

('00000000-0000-0000-0000-000000000010',
 'Sparkling Clean LLC',
 '82-4521637',
 '+1 (678) 555-0391',
 '890 Marietta St NW, Suite 201',
 'Atlanta', 'GA', '30318',
 'both', 'usa', 'en', 'approved', true),

('00000000-0000-0000-0000-000000000011',
 'Limpiezas del Norte S.A.S.',
 '901.234.567-8',
 '+57 314 789 0123',
 'Cra 65 #98-35, Laureles',
 'Medellín', 'Antioquia', '050034',
 'both', 'colombia', 'es', 'approved', true)

ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. INDEPENDENTS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO independents (user_id, full_name, phone, address, city, state, zip, date_of_birth, service_type, identity_verified, country, preferred_language, status, available) VALUES

('00000000-0000-0000-0000-000000000020',
 'Michael Torres',
 '+1 (786) 555-0419',
 '3201 SW 27th Ave, Apt 5',
 'Miami', 'FL', '33133',
 '1989-04-17', 'residential',
 true, 'usa', 'en', 'approved', true),

('00000000-0000-0000-0000-000000000021',
 'María Fernanda López',
 '+57 317 234 5678',
 'Calle 34 #74-55, Suramericana',
 'Medellín', 'Antioquia', '050030',
 '1992-09-03', 'both',
 true, 'colombia', 'es', 'approved', true)

ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ADMINS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO admins (id, email) VALUES
('00000000-0000-0000-0000-000000000099', 'admin.demo@provendor.app')
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SERVICE AREAS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO service_areas (provider_id, provider_type, state, city) VALUES
-- Sparkling Clean LLC — metro Atlanta
('00000000-0000-0000-0000-000000000010', 'company',     'GA',        'Atlanta'),
('00000000-0000-0000-0000-000000000010', 'company',     'GA',        'Marietta'),
('00000000-0000-0000-0000-000000000010', 'company',     'GA',        'Decatur'),
-- Limpiezas del Norte — área metropolitana Medellín
('00000000-0000-0000-0000-000000000011', 'company',     'Antioquia', 'Medellín'),
('00000000-0000-0000-0000-000000000011', 'company',     'Antioquia', 'Envigado'),
('00000000-0000-0000-0000-000000000011', 'company',     'Antioquia', 'Bello'),
-- Michael Torres — Miami-Dade
('00000000-0000-0000-0000-000000000020', 'independent', 'FL',        'Miami'),
('00000000-0000-0000-0000-000000000020', 'independent', 'FL',        'Hialeah'),
-- María Fernanda López — Medellín
('00000000-0000-0000-0000-000000000021', 'independent', 'Antioquia', 'Medellín'),
('00000000-0000-0000-0000-000000000021', 'independent', 'Antioquia', 'Itagüí')
;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. DOCUMENTS  (all pre-approved for demo)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO documents (id, user_id, doc_type, file_name, file_url, status, reviewed_by, reviewed_at) VALUES

-- Sparkling Clean LLC
('00000000-0000-0000-0000-000000000401',
 '00000000-0000-0000-0000-000000000010',
 'business_license',
 'sparkling_clean_business_license.pdf',
 'https://pnmxsonnfdgbwtvkwfhj.supabase.co/storage/v1/object/public/documents/demo/sparkling_business_license.pdf',
 'approved', '00000000-0000-0000-0000-000000000099', now() - interval '55 days'),

('00000000-0000-0000-0000-000000000402',
 '00000000-0000-0000-0000-000000000010',
 'liability_insurance',
 'sparkling_clean_insurance_certificate.pdf',
 'https://pnmxsonnfdgbwtvkwfhj.supabase.co/storage/v1/object/public/documents/demo/sparkling_insurance.pdf',
 'approved', '00000000-0000-0000-0000-000000000099', now() - interval '55 days'),

-- Limpiezas del Norte S.A.S.
('00000000-0000-0000-0000-000000000403',
 '00000000-0000-0000-0000-000000000011',
 'rut',
 'limpiezas_norte_rut.pdf',
 'https://pnmxsonnfdgbwtvkwfhj.supabase.co/storage/v1/object/public/documents/demo/limpiezas_rut.pdf',
 'approved', '00000000-0000-0000-0000-000000000099', now() - interval '50 days'),

('00000000-0000-0000-0000-000000000404',
 '00000000-0000-0000-0000-000000000011',
 'camara_comercio',
 'limpiezas_norte_camara_comercio.pdf',
 'https://pnmxsonnfdgbwtvkwfhj.supabase.co/storage/v1/object/public/documents/demo/limpiezas_camara.pdf',
 'approved', '00000000-0000-0000-0000-000000000099', now() - interval '50 days'),

-- Michael Torres
('00000000-0000-0000-0000-000000000405',
 '00000000-0000-0000-0000-000000000020',
 'government_id',
 'michael_torres_drivers_license.pdf',
 'https://pnmxsonnfdgbwtvkwfhj.supabase.co/storage/v1/object/public/documents/demo/michael_id.pdf',
 'approved', '00000000-0000-0000-0000-000000000099', now() - interval '46 days'),

('00000000-0000-0000-0000-000000000406',
 '00000000-0000-0000-0000-000000000020',
 'background_check',
 'michael_torres_background_check.pdf',
 'https://pnmxsonnfdgbwtvkwfhj.supabase.co/storage/v1/object/public/documents/demo/michael_background.pdf',
 'approved', '00000000-0000-0000-0000-000000000099', now() - interval '46 days'),

-- María Fernanda López
('00000000-0000-0000-0000-000000000407',
 '00000000-0000-0000-0000-000000000021',
 'cedula',
 'maria_fernanda_cedula.pdf',
 'https://pnmxsonnfdgbwtvkwfhj.supabase.co/storage/v1/object/public/documents/demo/mfernanda_cedula.pdf',
 'approved', '00000000-0000-0000-0000-000000000099', now() - interval '44 days'),

('00000000-0000-0000-0000-000000000408',
 '00000000-0000-0000-0000-000000000021',
 'antecedentes_penales',
 'maria_fernanda_antecedentes.pdf',
 'https://pnmxsonnfdgbwtvkwfhj.supabase.co/storage/v1/object/public/documents/demo/mfernanda_antecedentes.pdf',
 'approved', '00000000-0000-0000-0000-000000000099', now() - interval '44 days')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. JOB REQUESTS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO job_requests (id, client_id, service_type, city, state, zip, country,
  scheduled_date, scheduled_time, estimated_hours, budget_usd, budget_cop,
  description, status, created_at) VALUES

-- 🟢 OPEN — Sarah, residential, Atlanta
('00000000-0000-0000-0000-000000000100',
 '00000000-0000-0000-0000-000000000001',
 'residential', 'Atlanta', 'GA', '30303', 'usa',
 (current_date + 7)::date, '09:00:00', 3.0, 150.00, null,
 'Weekly cleaning for a 3-bed/2-bath apartment. Prefer eco-friendly products. Pet-friendly home — we have a golden retriever.',
 'open', now() - interval '2 days'),

-- 🔵 IN PROGRESS — Sarah, commercial, Atlanta (Sparkling Clean assigned)
('00000000-0000-0000-0000-000000000101',
 '00000000-0000-0000-0000-000000000001',
 'commercial', 'Atlanta', 'GA', '30318', 'usa',
 current_date::date, '08:00:00', 6.0, 480.00, null,
 'Office deep clean — 4,500 sq ft open floor plan. Restrooms, kitchen, conference rooms. Needs to be done before Monday morning meeting.',
 'in_progress', now() - interval '10 days'),

-- 🟢 OPEN — Carlos, residential, Medellín
('00000000-0000-0000-0000-000000000102',
 '00000000-0000-0000-0000-000000000002',
 'residential', 'Medellín', 'Antioquia', '050022', 'colombia',
 (current_date + 5)::date, '10:00:00', 2.5, null, 220000.00,
 'Limpieza quincenal apartamento 2 habitaciones, sala-comedor y 2 baños. Edificio con vigilancia, preguntar por Carlos en portería.',
 'open', now() - interval '1 day'),

-- ✅ COMPLETED — Emily, residential, Miami (Michael Torres)
('00000000-0000-0000-0000-000000000103',
 '00000000-0000-0000-0000-000000000003',
 'residential', 'Miami', 'FL', '33129', 'usa',
 (current_date - 14)::date, '10:00:00', 4.0, 200.00, null,
 'Move-out deep cleaning for a 2-bed/2-bath condo. Unit must be spotless for final inspection. Include appliances, inside cabinets, and balcony.',
 'completed', now() - interval '20 days'),

-- ✅ COMPLETED — Carlos, residential, Medellín (María Fernanda)
('00000000-0000-0000-0000-000000000104',
 '00000000-0000-0000-0000-000000000002',
 'residential', 'Medellín', 'Antioquia', '050022', 'colombia',
 (current_date - 21)::date, '14:00:00', 3.0, null, 280000.00,
 'Limpieza general de apartamento antes de visita familiar. Incluir cocina, baños, habitaciones y sala. Materiales de limpieza incluidos.',
 'completed', now() - interval '28 days')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. JOB APPLICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO job_applications (id, job_request_id, provider_id, provider_type,
  bid_amount_usd, bid_amount_cop, message, status, applied_at) VALUES

-- Michael Torres applies to Sarah's open residential job (pending)
('00000000-0000-0000-0000-000000000200',
 '00000000-0000-0000-0000-000000000100',
 '00000000-0000-0000-0000-000000000020',
 'independent',
 140.00, null,
 'Hi Sarah! I have 6 years of residential cleaning experience in Miami and Atlanta. I use eco-friendly, pet-safe products and I''m great with dogs. I can start this Friday if needed.',
 'pending', now() - interval '1 day'),

-- Sparkling Clean applies to Sarah's commercial job (accepted — now in_progress)
('00000000-0000-0000-0000-000000000201',
 '00000000-0000-0000-0000-000000000101',
 '00000000-0000-0000-0000-000000000010',
 'company',
 460.00, null,
 'Sparkling Clean has serviced 40+ offices in the Atlanta metro area. Our team of 4 professionals will complete your 4,500 sq ft office efficiently. We bring all equipment and guarantee a spotless result before your Monday meeting.',
 'accepted', now() - interval '9 days'),

-- Michael Torres applied to Emily's residential job (accepted — now completed)
('00000000-0000-0000-0000-000000000202',
 '00000000-0000-0000-0000-000000000103',
 '00000000-0000-0000-0000-000000000020',
 'independent',
 190.00, null,
 'Move-out cleanings are my specialty — I know exactly what landlords and inspectors look for. I''ll handle every detail including inside the oven, refrigerator, and all cabinets.',
 'accepted', now() - interval '19 days'),

-- María Fernanda applies to Carlos's residential job (accepted — completed)
('00000000-0000-0000-0000-000000000203',
 '00000000-0000-0000-0000-000000000104',
 '00000000-0000-0000-0000-000000000021',
 'independent',
 null, 265000.00,
 'Hola Carlos, tengo más de 5 años de experiencia en limpieza residencial en El Poblado y Laureles. Cuento con todos los implementos necesarios y trabajo con productos de alta calidad. Puedo ajustarme a tu horario.',
 'accepted', now() - interval '27 days')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. REVIEWS  (only for completed jobs)
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Column names depend on which migration ran first.
-- This uses reviewer_id / reviewee_id (001_initial_schema) + job_request_id.
-- If your DB has client_id / provider_id / job_id (012_chats_reviews), adjust below.

INSERT INTO reviews (id, job_request_id, reviewer_id, reviewee_id, rating, comment, created_at) VALUES

-- Emily → Michael Torres — 5 stars
('00000000-0000-0000-0000-000000000700',
 '00000000-0000-0000-0000-000000000103',
 '00000000-0000-0000-0000-000000000003',   -- Emily (reviewer)
 '00000000-0000-0000-0000-000000000020',   -- Michael Torres (reviewee)
 5,
 'Michael did an incredible job with the move-out clean. The apartment looked brand new — the inspector approved everything on the first visit. Highly professional, arrived on time, and communicated throughout. Will definitely hire again!',
 now() - interval '13 days'),

-- Carlos → María Fernanda López — 4 stars
('00000000-0000-0000-0000-000000000701',
 '00000000-0000-0000-0000-000000000104',
 '00000000-0000-0000-0000-000000000002',   -- Carlos (reviewer)
 '00000000-0000-0000-0000-000000000021',   -- María Fernanda (reviewee)
 4,
 'Excelente trabajo, el apartamento quedó impecable. María Fernanda es muy puntual y detallista. Le doy 4 estrellas porque se tardó un poco más de lo estimado, pero el resultado final superó mis expectativas.',
 now() - interval '20 days')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. SUPPORT CHATS  (chats and messages reference auth.users directly)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO chats (id, admin_id, user_id, user_type, created_at) VALUES
('00000000-0000-0000-0000-000000000500',
 '00000000-0000-0000-0000-000000000099',
 '00000000-0000-0000-0000-000000000001',
 'client', now() - interval '5 days'),

('00000000-0000-0000-0000-000000000501',
 '00000000-0000-0000-0000-000000000099',
 '00000000-0000-0000-0000-000000000003',
 'client', now() - interval '12 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, chat_id, sender_id, content, read, created_at) VALUES

-- Sarah ↔ Admin
('00000000-0000-0000-0000-000000000601',
 '00000000-0000-0000-0000-000000000500',
 '00000000-0000-0000-0000-000000000001',
 'Hi! I just hired Sparkling Clean for my office and wanted to ask — can I request the same team every week if I set up recurring service?',
 true, now() - interval '5 days'),

('00000000-0000-0000-0000-000000000602',
 '00000000-0000-0000-0000-000000000500',
 '00000000-0000-0000-0000-000000000099',
 'Hi Sarah! Absolutely — when you book recurring services you can indicate your preferred provider in the job description. The platform will prioritize providers you''ve already worked with. Is there anything else I can help you with?',
 true, now() - interval '5 days' + interval '10 minutes'),

('00000000-0000-0000-0000-000000000603',
 '00000000-0000-0000-0000-000000000500',
 '00000000-0000-0000-0000-000000000001',
 'Perfect, that''s great to know! Thanks so much.',
 true, now() - interval '5 days' + interval '18 minutes'),

-- Emily ↔ Admin
('00000000-0000-0000-0000-000000000604',
 '00000000-0000-0000-0000-000000000501',
 '00000000-0000-0000-0000-000000000003',
 'Hello, I''d like to leave a tip for Michael Torres for his excellent work on my move-out clean. Is that possible through the app?',
 true, now() - interval '12 days'),

('00000000-0000-0000-0000-000000000605',
 '00000000-0000-0000-0000-000000000501',
 '00000000-0000-0000-0000-000000000099',
 'Hi Emily! We''re so glad Michael exceeded your expectations. In-app tipping is on our roadmap for the next release. For now, you can leave him a stellar review — that''s the best way to support independent providers on ProVendor. Thank you for being an amazing client!',
 true, now() - interval '12 days' + interval '15 minutes'),

('00000000-0000-0000-0000-000000000606',
 '00000000-0000-0000-0000-000000000501',
 '00000000-0000-0000-0000-000000000003',
 'Done! I left him a 5-star review. Looking forward to using ProVendor for my new place too.',
 true, now() - interval '12 days' + interval '22 minutes')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 14. NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO notifications (id, user_id, title_en, title_es, body_en, body_es, type, read, created_at) VALUES

-- Sarah: new offer on her open residential job
('00000000-0000-0000-0000-000000000800',
 '00000000-0000-0000-0000-000000000001',
 'New offer on your cleaning request',
 'Nueva oferta en tu solicitud de limpieza',
 'Michael Torres sent you an offer of $140 for your residential cleaning on Peachtree St.',
 'Michael Torres te envió una oferta de $140 para tu limpieza residencial en Peachtree St.',
 'new_offer', false, now() - interval '1 day'),

-- Sparkling Clean: account approved
('00000000-0000-0000-0000-000000000801',
 '00000000-0000-0000-0000-000000000010',
 'Account Approved 🎉',
 'Cuenta Aprobada 🎉',
 'Congratulations! Sparkling Clean LLC is now approved on ProVendor. You can start browsing and applying to cleaning jobs right away.',
 '¡Felicitaciones! Sparkling Clean LLC ya está aprobado en ProVendor. Ya puedes explorar y aplicar a trabajos de limpieza.',
 'account_update', true, now() - interval '55 days'),

-- Michael Torres: account approved
('00000000-0000-0000-0000-000000000802',
 '00000000-0000-0000-0000-000000000020',
 'Account Approved 🎉',
 'Cuenta Aprobada 🎉',
 'Your ProVendor account has been approved! Start browsing open jobs in Miami and grow your business.',
 'Tu cuenta de ProVendor ha sido aprobada. Empieza a explorar trabajos disponibles en Miami.',
 'account_update', true, now() - interval '46 days'),

-- Emily: her job was completed
('00000000-0000-0000-0000-000000000803',
 '00000000-0000-0000-0000-000000000003',
 'Job Completed — Leave a Review',
 'Trabajo Completado — Deja tu Reseña',
 'Michael Torres has marked your move-out cleaning as complete. How did it go? Leave a review to help others.',
 'Michael Torres marcó tu limpieza de mudanza como completada. ¿Cómo estuvo? Deja una reseña para ayudar a otros.',
 'job_completed', true, now() - interval '14 days')

ON CONFLICT (id) DO NOTHING;


COMMIT;

-- ══════════════════════════════════════════════════════════════════════════════
-- ✅  Done! To remove all demo data run: delete_demo_data.sql
-- ══════════════════════════════════════════════════════════════════════════════
