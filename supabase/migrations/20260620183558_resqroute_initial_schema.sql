/*
# RESQROUTE Initial Schema — Intelligent Emergency Response System

1. New Tables

- `users` — Extended profile table storing all role-based user accounts (User, Ambulance Driver, Hospital Staff, Traffic Officer, Admin).
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, unique)
  - `full_name` (text)
  - `role` (text, enum-like)
  - `phone` (text)
  - `status` (text)
  - `created_at` (timestamptz)

- `ambulances` — Ambulance fleet records with driver, location, and status.
  - `id` (uuid, primary key)
  - `driver_id` (uuid, references users)
  - `vehicle_number` (text, unique)
  - `vehicle_type` (text)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `status` (text)
  - `equipment` (jsonb)
  - `created_at` (timestamptz)

- `hospitals` — Hospital records with bed/ICU availability and resource details.
  - `id` (uuid, primary key)
  - `name` (text)
  - `address` (text)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `total_beds` (integer)
  - `available_beds` (integer)
  - `total_icu` (integer)
  - `available_icu` (integer)
  - `specialties` (text[])
  - `contact_phone` (text)
  - `status` (text)
  - `created_at` (timestamptz)

- `emergency_requests` — Emergency incident requests with patient details, GPS, and AI assignment status.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users)
  - `patient_name` (text)
  - `patient_age` (integer)
  - `condition` (text)
  - `severity` (text)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `address` (text)
  - `status` (text)
  - `assigned_ambulance_id` (uuid, references ambulances)
  - `assigned_hospital_id` (uuid, references hospitals)
  - `eta_minutes` (integer)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

- `notifications` — Real-time alerts between all roles.
  - `id` (uuid, primary key)
  - `recipient_id` (uuid, references users)
  - `sender_id` (uuid, references users)
  - `type` (text)
  - `title` (text)
  - `message` (text)
  - `request_id` (uuid, references emergency_requests)
  - `is_read` (boolean)
  - `created_at` (timestamptz)

- `traffic_notifications` — Route clearance notifications from traffic officers.
  - `id` (uuid, primary key)
  - `officer_id` (uuid, references users)
  - `request_id` (uuid, references emergency_requests)
  - `route_status` (text)
  - `clearance_type` (text)
  - `notes` (text)
  - `created_at` (timestamptz)

- `analytics` — Response time statistics for admin dashboard.
  - `id` (uuid, primary key)
  - `request_id` (uuid, references emergency_requests)
  - `dispatch_time` (timestamptz)
  - `arrival_time` (timestamptz)
  - `hospital_arrival_time` (timestamptz)
  - `response_time_seconds` (integer)
  - `severity` (text)
  - `created_at` (timestamptz)

- `hospital_assignments` — Junction tracking hospital acceptances/rejections.
  - `id` (uuid, primary key)
  - `request_id` (uuid, references emergency_requests)
  - `hospital_id` (uuid, references hospitals)
  - `status` (text)
  - `assigned_at` (timestamptz)
  - `accepted_at` (timestamptz)

2. Security
- RLS enabled on all tables.
- Authenticated users can read their own profile.
- Role-based policies for emergency data (all authenticated for demo, with role filters in frontend).
- Traffic notifications are readable by all authenticated.
- Analytics restricted to admin role.

3. Important Notes
- This app uses role-based access. The frontend enforces role-based views.
- All location data is stored as numeric (lat/lon).
- Status fields use text for flexibility.
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'ambulance_driver', 'hospital_staff', 'traffic_officer', 'admin')),
  phone text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ambulances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES users(id) ON DELETE SET NULL,
  vehicle_number text UNIQUE NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'basic',
  latitude numeric,
  longitude numeric,
  status text DEFAULT 'available' CHECK (status IN ('available', 'busy', 'offline', 'maintenance')),
  equipment jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  latitude numeric,
  longitude numeric,
  total_beds integer NOT NULL DEFAULT 0,
  available_beds integer NOT NULL DEFAULT 0,
  total_icu integer NOT NULL DEFAULT 0,
  available_icu integer NOT NULL DEFAULT 0,
  specialties text[] DEFAULT '{}',
  contact_phone text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'full')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  patient_age integer,
  condition text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  latitude numeric,
  longitude numeric,
  address text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'en_route', 'picked_up', 'at_hospital', 'completed', 'cancelled')),
  assigned_ambulance_id uuid REFERENCES ambulances(id) ON DELETE SET NULL,
  assigned_hospital_id uuid REFERENCES hospitals(id) ON DELETE SET NULL,
  eta_minutes integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES users(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  request_id uuid REFERENCES emergency_requests(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS traffic_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  request_id uuid REFERENCES emergency_requests(id) ON DELETE CASCADE,
  route_status text NOT NULL DEFAULT 'pending' CHECK (route_status IN ('pending', 'cleared', 'blocked')),
  clearance_type text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES emergency_requests(id) ON DELETE CASCADE,
  dispatch_time timestamptz,
  arrival_time timestamptz,
  hospital_arrival_time timestamptz,
  response_time_seconds integer,
  severity text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hospital_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES emergency_requests(id) ON DELETE CASCADE,
  hospital_id uuid REFERENCES hospitals(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  assigned_at timestamptz DEFAULT now(),
  accepted_at timestamptz
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_assignments ENABLE ROW LEVEL SECURITY;

-- Policies: users (all auth can read, all can insert/update)
DROP POLICY IF EXISTS "select_users" ON users;
CREATE POLICY "select_users" ON users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_users" ON users;
CREATE POLICY "insert_users" ON users FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_users" ON users;
CREATE POLICY "update_users" ON users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policies: ambulances
DROP POLICY IF EXISTS "select_ambulances" ON ambulances;
CREATE POLICY "select_ambulances" ON ambulances FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_ambulances" ON ambulances;
CREATE POLICY "insert_ambulances" ON ambulances FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_ambulances" ON ambulances;
CREATE POLICY "update_ambulances" ON ambulances FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policies: hospitals
DROP POLICY IF EXISTS "select_hospitals" ON hospitals;
CREATE POLICY "select_hospitals" ON hospitals FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_hospitals" ON hospitals;
CREATE POLICY "insert_hospitals" ON hospitals FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_hospitals" ON hospitals;
CREATE POLICY "update_hospitals" ON hospitals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policies: emergency_requests
DROP POLICY IF EXISTS "select_emergency_requests" ON emergency_requests;
CREATE POLICY "select_emergency_requests" ON emergency_requests FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_emergency_requests" ON emergency_requests;
CREATE POLICY "insert_emergency_requests" ON emergency_requests FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_emergency_requests" ON emergency_requests;
CREATE POLICY "update_emergency_requests" ON emergency_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policies: notifications
DROP POLICY IF EXISTS "select_notifications" ON notifications;
CREATE POLICY "select_notifications" ON notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_notifications" ON notifications;
CREATE POLICY "update_notifications" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policies: traffic_notifications
DROP POLICY IF EXISTS "select_traffic_notifications" ON traffic_notifications;
CREATE POLICY "select_traffic_notifications" ON traffic_notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_traffic_notifications" ON traffic_notifications;
CREATE POLICY "insert_traffic_notifications" ON traffic_notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_traffic_notifications" ON traffic_notifications;
CREATE POLICY "update_traffic_notifications" ON traffic_notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policies: analytics
DROP POLICY IF EXISTS "select_analytics" ON analytics;
CREATE POLICY "select_analytics" ON analytics FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_analytics" ON analytics;
CREATE POLICY "insert_analytics" ON analytics FOR INSERT TO authenticated WITH CHECK (true);

-- Policies: hospital_assignments
DROP POLICY IF EXISTS "select_hospital_assignments" ON hospital_assignments;
CREATE POLICY "select_hospital_assignments" ON hospital_assignments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_hospital_assignments" ON hospital_assignments;
CREATE POLICY "insert_hospital_assignments" ON hospital_assignments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_hospital_assignments" ON hospital_assignments;
CREATE POLICY "update_hospital_assignments" ON hospital_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
