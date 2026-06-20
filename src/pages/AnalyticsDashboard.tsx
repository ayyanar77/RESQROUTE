import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AnalyticsRecord, EmergencyRequest } from '../types';
import {
  Activity, Clock, TrendingUp, AlertTriangle,
  BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsRecord[]>([]);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [r1, r2] = await Promise.all([
        supabase.from('analytics').select('*').order('created_at', { ascending: false }),
        supabase.from('emergency_requests').select('*').order('created_at', { ascending: false }),
      ]);
      if (!r1.error) setAnalytics(r1.data ?? []);
      if (!r2.error) setRequests(r2.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const avgResponse = analytics.length > 0
    ? Math.round(analytics.reduce((s, a) => s + (a.response_time_seconds ?? 0), 0) / analytics.length)
    : 0;

  const criticalAvg = analytics.filter(a => a.severity === 'critical').length > 0
    ? Math.round(
        analytics.filter(a => a.severity === 'critical').reduce((s, a) => s + (a.response_time_seconds ?? 0), 0) /
        analytics.filter(a => a.severity === 'critical').length
      )
    : 0;

  const severityData = [
    { name: 'Critical', value: requests.filter(r => r.severity === 'critical').length },
    { name: 'High', value: requests.filter(r => r.severity === 'high').length },
    { name: 'Medium', value: requests.filter(r => r.severity === 'medium').length },
    { name: 'Low', value: requests.filter(r => r.severity === 'low').length },
  ];

  const statusData = [
    { name: 'Pending', value: requests.filter(r => r.status === 'pending').length },
    { name: 'Assigned', value: requests.filter(r => r.status === 'assigned').length },
    { name: 'En Route', value: requests.filter(r => r.status === 'en_route').length },
    { name: 'Picked Up', value: requests.filter(r => r.status === 'picked_up').length },
    { name: 'At Hospital', value: requests.filter(r => r.status === 'at_hospital').length },
    { name: 'Completed', value: requests.filter(r => r.status === 'completed').length },
  ];

  const responseTimeData = analytics.map((a, i) => ({
    name: `Req ${i + 1}`,
    seconds: a.response_time_seconds ?? 0,
    severity: a.severity,
  })).slice(0, 10).reverse();

  const stats = [
    { label: 'Avg Response Time', value: `${avgResponse}s`, icon: <Clock className="w-5 h-5 text-primary" />, trend: 'All emergencies' },
    { label: 'Critical Avg', value: `${criticalAvg}s`, icon: <AlertTriangle className="w-5 h-5 text-danger" />, trend: 'Critical only' },
    { label: 'Total Emergencies', value: requests.length, icon: <Activity className="w-5 h-5 text-accent" />, trend: 'All time' },
    { label: 'Completed', value: requests.filter(r => r.status === 'completed').length, icon: <TrendingUp className="w-5 h-5 text-secondary" />, trend: 'Resolved' },
  ];

  if (loading) return <div className="text-text-muted">Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Emergency Analytics</h2>
          <p className="text-sm text-text-muted">Response time statistics and emergency insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-bg flex items-center justify-center">{s.icon}</div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Response Time Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--color-text)' }}
                  itemStyle={{ color: 'var(--color-text)' }}
                />
                <Bar dataKey="seconds" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Severity Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {severityData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-text)' }}
                />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-semibold mb-4">Emergency Status Overview</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} />
              <YAxis stroke="var(--color-text-muted)" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--color-text)' }}
              />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Analytics Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold">Detailed Response Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="px-6 py-3 font-medium">Request ID</th>
                <th className="px-6 py-3 font-medium">Severity</th>
                <th className="px-6 py-3 font-medium">Dispatch Time</th>
                <th className="px-6 py-3 font-medium">Arrival Time</th>
                <th className="px-6 py-3 font-medium">Hospital Arrival</th>
                <th className="px-6 py-3 font-medium">Response (s)</th>
              </tr>
            </thead>
            <tbody>
              {analytics.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-light/50 transition-colors">
                  <td className="px-6 py-3 font-medium text-primary">{a.request_id.slice(0, 8)}...</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      a.severity === 'critical' ? 'bg-danger/10 text-danger' :
                      a.severity === 'high' ? 'bg-accent/10 text-accent' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-text-muted">{a.dispatch_time ? new Date(a.dispatch_time).toLocaleTimeString() : '-'}</td>
                  <td className="px-6 py-3 text-text-muted">{a.arrival_time ? new Date(a.arrival_time).toLocaleTimeString() : '-'}</td>
                  <td className="px-6 py-3 text-text-muted">{a.hospital_arrival_time ? new Date(a.hospital_arrival_time).toLocaleTimeString() : '-'}</td>
                  <td className="px-6 py-3 font-medium">{a.response_time_seconds ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
