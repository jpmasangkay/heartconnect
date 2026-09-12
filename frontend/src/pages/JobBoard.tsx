import { useState, useEffect, type FormEvent, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, X, Briefcase } from 'lucide-react';
import Footer from '../components/Footer';
import JobCard from '../components/JobCard';
import { Input, Select } from '../components/ui/forms';
import { jobsApi } from '../api';
import { useSocket } from '../context/SocketContext';
import { FadePresence } from '../components/ui/loading-fade';
import { JobCardSkeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';
import { IsolatedErrorBoundary } from '../components/IsolatedErrorBoundary';
import { useJobFiltersFromUrl, useJobsQuery, type ExtendedJobFilters } from '../hooks/useJobsQuery';
import type { Job } from '../types';

function JobGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function JobBoard() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { filters, updateFilters, resetFilters } = useJobFiltersFromUrl();

  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [prevSearch, setPrevSearch] = useState(filters.search);
  const [showFilters, setShowFilters] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);

  // Adjust state during render if URL changes (avoids cascading effect renders)
  if (filters.search !== prevSearch) {
    setPrevSearch(filters.search);
    setLocalSearch(filters.search || '');
  }

  // Load unique skill categories
  useEffect(() => {
    jobsApi
      .getSkills()
      .then((res: { data: { categories?: string[] } }) => {
        setAvailableSkills(res.data.categories ?? []);
      })
      .catch(() => setAvailableSkills([]));
  }, []);

  // TanStack Query for server-synchronized data
  const { data, isLoading, refetch } = useJobsQuery(filters);

  const jobs = data?.data ?? [];
  const totalPages = data?.pages ?? 1;
  const totalCount = data?.total ?? 0;

  // Real-time socket updates invalidate TanStack Query cache
  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    };
    socket.on('job:created', refresh);
    socket.on('job:updated', refresh);
    socket.on('job:deleted', refresh);
    return () => {
      socket.off('job:created', refresh);
      socket.off('job:updated', refresh);
      socket.off('job:deleted', refresh);
    };
  }, [socket, queryClient]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateFilters({ search: localSearch.trim() || undefined, page: 1 });
  };

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.skill ||
    filters.budgetMin !== undefined ||
    filters.budgetMax !== undefined ||
    (filters.sort && filters.sort !== 'newest')
  );

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="max-w-5xl mx-auto w-full px-6 flex-1">
        {/* Page header */}
        <div className="pt-10 pb-6">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Find work</h1>
          <p className="text-sm text-stone-muted mt-1">
            Jobs posted by clients looking for Cordian students like you
          </p>
        </div>

        {/* Search & filters with URL State Synchronization */}
        <div className="mb-8">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-muted pointer-events-none"
              />
              <Input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search by title, skill, or keyword... (Press Enter)"
                className="pl-9"
              />
            </div>

            <Select
              value={filters.skill || ''}
              onChange={(e) => updateFilters({ skill: e.target.value || undefined, page: 1 })}
              className="w-44 hidden sm:block"
            >
              <option value="">All skills</option>
              {availableSkills.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>

            {/* Sort Dropdown */}
            <Select
              value={filters.sort || 'newest'}
              onChange={(e) =>
                updateFilters({
                  sort: e.target.value as ExtendedJobFilters['sort'],
                  page: 1,
                })
              }
              className="w-40 hidden md:block"
            >
              <option value="newest">Newest first</option>
              <option value="budget_desc">Highest budget</option>
              <option value="budget_asc">Lowest budget</option>
              <option value="deadline">Upcoming deadline</option>
              <option value="oldest">Oldest first</option>
            </Select>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`border text-sm px-3 py-2 rounded-lg transition-colors ${
                showFilters
                  ? 'border-navy bg-cream-dark text-navy font-medium'
                  : 'border-stone-border bg-white text-stone-muted hover:text-foreground'
              }`}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal size={15} />
            </button>
          </form>

          {/* Collapsible Filter Panel */}
          {showFilters && (
            <div className="mt-3 p-4 bg-white border border-stone-border rounded-xl flex flex-wrap gap-4 items-end shadow-xs">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-stone-muted">Min budget (₱)</label>
                <Input
                  type="number"
                  value={filters.budgetMin ?? ''}
                  onChange={(e) =>
                    updateFilters({
                      budgetMin: e.target.value ? Number(e.target.value) : undefined,
                      page: 1,
                    })
                  }
                  placeholder="0"
                  className="w-28"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-stone-muted">Max budget (₱)</label>
                <Input
                  type="number"
                  value={filters.budgetMax ?? ''}
                  onChange={(e) =>
                    updateFilters({
                      budgetMax: e.target.value ? Number(e.target.value) : undefined,
                      page: 1,
                    })
                  }
                  placeholder="Any"
                  className="w-28"
                />
              </div>
              <div className="sm:hidden flex flex-col gap-1 flex-1">
                <label className="text-xs font-medium text-stone-muted">Skill</label>
                <Select
                  value={filters.skill || ''}
                  onChange={(e) => updateFilters({ skill: e.target.value || undefined, page: 1 })}
                >
                  <option value="">All skills</option>
                  {availableSkills.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs text-stone-muted hover:text-foreground flex items-center gap-1 pb-2 font-medium"
                >
                  <X size={12} /> Clear all
                </button>
              )}
            </div>
          )}

          {/* Active Filter Pills (URL State Synchronized) */}
          {hasActiveFilters && !showFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {filters.search && (
                <span className="inline-flex items-center gap-1 text-xs bg-sand-light/70 text-navy font-medium px-2.5 py-1 rounded-full border border-stone-border/60">
                  Search: "{filters.search}"
                  <button
                    onClick={() => updateFilters({ search: undefined, page: 1 })}
                    className="text-stone-muted hover:text-foreground"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
              {filters.skill && (
                <span className="inline-flex items-center gap-1 text-xs bg-sand-light/70 text-navy font-medium px-2.5 py-1 rounded-full border border-stone-border/60">
                  {filters.skill}
                  <button
                    onClick={() => updateFilters({ skill: undefined, page: 1 })}
                    className="text-stone-muted hover:text-foreground"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
              {(filters.budgetMin !== undefined || filters.budgetMax !== undefined) && (
                <span className="inline-flex items-center gap-1 text-xs bg-sand-light/70 text-navy font-medium px-2.5 py-1 rounded-full border border-stone-border/60">
                  {filters.budgetMin ? `₱${filters.budgetMin.toLocaleString()}` : '₱0'}
                  {' – '}
                  {filters.budgetMax ? `₱${filters.budgetMax.toLocaleString()}` : 'Any'}
                  <button
                    onClick={() =>
                      updateFilters({ budgetMin: undefined, budgetMax: undefined, page: 1 })
                    }
                    className="text-stone-muted hover:text-foreground"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
              <button
                onClick={resetFilters}
                className="text-xs text-stone-muted hover:text-foreground font-medium underline underline-offset-2"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Isolated Error Boundary containing route crashes */}
        <IsolatedErrorBoundary
          fallbackTitle="Failed to Load Jobs"
          fallbackMessage="Unable to retrieve job postings. Please check your connection and try again."
          onReset={() => refetch()}
        >
          {/* Granular Suspense Boundary */}
          <Suspense fallback={<JobGridSkeleton />}>
            <FadePresence
              activeKey={isLoading ? 'loading' : jobs.length === 0 ? 'empty' : 'list'}
            >
              {isLoading ? (
                // Wireframe placeholders eliminate CLS
                <JobGridSkeleton />
              ) : jobs.length === 0 ? (
                // Contextual Empty State
                <div className="py-12">
                  <EmptyState
                    icon={Briefcase}
                    title="No jobs found matching your criteria"
                    description="Try adjusting your keywords, selecting a different skill, or broadening your budget range."
                    actionLabel={hasActiveFilters ? 'Reset Filters' : undefined}
                    onAction={hasActiveFilters ? resetFilters : undefined}
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-stone-muted mb-4">
                    <p>
                      Showing <strong className="text-foreground">{jobs.length}</strong> of{' '}
                      <strong className="text-foreground">{totalCount}</strong> open listings
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="text-stone-muted hover:text-foreground underline underline-offset-2"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobs.map((job: Job) => (
                      <JobCard key={job._id} job={job} />
                    ))}
                  </div>

                  {/* Server-side Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1.5 mt-12 mb-4">
                      <button
                        onClick={() => updateFilters({ page: Math.max(1, (filters.page || 1) - 1) })}
                        disabled={(filters.page || 1) <= 1}
                        className="p-2 border border-stone-border rounded-lg disabled:opacity-30 hover:bg-white transition-colors"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => updateFilters({ page: p })}
                          className={`w-8 h-8 text-xs rounded-lg font-medium transition-colors ${
                            p === (filters.page || 1)
                              ? 'bg-navy text-white shadow-xs'
                              : 'border border-stone-border hover:bg-white text-stone-muted'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() =>
                          updateFilters({ page: Math.min(totalPages, (filters.page || 1) + 1) })
                        }
                        disabled={(filters.page || 1) >= totalPages}
                        className="p-2 border border-stone-border rounded-lg disabled:opacity-30 hover:bg-white transition-colors"
                        aria-label="Next page"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </FadePresence>
          </Suspense>
        </IsolatedErrorBoundary>

        <div className="h-16" />
      </main>

      <Footer />
    </div>
  );
}
