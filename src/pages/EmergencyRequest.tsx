import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Severity } from '../types';
import {
  Activity, AlertTriangle, MapPin, User, Clock, Phone, ChevronDown,
  Stethoscope
} from 'lucide-react';

const CONDITIONS = [
  'Chest pain / Cardiac arrest',
  'Severe allergic reaction',
  'Stroke symptoms',
  'Head trauma',
  'Broken bones / Fractures',
  'Car accident / Multiple injuries',
  'Breathing difficulty',
  'Unconscious / Fainted',
  'Severe bleeding',
  'Other',
];

const SEVERITIES: { value: Severity; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-secondary/10 text-secondary border-secondary/20' },
  { value: 'medium', label: 'Medium', color: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'high', label: 'High', color: 'bg-accent/10 text-accent border-accent/20' },
  { value: 'critical', label: 'Critical', color: 'bg-danger/10 text-danger border-danger/20' },
];

export default function EmergencyRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [condition, setCondition] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => setError('Unable to retrieve location. Please enter address manually.')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!user) {
      setError('You must be logged in');
      setLoading(false);
      return;
    }
    const { data, error: insertError } = await supabase.from('emergency_requests').insert({
      user_id: user.id,
      patient_name: patientName,
      patient_age: patientAge ? parseInt(patientAge) : null,
      condition,
      severity,
      latitude: lat,
      longitude: lng,
      address: address || null,
      status: 'pending',
    }).select().single();

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(true);
      await supabase.from('notifications').insert({
        recipient_id: user.id,
        type: 'emergency',
        title: 'Emergency Request Submitted',
        message: `Your emergency request for ${patientName} has been received. We are finding the best ambulance and hospital.`,
        request_id: data.id,
      });
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-secondary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Emergency Request Submitted</h2>
          <p className="text-text-muted text-sm mb-6">
            Our AI system is analyzing the best ambulance and hospital for your case. You will receive updates shortly.
          </p>
          <div className="bg-surface-light rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-medium mb-1">Patient: {patientName}</p>
            <p className="text-sm text-text-muted">Condition: {condition}</p>
            <p className="text-sm text-text-muted">Severity: <span className="capitalize">{severity}</span></p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-medium text-sm"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-xl font-bold">New Emergency Request</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm">{error}</div>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Step indicator */}
        <div className="flex items-center px-6 py-4 border-b border-border gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? 'bg-primary text-white' : 'bg-surface-light text-text-muted'}`}>
                {s}
              </div>
              <span className={`text-xs font-medium ${step >= s ? 'text-text' : 'text-text-muted'}`}>
                {s === 1 ? 'Patient' : s === 2 ? 'Location' : 'Review'}
              </span>
              {s < 3 && <div className={`w-8 h-px ${step > s ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Patient Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    placeholder="Full name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Patient Age</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="number"
                    value={patientAge}
                    onChange={e => setPatientAge(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    placeholder="Age in years"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Condition</label>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors appearance-none"
                    required
                  >
                    <option value="">Select condition</option>
                    {CONDITIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Severity</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SEVERITIES.map((sev) => (
                    <button
                      key={sev.value}
                      type="button"
                      onClick={() => setSeverity(sev.value)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-center ${severity === sev.value ? sev.color : 'bg-surface-light border-border text-text-muted hover:text-text'}`}
                    >
                      <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
                      {sev.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    placeholder="+1-555-0100"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Next: Location
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    placeholder="Street address, city, zip"
                  />
                </div>
              </div>

              <div className="bg-surface-light rounded-xl p-4 text-center">
                <p className="text-sm font-medium mb-2">GPS Location</p>
                {lat && lng ? (
                  <div className="text-sm text-text-muted">
                    <p>Lat: {lat.toFixed(4)}</p>
                    <p>Lng: {lng.toFixed(4)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted mb-3">No GPS location detected</p>
                )}
                <button
                  type="button"
                  onClick={getLocation}
                  className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  <MapPin className="w-4 h-4 inline mr-1" />
                  {lat && lng ? 'Update Location' : 'Get GPS Location'}
                </button>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 text-text-muted text-sm font-medium hover:text-text transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Review
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-surface-light rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-sm">Emergency Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-text-muted text-xs">Patient</p>
                    <p className="font-medium">{patientName}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs">Age</p>
                    <p className="font-medium">{patientAge || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs">Condition</p>
                    <p className="font-medium">{condition}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs">Severity</p>
                    <p className="font-medium capitalize">{severity}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs">Address</p>
                    <p className="font-medium">{address || 'GPS only'}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs">Phone</p>
                    <p className="font-medium">{phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-sm font-medium text-primary mb-1">
                  <Activity className="w-4 h-4 inline mr-1" />
                  AI Analysis
                </p>
                <p className="text-sm text-text-muted">
                  Our system will automatically select the nearest available ambulance with the right equipment and the best hospital based on distance, traffic, bed availability, and ICU capacity.
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 text-text-muted text-sm font-medium hover:text-text transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-danger to-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Emergency Request'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
