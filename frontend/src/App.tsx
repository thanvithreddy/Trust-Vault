import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DocumentList } from './components/DocumentList';
import { UploadModal } from './components/UploadModal';
import { ShareModal } from './components/ShareModal';
import { AdminDashboard } from './components/AdminDashboard';
import { api } from './api';
import type { User, DocumentItem } from './types';
import { Shield, AlertCircle, ArrowRight } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'vault' | 'audit'>('vault');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedShareDoc, setSelectedShareDoc] = useState<DocumentItem | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('owner@trustvault.local');
  const [loginPassword, setLoginPassword] = useState('Password123!');
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    // Attempt auto-login with owner for frictionless developer experience
    handlePersonaLogin('owner@trustvault.local');
  }, []);

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
      const user = await api.login(email, 'Password123!');
      setCurrentUser(user);
      if (user.role === 'ROLE_ADMIN') {
        setActiveTab('audit');
      } else {
        setActiveTab('vault');
      }
      await loadVaultData();
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
    } catch (err: any) {
      setLoginError('Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setDocuments([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
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
          <div className="max-w-md mx-auto mt-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/20 mb-3">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">TrustVault Access Gate</h2>
              <p className="text-xs text-slate-400 mt-1">Authenticate identity to access encrypted records</p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Quick Demo Switcher Buttons */}
            <div className="space-y-2 mb-6">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Select Persona (Instant Switch):
              </span>

              {[
                { email: 'owner@trustvault.local', name: 'Alice (Owner / CFO)', desc: 'Has full ownership of financial and legal files' },
                { email: 'viewer@trustvault.local', name: 'Bob (Viewer / Contractor)', desc: 'Has read grant for Apex MSA only' },
                { email: 'auditor@trustvault.local', name: 'Carol (Auditor / KPMG)', desc: 'Has read grant for Q3 Financial Statements' },
                { email: 'unauthorized@trustvault.local', name: 'Eve (Unauthorized / Ex-Employee)', desc: 'Zero grants - tests blocked attempts' },
                { email: 'admin@trustvault.local', name: 'Super Admin', desc: 'System monitoring & cryptographic audit ledger' },
              ].map((p) => (
                <button
                  key={p.email}
                  onClick={() => handlePersonaLogin(p.email)}
                  className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/50 transition group flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 transition">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-500">{p.desc}</div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600 group-hover:text-cyan-400 transition" />
                </button>
              ))}
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500">Or Manual Login</span></div>
            </div>

            <form onSubmit={handleCustomLogin} className="space-y-3">
              <div>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition"
              >
                Sign In
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
        }}
        availableCategories={categories}
      />

      {/* Share / Access Management Modal */}
      <ShareModal
        document={selectedShareDoc}
        isOpen={!!selectedShareDoc}
        onClose={() => setSelectedShareDoc(null)}
        onPermissionChanged={loadVaultData}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        <p>TrustVault Security Platform • 7-Day Architecture Sprint • Provable Audit Trail & Zero-Trust Enforcement</p>
      </footer>

    </div>
  );
};

export default App;
