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
    { email: 'thanvith@trustvault.local', name: 'Thanvith', role: 'OWNER', title: 'CFO / Owner', initials: 'TR', color: 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-500/20' },
    { email: 'tej@trustvault.local', name: 'Tej', role: 'VIEWER', title: 'Eng Lead / Viewer', initials: 'TS', color: 'bg-blue-100 text-blue-800 border-blue-300 ring-blue-500/20' },
    { email: 'vikram@trustvault.local', name: 'Vikram', role: 'AUDITOR', title: 'Statutory Auditor', initials: 'VM', color: 'bg-indigo-100 text-indigo-800 border-indigo-300 ring-indigo-500/20' },
    { email: 'priya@trustvault.local', name: 'Priya', role: 'UNAUTHORIZED', title: 'Unauthorized Probe', initials: 'PP', color: 'bg-rose-100 text-rose-800 border-rose-300 ring-rose-500/20' },
    { email: 'admin@trustvault.local', name: 'Ananya', role: 'ADMIN', title: 'Security Officer', initials: 'AI', color: 'bg-purple-100 text-purple-800 border-purple-300 ring-purple-500/20' },
  ];

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-md shadow-blue-500/15 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">TrustVault</span>
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-mono font-semibold uppercase tracking-wider">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Zero-Trust Document Security & Provable Audit Trail</p>
            </div>
          </div>

          {/* Navigation Tabs (Vault vs Admin Audit) */}
          {currentUser && (
            <div className="flex space-x-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('vault')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'vault'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                Document Vault
              </button>

              {currentUser.role === 'ROLE_ADMIN' && (
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                    activeTab === 'audit'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-purple-800 hover:bg-white/50'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Admin Audit Ledger</span>
                </button>
              )}
            </div>
          )}

          {/* Quick Demo Switcher & Active Account */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                {/* Persona Switcher Pills */}
                <div className="hidden xl:flex items-center space-x-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 px-2 font-medium flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-slate-400" /> Switch:
                  </span>
                  {demoUsers.map((u) => {
                    const isActive = currentUser.email === u.email || 
                      (u.email === 'thanvith@trustvault.local' && currentUser.email === 'owner@trustvault.local') ||
                      (u.email === 'tej@trustvault.local' && currentUser.email === 'viewer@trustvault.local') ||
                      (u.email === 'vikram@trustvault.local' && currentUser.email === 'auditor@trustvault.local') ||
                      (u.email === 'priya@trustvault.local' && currentUser.email === 'unauthorized@trustvault.local');

                    return (
                      <button
                        key={u.email}
                        onClick={() => onSwitchUser(u.email)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition flex items-center gap-1.5 ${
                          isActive
                            ? `${u.color} shadow-xs ring-2`
                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white'
                        }`}
                        title={`Switch to ${u.name} (${u.title})`}
                      >
                        <span className="text-[10px] font-bold opacity-75">{u.initials}</span>
                        <span>{u.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* User Info Avatar Badge */}
                <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    {currentUser.fullName ? currentUser.fullName.split(' ').map(n => n[0]).slice(0, 2).join('') : 'U'}
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-slate-900 leading-tight">{currentUser.fullName}</div>
                    <div className="text-[10px] text-slate-500 font-mono leading-tight">{currentUser.email}</div>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-rose-600 transition border border-slate-200"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-medium">Please sign in</div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
