import { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, XCircle, Flag, AlertTriangle } from 'lucide-react';
import Footer from '../components/Footer';
import { verificationApi, reportsApi } from '../api';
import { Input } from '../components/ui/forms';
import { Button } from '../components/ui/button';
import type { User, Report } from '../types';

export default function AdminDashboard() {
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [manualUserId, setManualUserId] = useState('');
  const [manualMsg, setManualMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'verifications' | 'reports'>('verifications');
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await verificationApi.getPending();
      setPending(res.data);
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    setActionLoading(userId);
    try {
      if (action === 'approve') await verificationApi.approve(userId);
      else await verificationApi.reject(userId);
      setPending((prev) => prev.filter((u) => u._id !== userId));
    } catch {
      alert(`Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualMsg('');
    if (!manualUserId.trim()) return;
    try {
      await verificationApi.manualVerify(manualUserId.trim());
      setManualMsg('User verified successfully');
      setManualUserId('');
    } catch {
      setManualMsg('Failed. Check the user ID.');
    }
  };

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await reportsApi.getAll('pending');
      setReports(res.data.data);
    } catch {
      setReports([]);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') fetchReports();
  }, [activeTab, fetchReports]);

  const handleReportAction = async (reportId: string, action: 'reviewed' | 'dismissed') => {
    setActionLoading(reportId);
    try {
      await reportsApi.resolve(reportId, action);
      setReports((prev) => prev.filter((r) => r._id !== reportId));
    } catch {
      alert(`Failed to ${action} report`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="max-w-4xl mx-auto w-full px-6 flex-1">
        <div className="pt-10 pb-6">
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Shield size={24} /> Admin Dashboard
          </h1>
          <p className="text-sm text-stone-muted mt-1">Manage verifications & reports</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-cream-dark border border-stone-border rounded-lg p-1 mb-8">
          <button
            onClick={() => setActiveTab('verifications')}
            className={`flex-1 text-sm font-medium py-2 px-4 rounded-md transition-colors ${
              activeTab === 'verifications'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-stone-muted hover:text-foreground'
            }`}
          >
            <Shield size={14} className="inline mr-1.5" />
            Verifications
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 text-sm font-medium py-2 px-4 rounded-md transition-colors ${
              activeTab === 'reports'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-stone-muted hover:text-foreground'
            }`}
          >
            <Flag size={14} className="inline mr-1.5" />
            Reports ({reports.length})
          </button>
        </div>

        {activeTab === 'verifications' && (
        <>
        {/* Manual verification */}
        <div className="bg-white border border-stone-border rounded-lg p-5 mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3">Manual Verify by User ID</h2>
          <form onSubmit={handleManualVerify} className="flex gap-2 items-center">
            <Input
              placeholder="User ID (MongoDB ObjectId)"
              value={manualUserId}
              onChange={(e) => setManualUserId(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="default">Verify</Button>
          </form>
          {manualMsg && (
            <p className={`text-xs mt-2 ${manualMsg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
              {manualMsg}
            </p>
          )}
        </div>

        {/* Pending verifications */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Pending ID Verifications ({pending.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-stone-border rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-cream-dark rounded w-1/3 mb-2" />
                  <div className="h-3 bg-cream-dark rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : pending.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
              <p className="text-sm text-stone-muted">No pending verifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((user) => (
                <div
                  key={user._id}
                  className="bg-white border border-stone-border rounded-lg p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-stone-muted">{user.email}</p>
                      {user.university && (
                        <p className="text-xs text-stone-muted mt-0.5">{user.university}</p>
                      )}
                      <p className="text-[10px] text-stone-muted mt-1">ID: {user._id}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        onClick={() => handleAction(user._id, 'approve')}
                        disabled={actionLoading === user._id}
                      >
                        <CheckCircle size={14} className="mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleAction(user._id, 'reject')}
                        disabled={actionLoading === user._id}
                      >
                        <XCircle size={14} className="mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  {/* Show uploaded ID image */}
                  {(user as any).verificationDoc && (
                    <div className="mt-3">
                      <p className="text-xs text-stone-muted mb-1">Uploaded ID:</p>
                      <img
                        src={`${backendUrl}${(user as any).verificationDoc}`}
                        alt="ID Document"
                        className="max-w-xs rounded border border-stone-border"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        </>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Pending Reports ({reports.length})
            </h2>

            {reportsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border border-stone-border rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-cream-dark rounded w-1/3 mb-2" />
                    <div className="h-3 bg-cream-dark rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
                <p className="text-sm text-stone-muted">No pending reports</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report._id} className="bg-white border border-stone-border rounded-lg p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle size={14} className="text-amber-500" />
                          <span className="text-sm font-semibold capitalize">{report.targetType} Report</span>
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                            {report.reason}
                          </span>
                        </div>
                        <p className="text-xs text-stone-muted">
                          Reported by {'name' in report.reporter ? report.reporter.name : 'Unknown'}
                          {' · '}{report.targetType} ID: {report.targetId}
                        </p>
                        {report.description && (
                          <p className="text-sm text-foreground/80 mt-2">{report.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="default"
                          onClick={() => handleReportAction(report._id, 'reviewed')}
                          disabled={actionLoading === report._id}
                        >
                          <CheckCircle size={14} className="mr-1" />
                          Reviewed
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleReportAction(report._id, 'dismissed')}
                          disabled={actionLoading === report._id}
                        >
                          <XCircle size={14} className="mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="h-16" />
      </main>
      <Footer />
    </div>
  );
}
