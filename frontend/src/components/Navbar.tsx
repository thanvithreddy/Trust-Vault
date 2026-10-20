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
    { email: 'owner@trustvault.local', name: 'Alice (Owner)', role: 'OWNER', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { email: 'viewer@trustvault.local', name: 'Bob (Viewer)', role: 'VIEWER', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { email: 'auditor@trustvault.local', name: 'Carol (Auditor)', role: 'AUDITOR', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
    { email: 'unauthorized@trustvault.local', name: 'Eve (Rogue)', role: 'UNAUTHORIZED', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    { email: 'admin@trustvault.local', name: 'Admin', role: 'ADMIN', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-xl shadow-lg shadow-cyan-500/20">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">TrustVault</span>
                <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">
                  v1.0 Immutable
                </span>
              </div>
              <p className="text-xs text-slate-400">Zero-Trust Document Sharing & Provable Audit Trail</p>
            </div>
          </div>

          {/* Navigation Tabs (Vault vs Admin Audit) */}
          {currentUser && (
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('vault')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'vault'
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                Document Vault
              </button>

              {currentUser.role === 'ROLE_ADMIN' && (
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2 ${
                    activeTab === 'audit'
                      ? 'bg-purple-950/60 text-purple-300 border border-purple-800/50 shadow-sm'
                      : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800/50'
                  }`}
                >
                  <ShieldAlert className="h-4 w-4 text-purple-400" />
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
                <div className="hidden lg:flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 px-2 font-mono flex items-center gap-1">
                    <UserCheck className="h-3 w-3" /> Persona:
                  </span>
                  {demoUsers.map((u) => {
                    const isActive = currentUser.email === u.email;
                    return (
                      <button
                        key={u.email}
                        onClick={() => onSwitchUser(u.email)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                          isActive
                            ? `${u.color} shadow-sm ring-1 ring-cyan-500/50`
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
                  <div className="text-sm font-semibold text-slate-200">{currentUser.fullName}</div>
                  <div className="text-xs text-slate-400 font-mono">{currentUser.email}</div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Please sign in</div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
