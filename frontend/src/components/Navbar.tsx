import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Database, LogOut, Zap, Clock, Plug, BarChart3 } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/ai-query', label: 'AI Query', icon: Zap },
  { to: '/schema', label: 'Schema', icon: Database },
  { to: '/connect-database', label: 'Connections', icon: Plug },
  { to: '/query-history', label: 'History', icon: Clock },
  { to: '/home', label: 'Cases', icon: BarChart3 },
];

export default function Navbar() {
  const { user, organization, logout } = useAuth();

  const handleLogout = async (): Promise<void> => {
    await logout();
    window.location.href = '/login';
  };

  const initials =
    user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-14 flex-col bg-navy-900 lg:w-60">
      <div className="flex h-14 items-center justify-center border-b border-slate-800 px-3 lg:justify-start lg:px-4">
        <Link to="/ai-query" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <Database className="h-4 w-4 text-white" />
          </div>
          <span className="hidden text-lg font-bold text-white lg:inline">Connexa</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              clsx(
                'flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:justify-start',
                isActive
                  ? 'bg-accent/20 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-center">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-medium text-accent">
            {initials}
          </div>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-sm font-medium text-white">{user?.name || 'User'}</p>
            <p className="truncate text-xs text-slate-400">{organization?.name}</p>
          </div>
          <button
            onClick={() => void handleLogout()}
            className="flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white lg:ml-auto"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
