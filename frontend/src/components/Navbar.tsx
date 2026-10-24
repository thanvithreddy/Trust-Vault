import React from 'react';
import { Shield, ShieldAlert, LogOut, UserCheck, CheckCircle2 } from 'lucide-react';
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
    {
      email: 'thanvith@trustvault.local',
      name: 'Thanvith',
      role: 'OWNER',
      title: 'CFO / Vault Owner',
      initials: 'TR',
      accent: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500/20',
      avatarBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    },
    {
      email: 'tej@trustvault.local',
      name: 'Tej',
      role: 'VIEWER',
      title: 'Engineering Lead / Viewer',
      initials: 'TS',
      accent: 'bg-blue-50 text-blue-700 border-blue-300 ring-blue-500/20',
      avatarBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    },
    {
      email: 'vikram@trustvault.local',
      name: 'Vikram',
      role: 'AUDITOR',
      title: 'Statutory Auditor',
      initials: 'VM',
      accent: 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-indigo-500/20',
      avatarBg: 'bg-gradient-to-br from-indigo-500 to-purple-600',
    },
    {
      email: 'priya@trustvault.local',
      name: 'Priya',
      role: 'UNAUTHORIZED',
      title: 'Unauthorized Probe',
      initials: 'PP',
      accent: 'bg-rose-50 text-rose-700 border-rose-300 ring-rose-500/20',
      avatarBg: 'bg-gradient-to-br from-rose-500 to-pink-600',
    },
    {
      email: 'admin@trustvault.local',
      name: 'Ananya',
      role: 'ADMIN',
      title: 'Chief Security Officer',
      initials: 'AI',
      accent: 'bg-purple-50 text-purple-700 border-purple-300 ring-purple-500/20',
      avatarBg: 'bg-gradient-to-br from-purple-500 to-violet-600',
    },
  ];

  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3.5 shrink-0">
            <div className="relative group">
              <div className="bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 p-2.5 rounded-2xl shadow-sm shadow-blue-500/25 flex items-center justify-center transition-transform group-hover:scale-105">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-extrabold tracking-tight text-slate-900 font-sans">
                  Trust<span className="text-blue-600">Vault</span>
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200/90 px-2 py-0.5 rounded-full font-mono font-semibold uppercase tracking-wider">
                  Zero-Trust
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 hidden sm:flex">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>SHA-256 Ledger Active</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Vault vs Admin Audit) */}
          {currentUser && (
            <nav className="flex items-center space-x-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setActiveTab('vault')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'vault'
                    ? 'bg-white text-blue-600 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>Document Vault</span>
              </button>

              {currentUser.role === 'ROLE_ADMIN' && (
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'audit'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-purple-700 hover:bg-white/60'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Audit & Governance</span>
                </button>
              )}
            </nav>
          )}

          {/* Persona Switcher & Current Account */}
          <div className="flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                {/* Persona Switcher Quick Bar */}
                <div className="hidden lg:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/90">
                  <span className="text-[11px] text-slate-500 font-bold px-2 flex items-center gap-1">
                    <UserCheck className="h-3 w-3 text-slate-400" /> Demo:
                  </span>
                  {demoUsers.map((u) => {
                    const isActive =
                      currentUser.email === u.email ||
                      (u.email === 'thanvith@trustvault.local' && currentUser.email === 'owner@trustvault.local') ||
                      (u.email === 'tej@trustvault.local' && currentUser.email === 'viewer@trustvault.local') ||
                      (u.email === 'vikram@trustvault.local' && currentUser.email === 'auditor@trustvault.local') ||
                      (u.email === 'priya@trustvault.local' && currentUser.email === 'unauthorized@trustvault.local');

                    return (
                      <button
                        key={u.email}
                        onClick={() => onSwitchUser(u.email)}
                        className={`text-xs px-2.5 py-1 rounded-xl border font-bold transition-all flex items-center gap-1.5 ${
                          isActive
                            ? `${u.accent} shadow-xs ring-2 scale-102`
                            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/80'
                        }`}
                        title={`Switch to ${u.name} (${u.title})`}
                      >
                        <span className={`w-4 h-4 rounded-full ${u.avatarBg} text-white text-[9px] font-black flex items-center justify-center shrink-0`}>
                          {u.initials}
                        </span>
                        <span>{u.name}</span>
                        {isActive && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* User Profile Pill */}
                <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-blue-500/20">
                    {currentUser.fullName
                      ? currentUser.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('')
                      : 'U'}
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-slate-900 leading-tight">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono leading-tight">
                      {currentUser.role.replace('ROLE_', '')}
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition border border-slate-200"
                  title="Sign out of TrustVault"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-medium">Please authenticate</div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
