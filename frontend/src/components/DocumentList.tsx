import React, { useState } from 'react';
import { Search, Plus, Download, Share2, Trash2, Lock, FileText, AlertOctagon, RefreshCw, Copy, Check, ShieldCheck } from 'lucide-react';
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);

  const categories = ['ALL', ...Array.from(new Set(documents.map((d) => d.category)))];

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.originalFilename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.ownerFullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDownload = async (doc: DocumentItem) => {
    try {
      setDownloadingId(doc.id);
      setErrorMessage(null);
      await api.streamDocument(doc.id, doc.originalFilename);
      if (onNotify) {
        onNotify(`Successfully streamed "${doc.originalFilename}" (Verified SHA-256)`, 'success');
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

  return (
    <div className="space-y-6">
      
      {/* Top Action & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents by title, classification, or owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => {
            const count = cat === 'ALL' ? documents.length : documents.filter(d => d.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Upload & Refresh Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition shadow-xs"
            title="Refresh Vault Records"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {currentUser && (currentUser.role === 'ROLE_OWNER' || currentUser.role === 'ROLE_ADMIN') && (
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Deposit Document</span>
            </button>
          )}
        </div>

      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2.5">
            <AlertOctagon className="h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <span className="font-bold">Security Violation: </span>
              <span className="font-medium">{errorMessage}</span>
            </div>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs font-bold underline ml-4 hover:text-rose-950">
            Dismiss
          </button>
        </div>
      )}

      {/* Document Grid */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <Lock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800">No Authorized Documents Found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Either no documents match the active filter, or access has not been explicitly granted to your account.
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
                className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md rounded-2xl p-5 shadow-xs flex flex-col justify-between transition group"
              >
                <div>
                  
                  {/* Category & Permission Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
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

                  {/* Title & Description */}
                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                    {doc.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 min-h-[34px] leading-relaxed">
                    {doc.description || 'Secure enterprise document stored with cryptographic hash chaining.'}
                  </p>

                  {/* File Metadata */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 truncate max-w-[190px] text-slate-800 font-medium">
                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{doc.originalFilename}</span>
                      </span>
                      <span className="font-mono text-slate-400 font-medium">{(doc.fileSize / 1024).toFixed(1)} KB</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Owner:</span>
                      <span className="truncate max-w-[170px] text-slate-800 font-semibold">{doc.ownerFullName}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>SHA-256 Digest:</span>
                      <button
                        onClick={() => handleCopyHash(doc.id, doc.checksumSha256)}
                        className="truncate max-w-[170px] flex items-center gap-1 hover:text-blue-600 transition"
                        title="Click to copy full SHA-256 checksum"
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

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  
                  {/* Download stream button */}
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Download className={`h-3.5 w-3.5 ${downloadingId === doc.id ? 'animate-bounce' : ''}`} />
                    <span>{downloadingId === doc.id ? 'Streaming...' : 'Download Stream'}</span>
                  </button>

                  {/* Share button (Owners only) */}
                  {isOwner && (
                    <button
                      onClick={() => onOpenShare(doc)}
                      className="p-2 bg-slate-50 hover:bg-purple-50 border border-slate-200 text-slate-600 hover:text-purple-700 rounded-xl transition shadow-xs"
                      title="Manage permissions & AI suggestions"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  )}

                  {/* Delete button (Owners only) */}
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-2 bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-600 hover:text-rose-700 rounded-xl transition shadow-xs"
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
