import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DocumentList } from './components/DocumentList';
import { UploadModal } from './components/UploadModal';
import { ShareModal } from './components/ShareModal';
import { AdminDashboard } from './components/AdminDashboard';
import { api } from './api';
import type { User, DocumentItem } from './types';
import {
  Shield,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Info,
  X,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'vault' | 'audit'>('vault');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [, setIsLoading] = useState(true);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedShareDoc, setSelectedShareDoc] = useState<DocumentItem | null>(null);

  // Toast Notification System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('thanvith@trustvault.local');
  const [loginPassword, setLoginPassword] = useState('Password123!');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    handlePersonaLogin('thanvith@trustvault.local');
  }, []);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const loadVaultData = async () => {
    try {
      setIsLoading(true);
      const [docs, cats] = await Promise.all([api.getDocuments(), api.getCategories()]);
      setDocuments(docs);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load vault data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonaLogin = async (email: string) => {
    try {
      setIsAuthenticating(true);
      setIsLoading(true);
      setLoginError(null);
      let user: User;
      try {
        user = await api.login(email, 'Password123!');
      } catch (e) {
        // Fallback to legacy alias if database has not yet synced new email
        const aliasEmail = email
          .replace('thanvith', 'owner')
          .replace('tej', 'viewer')
          .replace('vikram', 'auditor')
          .replace('priya', 'unauthorized');
        user = await api.login(aliasEmail, 'Password123!');
      }

      setCurrentUser(user);
      if (user.role === 'ROLE_ADMIN') {
        setActiveTab('audit');
      } else {
        setActiveTab('vault');
      }
      await loadVaultData();
      notify(`Authenticated as ${user.fullName} (${user.role.replace('ROLE_', '')})`, 'info');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setLoginError(msg);
      setCurrentUser(null);
    } finally {
      setIsAuthenticating(false);
      setIsLoading(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsAuthenticating(true);
      setIsLoading(true);
      setLoginError(null);
      const user = await api.login(loginEmail, loginPassword);
      setCurrentUser(user);
      if (user.role === 'ROLE_ADMIN') {
        setActiveTab('audit');
      } else {
        setActiveTab('vault');
      }
      await loadVaultData();
      notify(`Welcome back, ${user.fullName}!`, 'success');
    } catch (err: any) {
      setLoginError('Invalid credentials. Uniform password for demo accounts is Password123!');
    } finally {
      setIsAuthenticating(false);
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setDocuments([]);
    notify('Signed out of TrustVault', 'info');
  };

  const personaList = [
    {
      email: 'thanvith@trustvault.local',
      name: 'Thanvith Reddy',
      roleTag: 'CFO & Vault Owner',
      desc: 'Full ownership of FY26 Executive Payroll & Tata MSA Contracts. Can grant/revoke access and evaluate AI suggestions.',
      initials: 'TR',
      avatarBg: 'bg-emerald-500',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    },
    {
      email: 'tej@trustvault.local',
      name: 'Tej Sharma',
      roleTag: 'Engineering Lead / Viewer',
      desc: 'Granted read access on Tata Consultancy MSA only. Blocked from viewing Executive Payroll Statements.',
      initials: 'TS',
      avatarBg: 'bg-blue-500',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-300',
    },
    {
      email: 'vikram@trustvault.local',
      name: 'Vikram Malhotra',
      roleTag: 'Statutory Auditor',
      desc: 'Granted read access on FY26 Executive Payroll Statements for statutory compliance audit.',
      initials: 'VM',
      avatarBg: 'bg-indigo-500',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    },
    {
      email: 'priya@trustvault.local',
      name: 'Priya Patel',
      roleTag: 'Contractor / Probe',
      desc: 'Zero active permissions in vault. Demonstrates real-time blocked access and security audit alerting.',
      initials: 'PP',
      avatarBg: 'bg-rose-500',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-300',
    },
    {
      email: 'admin@trustvault.local',
      name: 'Ananya Iyer',
      roleTag: 'Chief Security Officer',
      desc: 'System governance, live cryptographic SHA-256 audit ledger, and tamper-evident chain verification.',
      initials: 'AI',
      avatarBg: 'bg-purple-500',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-300',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Floating Toast Notification Banner */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`p-4 rounded-2xl border shadow-xl flex items-center justify-between gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950 backdrop-blur-md'
                : toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-950 backdrop-blur-md'
                : 'bg-blue-50/95 border-blue-200 text-blue-950 backdrop-blur-md'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-bold">
              {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />}
              {toast.type === 'info' && <Info className="h-4 w-4 text-blue-600 shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded-lg hover:bg-black/5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSwitchUser={handlePersonaLogin}
        onLogout={handleLogout}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {!currentUser ? (
          /* Authentication & Persona Gate */
          <div className="max-w-2xl mx-auto mt-6">
            
            {/* Header Badge */}
            <div className="text-center mb-8">
              <div className="inline-flex p-3.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-3xl shadow-lg shadow-blue-500/25 mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">TrustVault Access Gate</h2>
              <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
                Authenticate identity to access zero-trust encrypted enterprise records and cryptographic audit ledgers.
              </p>
            </div>

            {loginError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-3 font-semibold shadow-xs">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Persona Quick-Login Cards */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-600" /> Select Executive Persona (1-Click Login):
                </span>
                <span className="text-[10px] font-mono text-slate-400">Password pre-filled</span>
              </div>

              <div className="space-y-2.5">
                {personaList.map((p) => (
                  <button
                    key={p.email}
                    disabled={isAuthenticating}
                    onClick={() => handlePersonaLogin(p.email)}
                    className="w-full text-left p-4 rounded-2xl bg-slate-50/70 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all group flex items-center justify-between shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className={`w-9 h-9 rounded-xl ${p.avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs`}>
                        {p.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 group-hover:text-blue-700 transition">
                            {p.name}
                          </span>
                          <span className={`text-[10px] px-2 py-0.2 rounded-md font-bold border ${p.badgeColor}`}>
                            {p.roleTag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          {p.desc}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition shrink-0 ml-3 group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Account Login */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-700">
                <KeyRound className="h-4 w-4 text-slate-400" />
                <span>Or Authenticate with Custom Credentials</span>
              </div>

              <form onSubmit={handleCustomLogin} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm shadow-blue-500/25 transition disabled:opacity-50"
                >
                  Sign In to TrustVault
                </button>
              </form>
            </div>

          </div>
        ) : (
          /* Authenticated Dashboard View */
          <div>
            {activeTab === 'vault' ? (
              <DocumentList
                documents={documents}
                currentUser={currentUser}
                onOpenUpload={() => setIsUploadOpen(true)}
                onOpenShare={(doc) => setSelectedShareDoc(doc)}
                onDocumentDeleted={(id) => setDocuments((prev) => prev.filter((d) => d.id !== id))}
                onRefresh={loadVaultData}
                onNotify={notify}
              />
            ) : (
              <AdminDashboard />
            )}
          </div>
        )}

      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={(newDoc) => {
          setDocuments((prev) => [newDoc, ...prev]);
          loadVaultData();
          notify(`Document "${newDoc.title}" securely deposited into vault`, 'success');
        }}
        availableCategories={categories}
      />

      {/* Share / Access Management Modal */}
      <ShareModal
        document={selectedShareDoc}
        isOpen={!!selectedShareDoc}
        onClose={() => setSelectedShareDoc(null)}
        onPermissionChanged={loadVaultData}
        onNotify={notify}
      />

      {/* Modern Enterprise Footer */}
      <footer className="border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 bg-white/90">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span className="font-bold text-slate-700">TrustVault NextGen Enterprise</span>
            <span>• Zero-Trust Permission Engine</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400 font-mono">
            <span>SHA-256 Hash Chained</span>
            <span>•</span>
            <span>Server-Side Enforced</span>
            <span>•</span>
            <span className="text-emerald-600 flex items-center gap-1 font-bold">
              <Zap className="h-3 w-3" /> 0-ms Revocation
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
