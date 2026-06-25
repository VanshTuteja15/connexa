import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Table2, LogOut, MessageSquare, LayoutDashboard, Briefcase } from 'lucide-react';
import clsx from 'clsx';
import { NavbarProps } from '../types';

export default function Navbar({ chatOpen, onToggleChat, activeTab, onTabChange }: NavbarProps) {
  const { user, organization, logout } = useAuth();

  const handleLogout = async (): Promise<void> => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-6">
          <Link to="/home" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
              <Table2 className="h-4 w-4 text-white" />
            </div>
            <span className="hidden font-bold text-slate-900 sm:inline">Connexa</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <button
              onClick={() => onTabChange('dashboard')}
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'dashboard'
                  ? 'bg-accent/10 text-accent'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => onTabChange('cases')}
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'cases'
                  ? 'bg-accent/10 text-accent'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Briefcase className="h-4 w-4" />
              Cases
            </button>
            <button
              onClick={onToggleChat}
              className={clsx(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                chatOpen ? 'bg-accent/10 text-accent' : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <MessageSquare className="h-4 w-4" />
              AI Chat
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:inline">
            {organization?.name}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-medium text-accent">
            {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <button
            onClick={() => void handleLogout()}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
