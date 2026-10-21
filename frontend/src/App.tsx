import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DocumentList } from './components/DocumentList';
import { UploadModal } from './components/UploadModal';
import { ShareModal } from './components/ShareModal';
import { AdminDashboard } from './components/AdminDashboard';
import { api } from './api';
import type { User, DocumentItem } from './types';
import { Shield, AlertCircle, ArrowRight, CheckCircle2, Info, X } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'vault' | 'audit'>('vault');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedShareDoc, setSelectedShareDoc] = useState<DocumentItem | null>(null);

  // Toast Notification System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('thanvith@trustvault.local');
  const [loginPassword, setLoginPassword] = useState('Password123!');
  const [loginError, setLoginError] = useState<string | null>(null);

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
      setIsLoading(true);
      setLoginError(null);
      let user: User;
      try {
        user = await api.login(email, 'Password123!');
      } catch (e) {
        // Fallback to legacy alias if database has not yet synced new email
        const aliasEmail = email.replace('thanvith', 'owner')
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
      notify(`Logged in as ${user.fullName}`, 'info');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setLoginError(msg);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
      setLoginError('Invalid credentials. Password for demo accounts is Password123!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setDocuments([]);
    notify('Logged out of TrustVault', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`p-4 rounded-2xl border shadow-lg flex items-center justify-between gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs font-bold">
              {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />}
              {toast.type === 'info' && <Info className="h-4 w-4 text-blue-600 shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700 p-0.5">
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {!currentUser ? (
          /* Login & Persona Showcase Screen */
          <div className="max-w-md mx-auto mt-8 bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-md shadow-blue-500/20 mb-3">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">TrustVault Access Gate</h2>
              <p className="text-xs text-slate-500 mt-1">Authenticate identity to access encrypted enterprise records</p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Quick Demo Switcher Buttons with Indian Names */}
            <div className="space-y-2 mb-6">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Select Persona (Instant 1-Click Login):
              </span>

              {[
                { email: 'thanvith@trustvault.local', name: 'Thanvith Reddy (CFO & Owner)', desc: 'Full ownership of FY26 Payroll and Tata MSA contracts' },
                { email: 'tej@trustvault.local', name: 'Tej Sharma (Engineering Lead / Viewer)', desc: 'Granted read access on Tata Consultancy MSA only' },
                { email: 'vikram@trustvault.local', name: 'Vikram Malhotra (Lead Statutory Auditor)', desc: 'Granted read access on FY26 Executive Payroll Statements' },
                { email: 'priya@trustvault.local', name: 'Priya Patel (Former Contractor / Unauthorized)', desc: 'Zero active permissions - tests real-time blocked access' },
                { email: 'admin@trustvault.local', name: 'Ananya Iyer (Chief Security Officer)', desc: 'System governance, live audit ledger & cryptographic integrity' },
              ].map((p) => (
                <button
                  key={p.email}
                  onClick={() => handlePersonaLogin(p.email)}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition group flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition shrink-0 ml-2" />
                </button>
              ))}
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold text-[10px]">Or Direct Account Login</span></div>
            </div>

            <form onSubmit={handleCustomLogin} className="space-y-3">
              <div>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                Sign In to Vault
              </button>
            </form>

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
          notify(`Document "${newDoc.title}" securely stored in vault`, 'success');
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

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
        <p>TrustVault Security Platform • Zero-Trust Permission Engine • SHA-256 Tamper-Evident Cryptographic Ledger</p>
      </footer>

    </div>
  );
};

export default App;
