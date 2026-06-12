import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, AlertCircle, FileText,
  CreditCard, CheckSquare, Settings, TrendingUp, ChevronRight
} from 'lucide-react';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/disputes', icon: AlertCircle, label: 'Disputes' },
  { to: '/letters', icon: FileText, label: 'Letters' },
  { to: '/accounts', icon: CreditCard, label: 'Accounts' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
];

export default function Sidebar() {
  return (
    <div className="flex flex-col h-full bg-slate-900 text-white w-64 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center">
          <TrendingUp size={20} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight">CreditPro CRM</div>
          <div className="text-xs text-slate-400">Credit Repair Suite</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-indigo-300" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Settings */}
      <div className="px-3 py-4 border-t border-slate-700">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
        <div className="mt-4 px-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">AS</div>
            <div>
              <div className="text-xs font-medium">Agent Smith</div>
              <div className="text-xs text-slate-500">Admin</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
