import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { Users, Shield, Ambulance, Building2, TrafficCone, User as UserIcon } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (!error) setUsers(data ?? []);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const roleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-primary" />;
      case 'ambulance_driver': return <Ambulance className="w-4 h-4 text-primary-light" />;
      case 'hospital_staff': return <Building2 className="w-4 h-4 text-secondary" />;
      case 'traffic_officer': return <TrafficCone className="w-4 h-4 text-accent" />;
      default: return <UserIcon className="w-4 h-4 text-text-muted" />;
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-primary/10 text-primary';
      case 'ambulance_driver': return 'bg-primary-light/10 text-primary-light';
      case 'hospital_staff': return 'bg-secondary/10 text-secondary';
      case 'traffic_officer': return 'bg-accent/10 text-accent';
      default: return 'bg-surface-light text-text-muted';
    }
  };

  const roleCounts = {
    admin: users.filter(u => u.role === 'admin').length,
    ambulance_driver: users.filter(u => u.role === 'ambulance_driver').length,
    hospital_staff: users.filter(u => u.role === 'hospital_staff').length,
    traffic_officer: users.filter(u => u.role === 'traffic_officer').length,
    user: users.filter(u => u.role === 'user').length,
  };

  if (loading) return <div className="text-text-muted">Loading users...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">System Users</h2>
          <p className="text-sm text-text-muted">Manage all registered users across roles</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(roleCounts).map(([role, count]) => (
          <div key={role} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              {roleIcon(role)}
              <span className="text-xs text-text-muted capitalize">{role.replace('_', ' ')}</span>
            </div>
            <p className="text-2xl font-bold">{count}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold">All Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Phone</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-light/50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                        {u.full_name.charAt(0)}
                      </div>
                      <span className="font-medium">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-text-muted">{u.email}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleColor(u.role)}`}>
                      {roleIcon(u.role)} {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-text-muted">{u.phone || '-'}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.status === 'active' ? 'bg-secondary/10 text-secondary' : 'bg-accent/10 text-accent'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-text-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
