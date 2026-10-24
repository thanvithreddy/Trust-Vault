import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Trash2,
  Sparkles,
  Check,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Bot,
  UserCheck
} from 'lucide-react';
import { api } from '../api';
import type { DocumentItem, DocumentPermission, AISuggestion } from '../types';

interface ShareModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPermissionChanged: () => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  document,
  isOpen,
  onClose,
  onPermissionChanged,
  onNotify,
}) => {
  const [permissions, setPermissions] = useState<DocumentPermission[]>([]);
  const [targetEmail, setTargetEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'READ' | 'EDIT'>('READ');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI suggestion state
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const teamQuickPicks = [
    { email: 'tej@trustvault.local', name: 'Tej Sharma', role: 'Engineering Lead' },
    { email: 'vikram@trustvault.local', name: 'Vikram Malhotra', role: 'Statutory Auditor' },
    { email: 'priya@trustvault.local', name: 'Priya Patel', role: 'External Consultant' },
  ];

  useEffect(() => {
    if (isOpen && document) {
      loadPermissions();
      setSuggestions([]);
      setError(null);
    }
  }, [isOpen, document]);

  const loadPermissions = async () => {
    if (!document) return;
    try {
      setIsLoading(true);
      const data = await api.getPermissions(document.id);
      setPermissions(data);
    } catch (err: any) {
      setError('Failed to load active permission ledger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document || !targetEmail) return;

    try {
      setIsLoading(true);
      setError(null);
      await api.grantPermission(document.id, targetEmail.trim(), permissionLevel);
      if (onNotify) {
        onNotify(`Granted ${permissionLevel} access to ${targetEmail.trim()}`, 'success');
      }
      setTargetEmail('');
      await loadPermissions();
      onPermissionChanged();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data || err.message || 'Failed to grant permission';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (userEmail: string) => {
    if (!document) return;
    try {
      setIsLoading(true);
      setError(null);
      await api.revokePermission(document.id, userEmail);
      if (onNotify) {
        onNotify(`Access for ${userEmail} revoked immediately (0-ms latency)`, 'info');
      }
      await loadPermissions();
      onPermissionChanged();
    } catch (err: any) {
      setError('Failed to revoke permission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchAISuggestions = async () => {
    if (!document) return;
    try {
      setIsLoadingAI(true);
      setError(null);
      const results = await api.getAISuggestions(document.id);
      setSuggestions(results);
    } catch (err: any) {
      setError('AI suggestion generation failed');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleConfirmAISuggestion = async (suggestion: AISuggestion, confirmed: boolean) => {
    if (!document) return;
    try {
      setIsLoading(true);
      await api.confirmAISuggestion(
        document.id,
        suggestion.suggestedUserEmail,
        suggestion.suggestedPermission,
        confirmed
      );
      if (confirmed) {
        if (onNotify) {
          onNotify(`AI suggestion approved: Granted ${suggestion.suggestedPermission} to ${suggestion.suggestedUserName}`, 'success');
        }
        await loadPermissions();
        onPermissionChanged();
      } else {
        if (onNotify) {
          onNotify(`AI suggestion for ${suggestion.suggestedUserName} dismissed`, 'info');
        }
      }
      setSuggestions((prev) => prev.filter((s) => s.suggestedUserEmail !== suggestion.suggestedUserEmail));
    } catch (err: any) {
      setError('Failed to process AI recommendation');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-extrabold uppercase">
                Zero-Trust Access Control
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                {document.category}
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1 line-clamp-1">
              Share "{document.title}"
            </h3>
            <p className="text-[11px] text-slate-500">
              Only authorized principals can download or inspect file streams.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Quick Teammate Chips */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
            <span className="text-[11px] font-bold text-slate-600 block mb-2 flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-blue-600" /> Quick-Select Teammate:
            </span>
            <div className="flex flex-wrap gap-2">
              {teamQuickPicks.map((pick) => (
                <button
                  key={pick.email}
                  type="button"
                  onClick={() => setTargetEmail(pick.email)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                    targetEmail === pick.email
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                  }`}
                >
                  <span className="font-bold">{pick.name}</span>
                  <span className="text-[10px] opacity-75">({pick.role})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grant Form */}
          <form onSubmit={handleGrant} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5 text-blue-600" /> Explicit Permission Grant
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="email"
                required
                placeholder="User email (e.g. tej@trustvault.local)"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />

              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setPermissionLevel('READ')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    permissionLevel === 'READ'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  READ
                </button>
                <button
                  type="button"
                  onClick={() => setPermissionLevel('EDIT')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    permissionLevel === 'EDIT'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  EDIT
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || !targetEmail}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                <span>Grant</span>
              </button>
            </div>
          </form>

          {/* AI Policy Advisor Section */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-blue-50/40 border border-indigo-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-indigo-950">AI Access Recommendation Engine</h4>
                  <p className="text-[10px] text-indigo-800">Evaluates document classification and user job profiles</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFetchAISuggestions}
                disabled={isLoadingAI}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <Sparkles className={`h-3.5 w-3.5 ${isLoadingAI ? 'animate-spin' : ''}`} />
                <span>{isLoadingAI ? 'Analyzing...' : 'Generate Suggestions'}</span>
              </button>
            </div>

            {/* Suggestions List */}
            {suggestions.length > 0 && (
              <div className="mt-3 space-y-2.5">
                {suggestions.map((sug) => (
                  <div
                    key={sug.suggestedUserEmail}
                    className="bg-white border border-indigo-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900">{sug.suggestedUserName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({sug.suggestedUserEmail})</span>
                        <span className="text-[10px] bg-purple-100 text-purple-700 font-extrabold px-2 py-0.2 rounded-md">
                          Suggests: {sug.suggestedPermission}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{sug.rationale}</p>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => handleConfirmAISuggestion(sug, true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
                      >
                        <Check className="h-3 w-3" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleConfirmAISuggestion(sug, false)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Active Grantees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Active Grantees ({permissions.length})
              </span>
              <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                <Zap className="h-3 w-3 text-emerald-600" /> Instant 0-second Revocation
              </span>
            </div>

            {permissions.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                No external users currently hold grants for this document. Only the owner can access.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                {permissions.map((p) => (
                  <div key={p.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                        {p.userFullName ? p.userFullName[0] : 'U'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{p.userFullName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{p.userEmail}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-extrabold">
                        {p.permissionLevel}
                      </span>
                      <button
                        onClick={() => handleRevoke(p.userEmail)}
                        disabled={isLoading}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Revoke access immediately"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Zero-Trust Revocation: Active file streams terminate immediately upon revoke.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
