import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Key,
  Download,
  Users,
  Search,
  FileJson,
  Activity
} from 'lucide-react';
import { api } from '../api';
import type { AuditLog, ChainVerificationResult } from '../types';

export const AdminDashboard: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<{
    totalEvents: number;
    deniedAttempts: number;
    totalDownloads: number;
    permissionChanges: number;
  }>({
    totalEvents: 0,
    deniedAttempts: 0,
    totalDownloads: 0,
    permissionChanges: 0,
  });
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [verification, setVerification] = useState<ChainVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [filterStatus]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsData, logsData] = await Promise.all([
        api.getAuditStats(),
        api.getAuditLogs(filterStatus === 'ALL' ? undefined : filterStatus),
      ]);
      setStats(statsData);
      setLogs(logsData);
    } catch (err) {
      console.error('Failed to load admin audit records', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    try {
      setIsVerifying(true);
      const result = await api.verifyAuditIntegrity();
      setVerification(result);
    } catch (err) {
      console.error('Verification failed', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `TrustVault_Audit_Ledger_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    const match =
      (log.userEmail && log.userEmail.toLowerCase().includes(term)) ||
      (log.action && log.action.toLowerCase().includes(term)) ||
      (log.documentTitle && log.documentTitle.toLowerCase().includes(term)) ||
      (log.ipAddress && log.ipAddress.includes(term)) ||
      (log.details && log.details.toLowerCase().includes(term));
    return match;
  });

  return (
    <div className="space-y-6">
      
      {/* Control Center Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white border border-slate-200/90 p-6 rounded-3xl shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm shadow-purple-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Security & Audit Control Center</h2>
              <span className="text-[10px] bg-purple-100 text-purple-700 font-extrabold px-2 py-0.5 rounded-full font-mono uppercase">
                Admin Exclusive
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cryptographically verifiable immutable audit ledger with SHA-256 block linking
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-200"
            title="Refresh logs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-300 flex items-center gap-1.5"
            title="Export full ledger as JSON"
          >
            <FileJson className="h-4 w-4 text-slate-600" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm shadow-emerald-500/25 flex items-center gap-2 transition"
          >
            <Key className="h-4 w-4" />
            <span>{isVerifying ? 'Verifying SHA-256 Chaining...' : 'Verify Cryptographic Integrity'}</span>
          </button>
        </div>
      </div>

      {/* Cryptographic Verification Banner */}
      {verification && (
        <div
          className={`p-5 rounded-2xl border flex items-start space-x-3.5 shadow-xs transition animate-in fade-in duration-200 ${
            verification.valid
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          {verification.valid ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm">
            <div className="font-extrabold text-base">
              {verification.valid
                ? `Cryptographic Audit Chain: 100% Intact (${verification.totalRecords} records mathematically verified)`
                : 'Security Alert: Audit Chain Tampering Detected!'}
            </div>
            <p className="text-xs opacity-90 mt-1 font-medium">{verification.details}</p>
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Events */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Security Events</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{stats.totalEvents}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Recorded in SHA-256 chain</div>
        </div>

        {/* Denied Probes */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Refused Probes</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">{stats.deniedAttempts}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Blocked unauthorized attempts</div>
        </div>

        {/* Proxied Streams */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Proxied Streams</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Download className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{stats.totalDownloads}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Authenticated document streams</div>
        </div>

        {/* Access Modifications */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Permission Events</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{stats.permissionChanges}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Grants & zero-latency revocations</div>
        </div>

      </div>

      {/* Audit Log Table Section */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
        
        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by actor email, action, document title, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['ALL', 'SUCCESS', 'DENIED', 'REVOKED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`text-xs px-3 py-1 rounded-lg font-bold transition ${
                  filterStatus === st
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Document</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No audit records match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isDenied = log.status === 'DENIED';
                  const isSuccess = log.status === 'SUCCESS';

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDenied ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {log.userEmail}
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {log.action}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800 max-w-[180px] truncate">
                        {log.documentTitle || '—'}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {log.ipAddress}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold uppercase inline-flex items-center gap-1 ${
                            isSuccess
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDenied
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isSuccess && <CheckCircle2 className="h-3 w-3" />}
                          {isDenied && <AlertTriangle className="h-3 w-3" />}
                          {log.status}
                        </span>
                      </td>

                      <td className="py-3 px-5 text-slate-600 max-w-[240px] truncate" title={log.details}>
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
