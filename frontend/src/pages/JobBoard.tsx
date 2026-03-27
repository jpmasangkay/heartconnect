import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Footer from '../components/Footer';
import JobCard from '../components/JobCard';
import { Input, Select } from '../components/ui/forms';
import { jobsApi } from '../api';
import { useSocket } from '../context/SocketContext';
import { FadePresence } from '../components/ui/loading-fade';
import { JobCardSkeleton } from '../components/ui/skeleton';
import { waitMinSkeletonMs } from '../lib/minSkeletonDelay';
import type { Job } from '../types';

export default function JobBoard() {
  const { socket } = useSocket();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 320);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    jobsApi.getCategories().then((res) => {
      setCategories(res.data.categories ?? []);
    }).catch(() => setCategories([]));
  }, []);

  const fetchJobs = useCallback(
    async (signal?: AbortSignal, opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) setLoading(true);
      const t0 = Date.now();
      try {
        const res = await jobsApi.getAll(
          {
            search: debouncedSearch || undefined,
            category: category || undefined,
            budgetMin: budgetMin ? Number(budgetMin) : undefined,
            budgetMax: budgetMax ? Number(budgetMax) : undefined,
            page,
            limit: 9,
          },
          { signal },
        );
        if (signal?.aborted) return;
        if (silent) {
          setJobs(res.data.data);
          setTotalPages(res.data.pages || 1);
          return;
        }
        await waitMinSkeletonMs(t0, signal);
        if (signal?.aborted) return;
        setJobs(res.data.data);
        setTotalPages(res.data.pages || 1);
      } catch {
        if (signal?.aborted) return;
        if (silent) return;
        await waitMinSkeletonMs(t0, signal);
        if (signal?.aborted) return;
        setJobs([]);
        setTotalPages(1);
      } finally {
        if (!silent && !signal?.aborted) setLoading(false);
      }
    },
    [debouncedSearch, category, budgetMin, budgetMax, page],
  );

  useEffect(() => {
    const ac = new AbortController();
    void fetchJobs(ac.signal);
    return () => ac.abort();
  }, [fetchJobs]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      void fetchJobs(undefined, { silent: true });
    };
    socket.on('job:created', refresh);
    socket.on('job:updated', refresh);
    socket.on('job:deleted', refresh);
    return () => {
      socket.off('job:created', refresh);
      socket.off('job:updated', refresh);
      socket.off('job:deleted', refresh);
    };
  }, [socket, fetchJobs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setBudgetMin('');
    setBudgetMax('');
    setPage(1);
  };

  const hasActiveFilters = !!(search || category || budgetMin || budgetMax);

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="max-w-5xl mx-auto w-full px-6 flex-1">
        {/* Page header */}
        <div className="pt-10 pb-6">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Find work</h1>
          <p className="text-sm text-stone-muted mt-1">
            Jobs posted by clients looking for students like you
          </p>
        </div>

        {/* Search & filters */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-muted pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by title, skill, or keyword..."
                className="pl-9"
              />
            </div>

            <Select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="w-44 hidden sm:block"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`border text-sm px-3 py-2 rounded-lg ${
                showFilters
                  ? 'border-navy bg-cream-dark text-navy'
                  : 'border-stone-border bg-white text-stone-muted hover:text-foreground'
              }`}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal size={15} />
            </button>
          </form>

          {showFilters && (
            <div className="mt-3 p-4 bg-white border border-stone-border rounded-lg flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-stone-muted">Min budget (₱)</label>
                <Input
                  type="number"
                  value={budgetMin}
                  onChange={(e) => { setBudgetMin(e.target.value); setPage(1); }}
                  placeholder="0"
                  className="w-28"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-stone-muted">Max budget (₱)</label>
                <Input
                  type="number"
                  value={budgetMax}
                  onChange={(e) => { setBudgetMax(e.target.value); setPage(1); }}
                  placeholder="Any"
                  className="w-28"
                />
              </div>
              <div className="sm:hidden flex flex-col gap-1 flex-1">
                <label className="text-xs font-medium text-stone-muted">Category</label>
                <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-stone-muted hover:text-foreground flex items-center gap-1"
                >
                  <X size={12} /> Clear all
                </button>
              )}
            </div>
          )}

          {/* Active filter pills */}
          {hasActiveFilters && !showFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {category && (
                <span className="inline-flex items-center gap-1 text-xs bg-cream-dark text-foreground px-2.5 py-1 rounded-full">
                  {category}
                  <button onClick={() => { setCategory(''); setPage(1); }} className="text-stone-muted hover:text-foreground">
                    <X size={11} />
                  </button>
                </span>
              )}
              {(budgetMin || budgetMax) && (
                <span className="inline-flex items-center gap-1 text-xs bg-cream-dark text-foreground px-2.5 py-1 rounded-full">
                  {budgetMin ? `₱${Number(budgetMin).toLocaleString()}` : '₱0'}
                  {' – '}
                  {budgetMax ? `₱${Number(budgetMax).toLocaleString()}` : 'Any'}
                  <button onClick={() => { setBudgetMin(''); setBudgetMax(''); setPage(1); }} className="text-stone-muted hover:text-foreground">
                    <X size={11} />
                  </button>
                </span>
              )}
              <button onClick={clearFilters} className="text-xs text-stone-muted hover:text-foreground">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <FadePresence
          activeKey={loading ? 'loading' : jobs.length === 0 ? 'empty' : 'list'}
        >
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-sm text-stone-muted">No jobs match your search.</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-2 text-sm text-accent hover:text-accent-hover font-medium">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-stone-muted mb-4">
                {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} found
                {hasActiveFilters && <> &middot; <button onClick={clearFilters} className="text-accent hover:text-accent-hover">clear filters</button></>}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <JobCard key={job._id} job={job} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-12 mb-4">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-stone-border rounded-lg disabled:opacity-30 hover:bg-white"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 text-xs rounded-lg font-medium ${
                        p === page
                          ? 'bg-navy text-white'
                          : 'border border-stone-border hover:bg-white text-stone-muted'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-stone-border rounded-lg disabled:opacity-30 hover:bg-white"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </FadePresence>

        <div className="h-16" />
      </main>

      <Footer />
    </div>
  );
}
