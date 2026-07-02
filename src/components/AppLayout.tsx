import { NavLink, Outlet } from 'react-router-dom';

import {
  ActivityIcon,
  GridIcon,
  LogoMark,
  SignOutIcon,
  UsersIcon,
} from '@/components/icons';
import { useAuth } from '@/hooks/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', Icon: GridIcon, end: true },
  { to: '/leads', label: 'Leads', Icon: UsersIcon, end: false },
  { to: '/metrics', label: 'Performance', Icon: ActivityIcon, end: false },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
        <LogoMark className="h-5 w-5" />
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-white">
            LeadFlow
          </p>
          <p className="text-[11px] font-medium text-slate-400">Sales pipeline</p>
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const { user, signOut } = useAuth();
  const label = user?.name || user?.email || 'Account';
  const initial = label.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-900 lg:flex">
        <div className="px-5 py-6">
          <Brand />
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label: navLabel, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {navLabel}
            </NavLink>
          ))}
        </nav>

        <div className="m-3 rounded-xl bg-slate-800/60 p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{label}</p>
              {user?.email && (
                <p className="truncate text-xs text-slate-400">{user.email}</p>
              )}
            </div>
            <button
              onClick={() => void signOut()}
              title="Sign out"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <SignOutIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 lg:hidden">
        <Brand />
        <div className="flex items-center gap-1.5">
          {NAV.map(({ to, label: navLabel, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              {navLabel}
            </NavLink>
          ))}
          <button
            onClick={() => void signOut()}
            title="Sign out"
            className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <SignOutIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
