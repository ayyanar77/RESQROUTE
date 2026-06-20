import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { EmergencyRequest, Hospital } from '../types';
import {
  Building2, Bed, Activity, AlertTriangle, CheckCircle2, Clock,
  Users, Stethoscope
} from 'lucide-react';

export default function HospitalDashboard() {
  const { user } = useAuth();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [incoming, setIncoming] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [beds, setBeds] = useState('');
  const [icu, setIcu] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      const { data: hospData } = await supabase
        .from('hospitals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (hospData) {
        setHospital(hospData);
        setBeds(String(hospData.available_beds));
        setIcu(String(hospData.available_icu));
        const { data: reqData } = await supabase
          .from('emergency_requests')
          .select('*, ambulance:ambulances(*)')
          .eq('assigned_hospital_id', hospData.id)
          .in('status', ['en_route', 'picked_up', 'at_hospital'])
          .order('created_at', { ascending: false });
        setIncoming(reqData ?? []);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const updateResources = async () => {
    if (!hospital) return;
    await supabase.from('hospitals').update({
      available_beds: parseInt(beds) || 0,
      available_icu: parseInt(icu) || 0,
    }).eq('id', hospital.id);
    setHospital({ ...hospital, available_beds: parseInt(beds) || 0, available_icu: parseInt(icu) || 0 });
    setEditing(false);
  };

  const severityColor = (s: string) => {
    if (s === 'critical') return 'bg-danger/10 text-danger';
    if (s === 'high') return 'bg-accent/10 text-accent';
    if (s === 'medium') return 'bg-primary/10 text-primary';
    return 'bg-secondary/10 text-secondary';
  };

  if (loading) return <div className="text-text-muted">Loading hospital data...</div>;
  if (!hospital) return (
    <div className="max-w-lg mx-auto bg-surface border border-border rounded-xl p-8 text-center">
      <Building2 className="w-12 h-12 text-text-muted mx-auto mb-4" />
      <h2 className="text-lg font-semibold mb-2">No Hospital Assigned</h2>
      <p className="text-sm text-text-muted">You are not currently linked to a hospital.</p>
    </div>
  );

  const bedPct = hospital.total_beds > 0 ? Math.round((hospital.available_beds / hospital.total_beds) * 100) : 0;
  const icuPct = hospital.total_icu > 0 ? Math.round((hospital.available_icu / hospital.total_icu) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{hospital.name}</h2>
            <p className="text-sm text-text-muted">{hospital.address}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          hospital.status === 'active' ? 'bg-secondary/10 text-secondary' :
          hospital.status === 'full' ? 'bg-danger/10 text-danger' :
          'bg-accent/10 text-accent'
        }`}>
          {hospital.status}
        </div>
      </div>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-text-muted">Available Beds</p>
            <Bed className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold">{hospital.available_beds} <span className="text-sm font-normal text-text-muted">/ {hospital.total_beds}</span></p>
          <div className="w-full h-1.5 bg-surface-light rounded-full mt-2">
            <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${bedPct}%` }} />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-text-muted">Available ICU</p>
            <Activity className="w-4 h-4 text-danger" />
          </div>
          <p className="text-2xl font-bold">{hospital.available_icu} <span className="text-sm font-normal text-text-muted">/ {hospital.total_icu}</span></p>
          <div className="w-full h-1.5 bg-surface-light rounded-full mt-2">
            <div className="h-1.5 bg-danger rounded-full transition-all" style={{ width: `${icuPct}%` }} />
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-text-muted">Incoming Patients</p>
            <Users className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-bold">{incoming.length}</p>
          <p className="text-xs text-text-muted mt-1">En route or at hospital</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-text-muted">Specialties</p>
            <Stethoscope className="w-4 h-4 text-secondary" />
          </div>
          <p className="text-2xl font-bold">{hospital.specialties?.length ?? 0}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {(hospital.specialties ?? []).slice(0, 3).map((s) => (
              <span key={s} className="px-2 py-0.5 bg-secondary/10 text-secondary text-xs rounded-full capitalize">{s}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Update Resources */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Update Resources</h3>
          <button
            onClick={() => editing ? updateResources() : setEditing(true)}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {editing ? 'Save Changes' : 'Edit'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Available Beds</label>
            <input
              type="number"
              value={beds}
              onChange={e => setBeds(e.target.value)}
              disabled={!editing}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Available ICU</label>
            <input
              type="number"
              value={icu}
              onChange={e => setIcu(e.target.value)}
              disabled={!editing}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Incoming Patients */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold">Incoming & Active Patients</h3>
        </div>
        {incoming.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No incoming patients at this time.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="px-6 py-3 font-medium">Patient</th>
                  <th className="px-6 py-3 font-medium">Condition</th>
                  <th className="px-6 py-3 font-medium">Severity</th>
                  <th className="px-6 py-3 font-medium">Ambulance</th>
                  <th className="px-6 py-3 font-medium">ETA</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {incoming.map((req) => (
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
                    <td className="px-6 py-3 text-text-muted">
                      {req.ambulance?.vehicle_number ?? 'TBD'}
                    </td>
                    <td className="px-6 py-3 text-text-muted">
                      {req.eta_minutes ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {req.eta_minutes}m
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        req.status === 'at_hospital' ? 'bg-secondary/10 text-secondary' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {req.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
