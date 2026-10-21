import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Bot, Sparkles, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import type { DocumentItem, DocumentPermission, AISuggestion } from '../types';

interface ShareModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPermissionChanged: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  document,
  isOpen,
  onClose,
  onPermissionChanged,
}) => {
  const [permissions, setPermissions] = useState<DocumentPermission[]>([]);
  const [targetEmail, setTargetEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'READ' | 'EDIT'>('READ');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI suggestion state
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  useEffect(() => {
    if (isOpen && document) {
      loadPermissions();
      setSuggestions([]);
    }
  }, [isOpen, document]);

  const loadPermissions = async () => {
    if (!document) return;
    try {
      setIsLoading(true);
      const data = await api.getPermissions(document.id);
      setPermissions(data);
    } catch (err: any) {
      setError('Failed to load permissions');
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
      setSuggestions((prev) => prev.filter((s) => s.suggestedUserEmail !== suggestion.suggestedUserEmail));
      if (confirmed) {
        await loadPermissions();
        onPermissionChanged();
      }
    } catch (err: any) {
      setError('Failed to process AI recommendation');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Access Control & Permissions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">
              Document: <span className="text-slate-800 font-semibold">{document.title}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Grant Permission Form */}
        <form onSubmit={handleGrant} className="mt-5 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
            Grant Explicit Permission
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              required
              placeholder="e.g. viewer@trustvault.local"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={permissionLevel}
              onChange={(e) => setPermissionLevel(e.target.value as 'READ' | 'EDIT')}
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="READ">Read Only</option>
              <option value="EDIT">Read & Edit</option>
            </select>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-xs"
            >
              <UserPlus className="h-4 w-4" />
              <span>Grant</span>
            </button>
          </div>
        </form>

        {/* Current Active Grants */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Active Authorized People ({permissions.length})
            </label>
            <span className="text-xs text-amber-700 font-medium">Immediate 0-latency Revocation</span>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200">
            {/* Owner Row */}
            <div className="p-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-semibold text-slate-800">{document.ownerFullName} (Owner)</div>
                <div className="text-xs text-slate-500 font-mono">{document.ownerEmail}</div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                FULL OWNER
              </span>
            </div>

            {/* Granted Users */}
            {permissions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No external permissions granted. Only the owner can access this document.
              </div>
            ) : (
              permissions.map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between text-sm hover:bg-slate-100/70 transition">
                  <div>
                    <div className="font-semibold text-slate-800">{p.userFullName}</div>
                    <div className="text-xs text-slate-500 font-mono">{p.userEmail}</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-300">
                      {p.permissionLevel}
                    </span>
                    <button
                      onClick={() => handleRevoke(p.userEmail)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Revoke access immediately"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Permission Suggestion Assistant */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Bot className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                AI Access Advisor (Human-in-the-Loop)
              </span>
            </div>
            <button
              onClick={handleFetchAISuggestions}
              disabled={isLoadingAI}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-800 font-medium flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{isLoadingAI ? 'Analyzing...' : 'Generate Recommendations'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            AI suggestions are strictly advisory. Machine never widens access automatically. Both suggestion and your decision are recorded in the audit trail.
          </p>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((s) => (
                <div key={s.suggestedUserEmail} className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start justify-between gap-3 shadow-xs">
                  <div>
                    <div className="text-sm font-semibold text-purple-950 flex items-center gap-2">
                      <span>{s.suggestedUserName}</span>
                      <span className="text-xs text-purple-600 font-mono">({s.suggestedUserEmail})</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono border border-purple-300">
                        {s.suggestedPermission} ({(s.confidence * 100).toFixed(0)}% Match)
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 mt-1">{s.rationale}</div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleConfirmAISuggestion(s, true)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition shadow-xs"
                      title="Confirm & Grant Access"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleConfirmAISuggestion(s, false)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
                      title="Dismiss suggestion"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
