import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { EmergencyRequest, Ambulance, Hospital, Notification } from '../types';
import {
  Activity, AlertTriangle, Ambulance as AmbIcon, Building2, Users,
  CheckCircle2
} from 'lucide-react';

export default function Dashboard() {
  const { role } = useAuth();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from('emergency_requests').select('*, ambulance:ambulances(*), hospital:hospitals(*)').order('created_at', { ascending: false }).limit(10),
        supabase.from('ambulances').select('*'),
        supabase.from('hospitals').select('*'),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(5),
      ]);
      if (!r1.error) setRequests(r1.data ?? []);
      if (!r2.error) setAmbulances(r2.data ?? []);
      if (!r3.error) setHospitals(r3.data ?? []);
      if (!r4.error) setNotifications(r4.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const pending = requests.filter(r => r.status === 'pending').length;
  const active = requests.filter(r => ['en_route', 'picked_up', 'at_hospital'].includes(r.status)).length;
  const completed = requests.filter(r => r.status === 'completed').length;
  const availableAmb = ambulances.filter(a => a.status === 'available').length;
  const totalBeds = hospitals.reduce((s, h) => s + h.available_beds, 0);
  const totalIcu = hospitals.reduce((s, h) => s + h.available_icu, 0);

  const stats = [
    { label: 'Pending Emergencies', value: pending, icon: <AlertTriangle className="w-5 h-5 text-accent" />, trend: 'active now' },
    { label: 'Active Responses', value: active, icon: <Activity className="w-5 h-5 text-primary" />, trend: 'in progress' },
    { label: 'Completed Today', value: completed, icon: <CheckCircle2 className="w-5 h-5 text-secondary" />, trend: 'resolved' },
    { label: 'Available Ambulances', value: availableAmb, icon: <AmbIcon className="w-5 h-5 text-primary-light" />, trend: 'ready' },
    { label: 'Available Beds', value: totalBeds, icon: <Building2 className="w-5 h-5 text-secondary" />, trend: 'hospitals' },
    { label: 'Available ICU', value: totalIcu, icon: <Users className="w-5 h-5 text-danger" />, trend: 'critical care' },
  ];

  const severityColor = (s: string) => {
    if (s === 'critical') return 'bg-danger/10 text-danger';
    if (s === 'high') return 'bg-accent/10 text-accent';
    if (s === 'medium') return 'bg-primary/10 text-primary';
    return 'bg-secondary/10 text-secondary';
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return 'bg-secondary/10 text-secondary';
    if (s === 'pending') return 'bg-accent/10 text-accent';
    return 'bg-primary/10 text-primary';
  };

  if (loading) return <div className="text-text-muted">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-text-muted text-sm">Welcome back — here's your overview</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium capitalize">{role?.replace('_', ' ')}</p>
          <p className="text-xs text-text-muted">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-bg flex items-center justify-center">{s.icon}</div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Emergencies */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">Recent Emergency Requests</h3>
            <span className="text-xs text-text-muted">{requests.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="px-6 py-3 font-medium">Patient</th>
                  <th className="px-6 py-3 font-medium">Condition</th>
                  <th className="px-6 py-3 font-medium">Severity</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">ETA</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 6).map((req) => (
                  <tr key={req.id} className="border-b border-border last:border-0 hover:bg-surface-light/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="font-medium">{req.patient_name}</div>
                      <div className="text-xs text-text-muted">{req.patient_age} yrs</div>
                    </td>
                    <td className="px-6 py-3 text-text-muted max-w-xs truncate">{req.condition}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${severityColor(req.severity)}`}>
                        <AlertTriangle className="w-3 h-3" /> {req.severity}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor(req.status)}`}>
                        {req.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-text-muted">
                      {req.eta_minutes ? `${req.eta_minutes}m` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications & Quick Info */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold">Recent Notifications</h3>
            </div>
            <div className="p-4 space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${n.is_read ? 'border-border/50 bg-surface-light/30' : 'border-primary/20 bg-primary/5'}`}>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-text-muted line-clamp-2">{n.message}</p>
                    <p className="text-xs text-text-muted mt-1">{new Date(n.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold">Hospital Status</h3>
            </div>
            <div className="p-4 space-y-3">
              {hospitals.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-light transition-colors">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-text-muted" />
                    <span className="text-sm font-medium">{h.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`px-2 py-0.5 rounded-full ${h.available_beds > 0 ? 'bg-secondary/10 text-secondary' : 'bg-danger/10 text-danger'}`}>
                      {h.available_beds} beds
                    </span>
                    <span className={`px-2 py-0.5 rounded-full ${h.available_icu > 0 ? 'bg-secondary/10 text-secondary' : 'bg-danger/10 text-danger'}`}>
                      {h.available_icu} ICU
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
