import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, Filter, Key, Database, Download, Users } from 'lucide-react';
import { api } from '../api';
import type { AuditLog, ChainVerificationResult } from '../types';

export const AdminDashboard: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<{ totalEvents: number; deniedAttempts: number; totalDownloads: number; permissionChanges: number }>({
    totalEvents: 0,
    deniedAttempts: 0,
    totalDownloads: 0,
    permissionChanges: 0,
  });
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Security & Audit Control Center</h2>
              <p className="text-xs text-slate-400">Cryptographically verifiable immutable ledger of all system interactions</p>
            </div>
          </div>
        </div>

        {/* Verification Action */}
        <div className="flex items-center space-x-3">
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border border-slate-700"
            title="Refresh logs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition"
          >
            <Key className="h-4 w-4" />
            <span>{isVerifying ? 'Verifying Hashes...' : 'Verify Cryptographic Integrity'}</span>
          </button>
        </div>
      </div>

      {/* Cryptographic Verification Banner */}
      {verification && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 shadow-lg transition ${
            verification.valid
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
          }`}
        >
          {verification.valid ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm">
            <div className="font-semibold">
              {verification.valid
                ? `Cryptographic Audit Chain: 100% Intact (${verification.totalRecords} records verified)`
                : 'Security Alert: Audit Trail Tampering Detected!'}
            </div>
            <p className="text-xs opacity-90 mt-1">{verification.details}</p>
          </div>
        </div>
      )}

      {/* High-Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Total Audit Events</span>
            <Database className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{stats.totalEvents}</div>
          <div className="text-xs text-slate-500 mt-1">Append-only ledger entries</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-rose-400 font-medium">Refused Probes (Denied)</span>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2">{stats.deniedAttempts}</div>
          <div className="text-xs text-rose-500/80 mt-1">Blocked security breaches / IDORs</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Document Downloads</span>
            <Download className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{stats.totalDownloads}</div>
          <div className="text-xs text-slate-500 mt-1">Verified streamed access</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Permission Mutations</span>
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{stats.permissionChanges}</div>
          <div className="text-xs text-slate-500 mt-1">Grants & instant revocations</div>
        </div>

      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Filter className="h-4 w-4 text-slate-500" />
          <span>Filter Audit Records:</span>
        </div>
        <div className="flex space-x-2">
          {['ALL', 'DENIED', 'SUCCESS'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                filterStatus === status
                  ? status === 'DENIED'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {status === 'ALL' ? 'All Activity' : status === 'DENIED' ? 'Refused / Denied Only' : 'Success Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Document</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Details / IP</th>
                <th className="py-3 px-4">SHA-256 Chain Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No audit records match the selected filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isDenied = log.status === 'DENIED';
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-800/40 transition ${isDenied ? 'bg-rose-950/20' : ''}`}
                    >
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{log.userEmail || 'ANONYMOUS'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.userRole}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                            isDenied
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : log.action.includes('REVOKE')
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : log.action.includes('GRANT')
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : log.action.includes('AI')
                              ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                              : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs truncate text-slate-300">
                        {log.documentTitle || '-'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDenied
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="truncate max-w-xs text-slate-300" title={log.details}>
                          {log.details || '-'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">IP: {log.ipAddress || '127.0.0.1'}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                        <span title={`Previous Hash: ${log.previousHash}\nCurrent Hash: ${log.currentHash}`}>
                          {log.currentHash.substring(0, 12)}...
                        </span>
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
