import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { EmergencyRequest, TrafficNotification } from '../types';
import {
  TrafficCone, MapPin, Navigation, CheckCircle2, AlertTriangle, Clock,
  Route, Shield, CircleDot
} from 'lucide-react';

export default function TrafficDashboard() {
  const { user } = useAuth();
  const [activeRequests, setActiveRequests] = useState<EmergencyRequest[]>([]);
  const [trafficNotifs, setTrafficNotifs] = useState<TrafficNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [r1, r2] = await Promise.all([
        supabase.from('emergency_requests').select('*, ambulance:ambulances(*), hospital:hospitals(*)').in('status', ['en_route', 'picked_up', 'assigned']).order('created_at', { ascending: false }),
        supabase.from('traffic_notifications').select('*, request:emergency_requests(*)').order('created_at', { ascending: false }).limit(10),
      ]);
      if (!r1.error) setActiveRequests(r1.data ?? []);
      if (!r2.error) setTrafficNotifs(r2.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const sendClearance = async (requestId: string, type: string) => {
    if (!user) return;
    setUpdating(true);
    await supabase.from('traffic_notifications').insert({
      officer_id: user.id,
      request_id: requestId,
      route_status: 'cleared',
      clearance_type: type,
      notes: `${type.replace('_', ' ')} activated for emergency corridor.`,
    });
    const { data } = await supabase.from('traffic_notifications').select('*, request:emergency_requests(*)').order('created_at', { ascending: false }).limit(10);
    setTrafficNotifs(data ?? []);
    setUpdating(false);
  };

  const clearanceTypes = [
    { value: 'lane_priority', label: 'Lane Priority', icon: <Route className="w-4 h-4" /> },
    { value: 'traffic_light_override', label: 'Light Override', icon: <CircleDot className="w-4 h-4" /> },
    { value: 'road_block', label: 'Road Block', icon: <Shield className="w-4 h-4" /> },
  ];

  if (loading) return <div className="text-text-muted">Loading traffic data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-danger flex items-center justify-center">
          <TrafficCone className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Traffic Control Dashboard</h2>
          <p className="text-sm text-text-muted">Manage emergency route clearances and monitor active corridors</p>
        </div>
      </div>

      {/* Active Emergencies Needing Clearance */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold">Active Emergencies Requiring Route Clearance</h3>
        </div>
        {activeRequests.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No active emergencies requiring clearance.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activeRequests.map((req) => (
              <div key={req.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold">{req.patient_name}</p>
                      <p className="text-sm text-text-muted">{req.condition}</p>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 text-sm text-text-muted">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{req.address || 'GPS location'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    <span className="truncate">To: {req.hospital?.name ?? 'TBD'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>ETA: {req.eta_minutes ? `${req.eta_minutes}m` : 'TBD'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {clearanceTypes.map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => sendClearance(req.id, ct.value)}
                      disabled={updating}
                      className="flex items-center gap-2 px-3 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg text-sm font-medium hover:bg-accent/20 transition-colors disabled:opacity-50"
                    >
                      {ct.icon} {ct.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Traffic Notifications History */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold">Route Clearance History</h3>
        </div>
        <div className="p-4 space-y-3">
          {trafficNotifs.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">No clearance actions recorded yet.</p>
          ) : (
            trafficNotifs.map((tn) => (
              <div key={tn.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-surface-light transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  tn.route_status === 'cleared' ? 'bg-secondary/10' :
                  tn.route_status === 'pending' ? 'bg-accent/10' :
                  'bg-danger/10'
                }`}>
                  <Shield className={`w-4 h-4 ${
                    tn.route_status === 'cleared' ? 'text-secondary' :
                    tn.route_status === 'pending' ? 'text-accent' :
                    'text-danger'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{tn.clearance_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      tn.route_status === 'cleared' ? 'bg-secondary/10 text-secondary' :
                      tn.route_status === 'pending' ? 'bg-accent/10 text-accent' :
                      'bg-danger/10 text-danger'
                    }`}>
                      {tn.route_status}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">{tn.notes}</p>
                  <p className="text-xs text-text-muted mt-1">
                    Emergency: {tn.request?.patient_name ?? 'Unknown'} — {new Date(tn.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
