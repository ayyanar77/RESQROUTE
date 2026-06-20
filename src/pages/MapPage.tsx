import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { EmergencyRequest, Ambulance, Hospital } from '../types';
import { MapPin, Ambulance as AmbIcon, Building2, AlertTriangle, Crosshair, ZoomIn, ZoomOut } from 'lucide-react';

interface MapPoint {
  x: number;
  y: number;
  label: string;
  type: 'ambulance' | 'hospital' | 'emergency';
  status?: string;
  severity?: string;
  details?: string;
}

export default function MapPage() {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<MapPoint | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<'all' | 'ambulances' | 'hospitals' | 'emergencies'>('all');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [r1, r2, r3] = await Promise.all([
        supabase.from('emergency_requests').select('*, ambulance:ambulances(*), hospital:hospitals(*)').order('created_at', { ascending: false }).limit(20),
        supabase.from('ambulances').select('*'),
        supabase.from('hospitals').select('*'),
      ]);
      if (!r1.error) setRequests(r1.data ?? []);
      if (!r2.error) setAmbulances(r2.data ?? []);
      if (!r3.error) setHospitals(r3.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Normalize lat/lng to SVG coordinates
  const allLats = [
    ...requests.map(r => r.latitude).filter(Boolean),
    ...ambulances.map(a => a.latitude).filter(Boolean),
    ...hospitals.map(h => h.latitude).filter(Boolean),
  ] as number[];
  const allLngs = [
    ...requests.map(r => r.longitude).filter(Boolean),
    ...ambulances.map(a => a.longitude).filter(Boolean),
    ...hospitals.map(h => h.longitude).filter(Boolean),
  ] as number[];

  const minLat = Math.min(...allLats, 40.70);
  const maxLat = Math.max(...allLats, 40.77);
  const minLng = Math.min(...allLngs, -74.02);
  const maxLng = Math.max(...allLngs, -73.97);

  const latToY = (lat: number) => ((lat - minLat) / (maxLat - minLat)) * 500;
  const lngToX = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * 800;

  const points: MapPoint[] = [];
  if (selectedLayer === 'all' || selectedLayer === 'ambulances') {
    ambulances.forEach(a => {
      if (a.latitude && a.longitude) {
        points.push({
          x: lngToX(a.longitude),
          y: 500 - latToY(a.latitude),
          label: a.vehicle_number,
          type: 'ambulance',
          status: a.status,
          details: `${a.vehicle_type} — ${a.status}`,
        });
      }
    });
  }
  if (selectedLayer === 'all' || selectedLayer === 'hospitals') {
    hospitals.forEach(h => {
      if (h.latitude && h.longitude) {
        points.push({
          x: lngToX(h.longitude),
          y: 500 - latToY(h.latitude),
          label: h.name,
          type: 'hospital',
          status: h.status,
          details: `${h.available_beds} beds, ${h.available_icu} ICU`,
        });
      }
    });
  }
  if (selectedLayer === 'all' || selectedLayer === 'emergencies') {
    requests.forEach(r => {
      if (r.latitude && r.longitude) {
        points.push({
          x: lngToX(r.longitude),
          y: 500 - latToY(r.latitude),
          label: r.patient_name,
          type: 'emergency',
          severity: r.severity,
          status: r.status,
          details: r.condition,
        });
      }
    });
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.5, Math.min(3, z * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = (e.clientX - rect.left - pan.x) / zoom;
      const my = (e.clientY - rect.top - pan.y) / zoom;
      const found = points.find(p => Math.abs(p.x - mx) < 15 && Math.abs(p.y - my) < 15);
      setHovered(found || null);
      return;
    }
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setDragging(false);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (loading) return <div className="text-text-muted">Loading map...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Live Map</h2>
            <p className="text-sm text-text-muted">Real-time ambulance, hospital, and emergency locations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetView} className="px-3 py-1.5 bg-surface-light border border-border rounded-lg text-xs font-medium hover:bg-primary/10 transition-colors">
            <Crosshair className="w-3 h-3 inline mr-1" /> Reset
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'ambulances', 'hospitals', 'emergencies'] as const).map(layer => (
          <button
            key={layer}
            onClick={() => setSelectedLayer(layer)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              selectedLayer === layer
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-text-muted border-border hover:text-text'
            }`}
          >
            {layer === 'all' && 'All Layers'}
            {layer === 'ambulances' && 'Ambulances'}
            {layer === 'hospitals' && 'Hospitals'}
            {layer === 'emergencies' && 'Emergencies'}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden relative">
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <button onClick={() => setZoom(z => Math.min(3, z * 1.2))} className="w-8 h-8 bg-surface border border-border rounded-lg flex items-center justify-center hover:bg-surface-light transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.5, z / 1.2))} className="w-8 h-8 bg-surface border border-border rounded-lg flex items-center justify-center hover:bg-surface-light transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute top-4 right-4 z-10 bg-surface/90 border border-border rounded-lg px-3 py-2 text-xs space-y-1">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary" /> Ambulance</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-secondary" /> Hospital</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-danger" /> Emergency</div>
        </div>

        {hovered && (
          <div className="absolute bottom-4 left-4 z-10 bg-surface border border-border rounded-lg px-4 py-3 shadow-xl max-w-xs">
            <p className="text-sm font-semibold">{hovered.label}</p>
            <p className="text-xs text-text-muted mt-0.5">{hovered.details}</p>
            {hovered.status && (
              <p className="text-xs text-text-muted mt-0.5 capitalize">Status: {hovered.status.replace('_', ' ')}</p>
            )}
            {hovered.severity && (
              <p className="text-xs text-text-muted mt-0.5 capitalize">Severity: {hovered.severity}</p>
            )}
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox="0 0 800 500"
          className="w-full h-[500px] cursor-move"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ background: 'var(--color-bg)' }}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--color-border)" strokeWidth="0.5" strokeOpacity="0.3" />
            </pattern>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            <rect width="800" height="500" fill="url(#grid)" />

            {/* Roads (simulated) */}
            <line x1="100" y1="250" x2="700" y2="250" stroke="var(--color-border)" strokeWidth="2" strokeOpacity="0.5" />
            <line x1="400" y1="50" x2="400" y2="450" stroke="var(--color-border)" strokeWidth="2" strokeOpacity="0.5" />
            <line x1="200" y1="100" x2="600" y2="400" stroke="var(--color-border)" strokeWidth="1.5" strokeOpacity="0.3" />
            <line x1="600" y1="100" x2="200" y2="400" stroke="var(--color-border)" strokeWidth="1.5" strokeOpacity="0.3" />

            {/* Points */}
            {points.map((p, i) => {
              const color = p.type === 'ambulance' ? '#0ea5e9' : p.type === 'hospital' ? '#10b981' : '#ef4444';
              const size = p.type === 'hospital' ? 8 : 6;
              return (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={size} fill={color} opacity="0.8" stroke="var(--color-bg)" strokeWidth="2" />
                  <circle cx={p.x} cy={p.y} r={size + 4} fill={color} opacity="0.2" />
                  <text x={p.x + 12} y={p.y + 4} fill="var(--color-text)" fontSize="10" fontWeight="500" opacity="0.7">
                    {p.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AmbIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Active Ambulances</span>
          </div>
          <p className="text-2xl font-bold">{ambulances.filter(a => a.status !== 'offline').length}</p>
          <p className="text-xs text-text-muted mt-1">{ambulances.filter(a => a.status === 'available').length} available</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">Hospitals</span>
          </div>
          <p className="text-2xl font-bold">{hospitals.length}</p>
          <p className="text-xs text-text-muted mt-1">{hospitals.filter(h => h.status === 'active').length} active</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-danger" />
            <span className="text-sm font-medium">Active Emergencies</span>
          </div>
          <p className="text-2xl font-bold">{requests.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length}</p>
          <p className="text-xs text-text-muted mt-1">{requests.filter(r => r.status === 'pending').length} pending assignment</p>
        </div>
      </div>
    </div>
  );
}
