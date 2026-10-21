import React from 'react';
import { Shield, ShieldAlert, LogOut, UserCheck } from 'lucide-react';
import type { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  activeTab: 'vault' | 'audit';
  setActiveTab: (tab: 'vault' | 'audit') => void;
  onSwitchUser: (email: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onSwitchUser,
  onLogout,
}) => {
  const demoUsers = [
    { email: 'owner@trustvault.local', name: 'Alice (Owner)', role: 'OWNER', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { email: 'viewer@trustvault.local', name: 'Bob (Viewer)', role: 'VIEWER', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { email: 'auditor@trustvault.local', name: 'Carol (Auditor)', role: 'AUDITOR', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { email: 'unauthorized@trustvault.local', name: 'Eve (Rogue)', role: 'UNAUTHORIZED', color: 'bg-rose-100 text-rose-800 border-rose-300' },
    { email: 'admin@trustvault.local', name: 'Admin', role: 'ADMIN', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  ];

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl shadow-md shadow-blue-500/10">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">TrustVault</span>
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono font-medium">
                  v1.0 Immutable
                </span>
              </div>
              <p className="text-xs text-slate-500">Zero-Trust Document Sharing & Provable Audit Trail</p>
            </div>
          </div>

          {/* Navigation Tabs (Vault vs Admin Audit) */}
          {currentUser && (
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('vault')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'vault'
                    ? 'bg-slate-100 text-blue-700 border border-slate-300 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                Document Vault
              </button>

              {currentUser.role === 'ROLE_ADMIN' && (
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${
                    activeTab === 'audit'
                      ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-purple-900 hover:bg-purple-50'
                  }`}
                >
                  <ShieldAlert className="h-4 w-4 text-purple-600" />
                  <span>Admin Audit Dashboard</span>
                </button>
              )}
            </div>
          )}

          {/* Quick Demo Switcher & Active Account */}
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                {/* Demo persona quick switcher */}
                <div className="hidden lg:flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 px-2 font-mono flex items-center gap-1 font-medium">
                    <UserCheck className="h-3.5 w-3.5" /> Persona:
                  </span>
                  {demoUsers.map((u) => {
                    const isActive = currentUser.email === u.email;
                    return (
                      <button
                        key={u.email}
                        onClick={() => onSwitchUser(u.email)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                          isActive
                            ? `${u.color} shadow-xs ring-1 ring-blue-500/50`
                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white'
                        }`}
                        title={`Switch to ${u.name}`}
                      >
                        {u.name.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>

                {/* User Info Badge */}
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{currentUser.fullName}</div>
                  <div className="text-xs text-slate-500 font-mono">{currentUser.email}</div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-rose-600 transition border border-slate-200"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Please sign in</div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
