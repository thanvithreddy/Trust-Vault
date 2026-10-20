import React, { useState } from 'react';
import { Search, Plus, Download, Share2, Trash2, Lock, FileText, AlertOctagon, RefreshCw } from 'lucide-react';
import { api } from '../api';
import type { DocumentItem, User } from '../types';

interface DocumentListProps {
  documents: DocumentItem[];
  currentUser: User | null;
  onOpenUpload: () => void;
  onOpenShare: (doc: DocumentItem) => void;
  onDocumentDeleted: (id: string) => void;
  onRefresh: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  currentUser,
  onOpenUpload,
  onOpenShare,
  onDocumentDeleted,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categories = ['ALL', ...Array.from(new Set(documents.map((d) => d.category)))];

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.originalFilename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDownload = async (doc: DocumentItem) => {
    try {
      setDownloadingId(doc.id);
      setErrorMessage(null);
      await api.streamDocument(doc.id, doc.originalFilename);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data || err.message || 'Access Denied: Stream rejected';
      setErrorMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.title}"?`)) return;
    try {
      setErrorMessage(null);
      await api.deleteDocument(doc.id);
      onDocumentDeleted(doc.id);
    } catch (err: any) {
      setErrorMessage('Failed to delete document');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search documents by name, category, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3 py-2 rounded-xl font-medium transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Upload & Refresh Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition"
            title="Refresh Vault"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {currentUser && (currentUser.role === 'ROLE_OWNER' || currentUser.role === 'ROLE_ADMIN') && (
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Deposit Document</span>
            </button>
          )}
        </div>

      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Document Grid / Table */}
      {filteredDocs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl">
          <Lock className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-slate-300">No documents found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Either no documents match your filter or no documents have been shared with your account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => {
            const isOwner = doc.userPermissionLevel === 'OWNER';
            const isEdit = doc.userPermissionLevel === 'EDIT';
            const isRead = doc.userPermissionLevel === 'READ';

            return (
              <div
                key={doc.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition group"
              >
                <div>
                  
                  {/* Category & Permission Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-950 text-cyan-400 border border-slate-800">
                      {doc.category}
                    </span>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                        isOwner
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : isEdit
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : isRead
                          ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {doc.userPermissionLevel === 'OWNER' ? 'OWNER (FULL)' : doc.userPermissionLevel}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition line-clamp-1">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[32px]">
                    {doc.description || 'No description provided.'}
                  </p>

                  {/* File Metadata */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                        <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{doc.originalFilename}</span>
                      </span>
                      <span className="font-mono text-slate-500">{(doc.fileSize / 1024).toFixed(1)} KB</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Owner:</span>
                      <span className="truncate max-w-[170px] text-slate-400">{doc.ownerEmail}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>SHA-256:</span>
                      <span className="truncate max-w-[170px]" title={doc.checksumSha256}>
                        {doc.checksumSha256.substring(0, 16)}...
                      </span>
                    </div>
                  </div>

                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  
                  {/* Download stream button */}
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-cyan-400 hover:text-cyan-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Download className={`h-3.5 w-3.5 ${downloadingId === doc.id ? 'animate-bounce' : ''}`} />
                    <span>{downloadingId === doc.id ? 'Streaming...' : 'Download Stream'}</span>
                  </button>

                  {/* Share button (Owners only) */}
                  {isOwner && (
                    <button
                      onClick={() => onOpenShare(doc)}
                      className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-purple-400 rounded-xl transition"
                      title="Manage permissions & AI suggestions"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  )}

                  {/* Delete button (Owners only) */}
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-2 bg-slate-950 hover:bg-rose-950/40 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-xl transition"
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
      )}

    </div>
  );
};
