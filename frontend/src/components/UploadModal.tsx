import React, { useState } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../api';
import type { DocumentItem } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newDoc: DocumentItem) => void;
  availableCategories: string[];
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  availableCategories,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Contracts');
  const [customCategory, setCustomCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file payload to deposit into the vault');
      return;
    }

    const finalCategory = category === 'Other' ? customCategory.trim() : category;
    if (!finalCategory) {
      setError('Please specify a category or classification for this document');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', finalCategory);

      const uploaded = await api.uploadDocument(formData);
      onUploadSuccess(uploaded);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data || err.message || 'Deposit failed: Magic-byte inspection or server error';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-sm shadow-blue-500/20">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Deposit Secure Document</h3>
              <p className="text-[11px] text-slate-500">Binary payload magic-byte inspection & SHA-256 fingerprinting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* File Picker Zone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Select Document File
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-5 text-center cursor-pointer bg-slate-50/70 hover:bg-blue-50/30 transition-all">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,.png,.jpg,.jpeg"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                {file ? (
                  <div className="flex items-center justify-center space-x-2 text-blue-700 font-bold text-xs">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-1" />
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-blue-600 mx-auto mb-2 opacity-80" />
                    <span className="text-xs font-bold text-slate-800 block">
                      Click to browse or drop file here
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                      PDF, DOCX, XLSX, TXT, CSV, PNG, JPG (Verified Binary Headers)
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Document Display Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. FY26 Executive Master Services Agreement"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Classification / Category Field */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Classification *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="Other">+ Custom Category</option>
              </select>
            </div>

            {category === 'Other' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Custom Tag *
                </label>
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Compliance"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Confidentiality Note / Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context, sensitivity classification, retention period..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Security Notice Pill */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 flex items-center gap-2 text-[11px] text-blue-900">
            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
            <span>Files are encrypted with SHA-256 fingerprinting and bound to your owner account.</span>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-sm shadow-blue-500/25 flex items-center gap-2 transition disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 animate-spin" />
                  <span>Computing SHA-256 & Depositing...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>Deposit Secure Payload</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
