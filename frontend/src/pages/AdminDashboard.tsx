import { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, XCircle, Flag, AlertTriangle, Users, Ban, Search } from 'lucide-react';
import Footer from '../components/Footer';
import { verificationApi, reportsApi, adminApi } from '../api';
import { Input } from '../components/ui/forms';
import { Button } from '../components/ui/button';
import type { User, Report } from '../types';

export default function AdminDashboard() {
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [manualUserId, setManualUserId] = useState('');
  const [manualMsg, setManualMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'verifications' | 'reports' | 'users'>('verifications');
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Users / ban management state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [banUserId, setBanUserId] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banMsg, setBanMsg] = useState('');
  const [autoBanThreshold] = useState(3);

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

  const fetchUsers = useCallback(async (search = '') => {
    setUsersLoading(true);
    try {
      const res = await adminApi.getUsers({ search, limit: 50 });
      setUsers(res.data.data);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers(userSearch);
  }, [activeTab, fetchUsers, userSearch]);

  const handleReportAction = async (reportId: string, action: 'reviewed' | 'dismissed') => {
    setActionLoading(reportId);
    try {
      const res = await reportsApi.resolve(reportId, action);
      setReports((prev) => prev.filter((r) => r._id !== reportId));
      if ((res.data as any).autoBanned) {
        alert('⚠️ User has been auto-banned (reached 3 valid reports).');
        if (activeTab === 'users') fetchUsers(userSearch);
      }
    } catch {
      alert(`Failed to ${action} report`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUser = async (userId: string, reason?: string) => {
    setActionLoading(userId);
    try {
      await adminApi.banUser(userId, reason);
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isBanned: true, banReason: reason || 'Manually banned by admin' } : u));
    } catch {
      alert('Failed to ban user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await adminApi.unbanUser(userId);
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, isBanned: false, banReason: undefined } : u));
    } catch {
      alert('Failed to unban user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualBanById = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanMsg('');
    if (!banUserId.trim()) return;
    try {
      await adminApi.banUser(banUserId.trim(), banReason.trim() || undefined);
      setBanMsg('User banned successfully');
      setBanUserId('');
      setBanReason('');
      if (activeTab === 'users') fetchUsers(userSearch);
    } catch {
      setBanMsg('Failed. Check the user ID.');
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="max-w-4xl mx-auto w-full px-6 flex-1">
        <div className="pt-10 pb-6">
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Shield size={24} /> Admin Center
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
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 text-sm font-medium py-2 px-4 rounded-md transition-colors ${
              activeTab === 'users'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-stone-muted hover:text-foreground'
            }`}
          >
            <Users size={14} className="inline mr-1.5" />
            Users &amp; Bans
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

        {/* Users & Bans Tab */}
        {activeTab === 'users' && (
          <div>
            {/* Manual ban by ID */}
            <div className="bg-white border border-stone-border rounded-lg p-5 mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Ban size={14} /> Manual Ban by User ID
              </h2>
              <form onSubmit={handleManualBanById} className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="User ID (MongoDB ObjectId)"
                    value={banUserId}
                    onChange={(e) => setBanUserId(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" variant="default">Ban</Button>
                </div>
                <Input
                  placeholder="Ban reason (optional)"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                />
              </form>
              {banMsg && (
                <p className={`text-xs mt-2 ${banMsg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
                  {banMsg}
                </p>
              )}
              <p className="text-[10px] text-stone-muted mt-3">
                Auto-ban triggers at <strong>{autoBanThreshold}</strong> valid (reviewed) reports against a user.
              </p>
            </div>

            {/* Search & user list */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-muted" />
                <Input
                  placeholder="Search users by name or email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" onClick={() => fetchUsers(userSearch)}>Refresh</Button>
            </div>

            {usersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border border-stone-border rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-cream-dark rounded w-1/3 mb-2" />
                    <div className="h-3 bg-cream-dark rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center">
                <Users size={32} className="text-stone-muted mx-auto mb-3" />
                <p className="text-sm text-stone-muted">No users found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className={`bg-white border rounded-lg p-5 ${user.isBanned ? 'border-red-200 bg-red-50/40' : 'border-stone-border'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{user.name}</p>
                          <span className="text-[10px] bg-cream-dark text-stone-muted px-2 py-0.5 rounded-full capitalize">{user.role}</span>
                          {user.isBanned && (
                            <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Ban size={9} /> Banned
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-muted">{user.email}</p>
                        <p className="text-[10px] text-stone-muted mt-0.5">ID: {user._id}</p>

                        {/* Report tally */}
                        {user.reportTally && (user.reportTally.reviewed > 0 || user.reportTally.pending > 0) && (
                          <div className="flex gap-3 mt-1.5">
                            {user.reportTally.reviewed > 0 && (
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${user.reportTally.reviewed >= autoBanThreshold ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {user.reportTally.reviewed} valid report{user.reportTally.reviewed !== 1 ? 's' : ''}
                                {user.reportTally.reviewed >= autoBanThreshold ? ' ⚠ ban threshold' : ''}
                              </span>
                            )}
                            {user.reportTally.pending > 0 && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-stone-100 text-stone-600 border-stone-200">
                                {user.reportTally.pending} pending
                              </span>
                            )}
                          </div>
                        )}

                        {user.isBanned && user.banReason && (
                          <p className="text-[10px] text-red-600 mt-1">Reason: {user.banReason}</p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {user.isBanned ? (
                          <Button
                            variant="outline"
                            onClick={() => handleUnbanUser(user._id)}
                            disabled={actionLoading === user._id}
                          >
                            <CheckCircle size={14} className="mr-1" />
                            Unban
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => handleBanUser(user._id)}
                            disabled={actionLoading === user._id || user.role === 'admin'}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Ban size={14} className="mr-1" />
                            Ban
                          </Button>
                        )}
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
