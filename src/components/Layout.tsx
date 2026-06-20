import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Menu, X, Bell, Moon, Sun, LogOut, Home, Ambulance, Building2, TrafficCone,
  ShieldAlert, Users, Activity, MapPin, ChevronRight
} from 'lucide-react';

function getNav(role: string | null) {
  const items: { label: string; path: string; icon: React.ReactNode }[] = [];
  items.push({ label: 'Dashboard', path: '/', icon: <Home className="w-5 h-5" /> });
  if (role === 'user') {
    items.push({ label: 'New Emergency', path: '/emergency', icon: <Activity className="w-5 h-5" /> });
  }
  if (role === 'ambulance_driver') {
    items.push({ label: 'Ambulance', path: '/ambulance', icon: <Ambulance className="w-5 h-5" /> });
  }
  if (role === 'hospital_staff') {
    items.push({ label: 'Hospital', path: '/hospital', icon: <Building2 className="w-5 h-5" /> });
  }
  if (role === 'traffic_officer') {
    items.push({ label: 'Traffic', path: '/traffic', icon: <TrafficCone className="w-5 h-5" /> });
  }
  if (role === 'admin') {
    items.push({ label: 'Analytics', path: '/analytics', icon: <ShieldAlert className="w-5 h-5" /> });
    items.push({ label: 'Users', path: '/users', icon: <Users className="w-5 h-5" /> });
  }
  items.push({ label: 'Map', path: '/map', icon: <MapPin className="w-5 h-5" /> });
  return items;
}

export default function Layout() {
  const { user, role, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const nav = getNav(role);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-bg text-text flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border transform transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-6 h-16 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">RESQROUTE</span>
          <button className="lg:hidden ml-auto text-text-muted hover:text-text" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:text-text hover:bg-surface-light'
                }`}
              >
                {item.icon}
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
              {user?.full_name?.charAt(0) ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name ?? 'Guest'}</p>
              <p className="text-xs text-text-muted capitalize">{role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-text-muted hover:text-text" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold hidden sm:block">RESQROUTE</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-light transition-colors">
              {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-light transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border font-semibold text-sm">Notifications</div>
                  <div className="p-3 space-y-2">
                    <div className="text-sm text-text-muted p-2 text-center">Live notifications via Supabase Realtime</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
