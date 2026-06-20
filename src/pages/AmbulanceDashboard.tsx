import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { EmergencyRequest, Ambulance } from '../types';
import {
  Ambulance as AmbulanceIcon, MapPin, Navigation, CheckCircle2, Clock,
  AlertTriangle, Activity, ChevronRight, CircleDot
} from 'lucide-react';

export default function AmbulanceDashboard() {
  const { user } = useAuth();
  const [myAmbulance, setMyAmbulance] = useState<Ambulance | null>(null);
  const [assignedRequests, setAssignedRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      const { data: ambData } = await supabase
        .from('ambulances')
        .select('*')
        .eq('driver_id', user.id)
        .maybeSingle();
      if (ambData) {
        setMyAmbulance(ambData);
        const { data: reqData } = await supabase
          .from('emergency_requests')
          .select('*, hospital:hospitals(*)')
          .eq('assigned_ambulance_id', ambData.id)
          .in('status', ['assigned', 'en_route', 'picked_up'])
          .order('created_at', { ascending: false });
        setAssignedRequests(reqData ?? []);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const updateStatus = async (requestId: string, newStatus: string) => {
    setUpdating(true);
    await supabase.from('emergency_requests').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', requestId);
    const { data: reqData } = await supabase
      .from('emergency_requests')
      .select('*, hospital:hospitals(*)')
      .eq('assigned_ambulance_id', myAmbulance?.id)
      .in('status', ['assigned', 'en_route', 'picked_up', 'at_hospital'])
      .order('created_at', { ascending: false });
    setAssignedRequests(reqData ?? []);
    setUpdating(false);
  };

  const updateAmbulanceStatus = async (status: string) => {
    if (!myAmbulance) return;
    await supabase.from('ambulances').update({ status }).eq('id', myAmbulance.id);
    setMyAmbulance({ ...myAmbulance, status: status as Ambulance['status'] });
  };

  const statusFlow = ['assigned', 'en_route', 'picked_up', 'at_hospital'];
  const nextStatus = (current: string) => {
    const idx = statusFlow.indexOf(current);
    return idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  };

  const statusLabel = (s: string) => {
    const labels: Record<string, string> = {
      assigned: 'Assigned',
      en_route: 'En Route to Patient',
      picked_up: 'Patient Picked Up',
      at_hospital: 'At Hospital',
    };
    return labels[s] ?? s;
  };

  if (loading) return <div className="text-text-muted">Loading ambulance data...</div>;
  if (!myAmbulance) return (
    <div className="max-w-lg mx-auto bg-surface border border-border rounded-xl p-8 text-center">
      <AmbulanceIcon className="w-12 h-12 text-text-muted mx-auto mb-4" />
      <h2 className="text-lg font-semibold mb-2">No Ambulance Assigned</h2>
      <p className="text-sm text-text-muted">You are not currently assigned to any ambulance vehicle.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <AmbulanceIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Ambulance Dashboard</h2>
            <p className="text-sm text-text-muted">{myAmbulance.vehicle_number} — {myAmbulance.vehicle_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
            myAmbulance.status === 'available' ? 'bg-secondary/10 text-secondary' :
            myAmbulance.status === 'busy' ? 'bg-primary/10 text-primary' :
            'bg-accent/10 text-accent'
          }`}>
            {myAmbulance.status}
          </span>
          {myAmbulance.status === 'busy' && (
            <button
              onClick={() => updateAmbulanceStatus('available')}
              className="px-3 py-1 text-xs bg-secondary/10 text-secondary rounded-full hover:bg-secondary/20 transition-colors"
            >
              Mark Available
            </button>
          )}
        </div>
      </div>

      {/* Ambulance Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted mb-1">Vehicle Type</p>
          <p className="text-lg font-semibold capitalize">{myAmbulance.vehicle_type}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted mb-1">Equipment</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(myAmbulance.equipment ?? {}).filter(([, v]) => v).map(([k]) => (
              <span key={k} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full capitalize">{k}</span>
            ))}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted mb-1">Location</p>
          <p className="text-sm font-medium">
            {myAmbulance.latitude && myAmbulance.longitude
              ? `${myAmbulance.latitude.toFixed(4)}, ${myAmbulance.longitude.toFixed(4)}`
              : 'Not tracked'}
          </p>
        </div>
      </div>

      {/* Assigned Requests */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold">Active Emergency Assignments</h3>
        </div>
        {assignedRequests.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No active assignments. You are on standby.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {assignedRequests.map((req) => (
              <div key={req.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-danger" />
                    </div>
                    <div>
                      <p className="font-semibold">{req.patient_name}</p>
                      <p className="text-sm text-text-muted">{req.patient_age} yrs — {req.condition}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      req.severity === 'critical' ? 'bg-danger/10 text-danger' :
                      req.severity === 'high' ? 'bg-accent/10 text-accent' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {req.severity}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-text-muted">
                    <MapPin className="w-4 h-4" />
                    <span>{req.address || 'GPS location'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-muted">
                    <Navigation className="w-4 h-4" />
                    <span>Hospital: {req.hospital?.name ?? 'TBD'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-muted">
                    <Clock className="w-4 h-4" />
                    <span>ETA: {req.eta_minutes ? `${req.eta_minutes} min` : 'Calculating...'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-muted">
                    <Activity className="w-4 h-4" />
                    <span>Status: {statusLabel(req.status)}</span>
                  </div>
                </div>

                {/* Status Flow */}
                <div className="flex items-center gap-2 mb-4">
                  {statusFlow.map((s, i) => {
                    const currentIdx = statusFlow.indexOf(req.status);
                    const done = i <= currentIdx;
                    const current = i === currentIdx;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          current ? 'bg-primary text-white' :
                          done ? 'bg-secondary/10 text-secondary' : 'bg-surface-light text-text-muted'
                        }`}>
                          <CircleDot className="w-3 h-3" />
                          {statusLabel(s)}
                        </div>
                        {i < statusFlow.length - 1 && (
                          <ChevronRight className={`w-4 h-4 ${done ? 'text-secondary' : 'text-border'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {nextStatus(req.status) && (
                  <button
                    onClick={() => updateStatus(req.id, nextStatus(req.status)!)}
                    disabled={updating}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : `Update: ${statusLabel(nextStatus(req.status)!)}`}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
