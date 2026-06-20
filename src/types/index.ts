export type UserRole = 'user' | 'ambulance_driver' | 'hospital_staff' | 'traffic_officer' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  status: string;
  created_at: string;
}

export interface Ambulance {
  id: string;
  driver_id: string | null;
  vehicle_number: string;
  vehicle_type: string;
  latitude: number | null;
  longitude: number | null;
  status: 'available' | 'busy' | 'offline' | 'maintenance';
  equipment: Record<string, boolean>;
  created_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  total_beds: number;
  available_beds: number;
  total_icu: number;
  available_icu: number;
  specialties: string[];
  contact_phone: string | null;
  status: 'active' | 'inactive' | 'full';
  created_at: string;
}

export type EmergencyStatus = 'pending' | 'assigned' | 'en_route' | 'picked_up' | 'at_hospital' | 'completed' | 'cancelled';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface EmergencyRequest {
  id: string;
  user_id: string;
  patient_name: string;
  patient_age: number | null;
  condition: string;
  severity: Severity;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: EmergencyStatus;
  assigned_ambulance_id: string | null;
  assigned_hospital_id: string | null;
  eta_minutes: number | null;
  created_at: string;
  updated_at: string;
  ambulance?: Ambulance | null;
  hospital?: Hospital | null;
  user?: User | null;
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: string;
  title: string;
  message: string;
  request_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface TrafficNotification {
  id: string;
  officer_id: string | null;
  request_id: string | null;
  route_status: 'pending' | 'cleared' | 'blocked';
  clearance_type: string | null;
  notes: string | null;
  created_at: string;
  request?: EmergencyRequest | null;
}

export interface AnalyticsRecord {
  id: string;
  request_id: string;
  dispatch_time: string | null;
  arrival_time: string | null;
  hospital_arrival_time: string | null;
  response_time_seconds: number | null;
  severity: string | null;
  created_at: string;
}

export interface HospitalAssignment {
  id: string;
  request_id: string;
  hospital_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  assigned_at: string;
  accepted_at: string | null;
}
