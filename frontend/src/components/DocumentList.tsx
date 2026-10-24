import React, { useState } from 'react';
import {
  Search,
  Plus,
  Download,
  Share2,
  Trash2,
  Lock,
  FileText,
  AlertOctagon,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  LayoutGrid,
  List,
  Sparkles,
  Database,
  KeyRound,
  X,
  Clock
} from 'lucide-react';
import { api } from '../api';
import type { DocumentItem, User } from '../types';

interface DocumentListProps {
  documents: DocumentItem[];
  currentUser: User | null;
  onOpenUpload: () => void;
  onOpenShare: (doc: DocumentItem) => void;
  onDocumentDeleted: (id: string) => void;
  onRefresh: () => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  currentUser,
  onOpenUpload,
  onOpenShare,
  onDocumentDeleted,
  onRefresh,
  onNotify,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const categories = ['ALL', ...Array.from(new Set(documents.map((d) => d.category)))];

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.originalFilename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.ownerFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    try {
      setDownloadingId(doc.id);
      setErrorMessage(null);
      await api.streamDocument(doc.id, doc.originalFilename);
      if (onNotify) {
        onNotify(`Successfully streamed "${doc.originalFilename}" (Cryptographically Verified)`, 'success');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data || err.message || 'Access Denied: Stream rejected by security policy';
      const cleanMsg = typeof msg === 'string' ? msg : JSON.stringify(msg);
      setErrorMessage(cleanMsg);
      if (onNotify) {
        onNotify(`Access Refused: ${cleanMsg}`, 'error');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!window.confirm(`Permanently remove "${doc.title}" from active vault?`)) return;
    try {
      setErrorMessage(null);
      await api.deleteDocument(doc.id);
      onDocumentDeleted(doc.id);
      if (onNotify) {
        onNotify(`Document "${doc.title}" deleted from vault`, 'info');
      }
    } catch (err: any) {
      setErrorMessage('Failed to delete document: Only the document owner can delete.');
    }
  };

  const handleCopyHash = (docId: string, hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(docId);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  const totalVaultSize = documents.reduce((acc, d) => acc + d.fileSize, 0);

  return (
    <div className="space-y-6">
      
      {/* Executive Welcome & Vault Metrics Strip */}
      <div className="bg-gradient-to-r from-white via-slate-50 to-blue-50/40 border border-slate-200/90 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-blue-100/40 to-transparent pointer-events-none rounded-3xl"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Zero-Trust Vault Workspace
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {currentUser?.email}
              </span>
            </div>
            
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome back, {currentUser?.fullName || 'User'}
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
              Every document query and binary stream download is cryptographically verified against server authorization rules. No presigned URLs or unauthenticated leaks.
            </p>
          </div>

          {/* Quick Metrics Badges & Deposit CTA */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/90 border border-slate-200 rounded-2xl px-4 py-2.5 shadow-xs flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Files</div>
                <div className="text-sm font-extrabold text-slate-900">{documents.length} Records</div>
              </div>
            </div>

            <div className="bg-white/90 border border-slate-200 rounded-2xl px-4 py-2.5 shadow-xs flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Payload Size</div>
                <div className="text-sm font-extrabold text-slate-900">{(totalVaultSize / 1024).toFixed(1)} KB</div>
              </div>
            </div>

            {currentUser && (currentUser.role === 'ROLE_OWNER' || currentUser.role === 'ROLE_ADMIN') && (
              <button
                onClick={onOpenUpload}
                className="px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-2xl text-xs font-extrabold shadow-sm shadow-blue-500/25 flex items-center gap-2 transition-all hover:scale-102"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>Deposit Document</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Category Filters, View Switcher */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 bg-white border border-slate-200/90 p-3.5 rounded-2xl shadow-xs">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by title, classification, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const count = cat === 'ALL' ? documents.length : documents.filter((d) => d.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100/70 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-transparent'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-blue-700/80 text-blue-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle & Refresh */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2 bg-slate-100 hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 border border-slate-200/80 rounded-xl transition shadow-xs"
            title="Refresh Vault Records"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>

      </div>

      {/* Security Refusal Banner (e.g., when unauthorized user attempts access) */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <AlertOctagon className="h-5 w-5 shrink-0" />
            </div>
            <div>
              <span className="font-extrabold text-rose-950 uppercase tracking-wide">Security Refusal Alert: </span>
              <span className="font-medium text-rose-800">{errorMessage}</span>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold underline ml-4 hover:text-rose-950 px-2 py-1 rounded-lg hover:bg-rose-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Document Content */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-14 text-center shadow-xs">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="h-7 w-7" />
          </div>
          <h4 className="text-base font-extrabold text-slate-900">No Authorized Documents Accessible</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
            Either no documents match the active search filter, or your account does not hold explicit server-side permission grants for these vault assets.
          </p>
          {currentUser && (currentUser.role === 'ROLE_OWNER' || currentUser.role === 'ROLE_ADMIN') && (
            <button
              onClick={onOpenUpload}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Deposit First Document</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => {
            const isOwner = doc.userPermissionLevel === 'OWNER';
            const isEdit = doc.userPermissionLevel === 'EDIT';
            const isRead = doc.userPermissionLevel === 'READ';

            return (
              <div
                key={doc.id}
                className="bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-md rounded-3xl p-5 shadow-xs flex flex-col justify-between transition-all group"
              >
                <div>
                  
                  {/* Category Pill & Permission Tag */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                      {doc.category}
                    </span>

                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                        isOwner
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : isEdit
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : isRead
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}
                    >
                      <ShieldCheck className="h-3 w-3" />
                      {doc.userPermissionLevel === 'OWNER' ? 'OWNER (FULL)' : doc.userPermissionLevel}
                    </span>
                  </div>

                  {/* Document Title & File Name */}
                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 min-h-[34px] leading-relaxed">
                    {doc.description || 'Secure enterprise document protected with SHA-256 cryptographic hash chaining.'}
                  </p>

                  {/* Metadata Card */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2 text-xs">
                    
                    {/* Original Filename & Size */}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 truncate max-w-[200px] text-slate-800 font-semibold text-xs">
                        <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{doc.originalFilename}</span>
                      </span>
                      <span className="font-mono text-slate-500 font-medium text-[11px]">
                        {(doc.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </div>

                    {/* Owner Badge */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Owner:</span>
                      <span className="truncate max-w-[180px] text-slate-800 font-bold">
                        {doc.ownerFullName}
                      </span>
                    </div>

                    {/* SHA-256 Checksum with Copy */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                      <span>SHA-256:</span>
                      <button
                        onClick={() => handleCopyHash(doc.id, doc.checksumSha256)}
                        className="truncate max-w-[170px] flex items-center gap-1 hover:text-blue-600 transition bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200"
                        title="Click to copy full SHA-256 hash"
                      >
                        <span>{doc.checksumSha256.substring(0, 14)}...</span>
                        {copiedHashId === doc.id ? (
                          <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                        ) : (
                          <Copy className="h-3 w-3 text-slate-400 shrink-0" />
                        )}
                      </button>
                    </div>

                  </div>

                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  
                  {/* Proxied Binary Stream Download */}
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Download className={`h-3.5 w-3.5 ${downloadingId === doc.id ? 'animate-bounce' : ''}`} />
                    <span>{downloadingId === doc.id ? 'Streaming...' : 'Stream Download'}</span>
                  </button>

                  {/* Share & AI Suggestions (Owners only) */}
                  {isOwner && (
                    <button
                      onClick={() => onOpenShare(doc)}
                      className="p-2 bg-slate-100 hover:bg-purple-50 border border-slate-200 text-slate-600 hover:text-purple-700 rounded-xl transition shadow-xs"
                      title="Manage permissions & AI suggestions"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  )}

                  {/* Delete (Owners only) */}
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-2 bg-slate-100 hover:bg-rose-50 border border-slate-200 text-slate-600 hover:text-rose-700 rounded-xl transition shadow-xs"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">Document & Payload</th>
                  <th className="py-3.5 px-4">Classification</th>
                  <th className="py-3.5 px-4">Permission</th>
                  <th className="py-3.5 px-4">Owner</th>
                  <th className="py-3.5 px-4">Cryptographic Hash</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredDocs.map((doc) => {
                  const isOwner = doc.userPermissionLevel === 'OWNER';
                  const isEdit = doc.userPermissionLevel === 'EDIT';
                  const isRead = doc.userPermissionLevel === 'READ';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900">{doc.title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <FileText className="h-3 w-3 text-blue-500" />
                          <span>{doc.originalFilename}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          {doc.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border inline-flex items-center gap-1 ${
                            isOwner
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isEdit
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : isRead
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {doc.userPermissionLevel === 'OWNER' ? 'OWNER (FULL)' : doc.userPermissionLevel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {doc.ownerFullName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <button
                          onClick={() => handleCopyHash(doc.id, doc.checksumSha256)}
                          className="flex items-center gap-1.5 hover:text-blue-600 transition bg-slate-50 px-2 py-1 rounded-lg border border-slate-200"
                          title="Copy SHA-256 hash"
                        >
                          <span>{doc.checksumSha256.substring(0, 12)}...</span>
                          {copiedHashId === doc.id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {(doc.fileSize / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownload(doc)}
                            disabled={downloadingId === doc.id}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                            title="Stream Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {isOwner && (
                            <button
                              onClick={() => onOpenShare(doc)}
                              className="p-1.5 bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700 rounded-lg transition"
                              title="Share permissions"
                            >
                              <Share2 className="h-4 w-4" />
                            </button>
                          )}
                          {isOwner && (
                            <button
                              onClick={() => handleDelete(doc)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg transition"
                              title="Delete document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Engine Architecture Legend */}
      <div className="border border-slate-200/80 bg-white/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span><strong>Zero-Trust Architecture:</strong> File streams are piped via backend controllers without caching presigned URLs.</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          <span>Revocation Latency: 0 ms</span>
        </div>
      </div>

    </div>
  );
};
