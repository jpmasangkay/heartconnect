import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { jobsApi, savedJobsApi } from '../api';
import { toast } from '../components/ui/sonner';
import type { JobFilters } from '../types';

export interface ExtendedJobFilters extends JobFilters {
  sort?: 'newest' | 'budget_desc' | 'budget_asc' | 'deadline' | 'oldest';
}

/**
 * URL State Synchronization: Synchronizes active filters with URL search params
 */
export function useJobFiltersFromUrl() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<ExtendedJobFilters>(() => {
    const search = searchParams.get('search') || '';
    const skill = searchParams.get('skill') || '';
    const budgetMin = searchParams.get('budgetMin') ? Number(searchParams.get('budgetMin')) : undefined;
    const budgetMax = searchParams.get('budgetMax') ? Number(searchParams.get('budgetMax')) : undefined;
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
    const sort = (searchParams.get('sort') as ExtendedJobFilters['sort']) || 'newest';

    return {
      search: search || undefined,
      skill: skill || undefined,
      budgetMin,
      budgetMax,
      page,
      sort,
      limit: 9,
    };
  }, [searchParams]);

  const updateFilters = useCallback(
    (newFilters: Partial<ExtendedJobFilters>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(newFilters).forEach(([key, val]) => {
          if (val === undefined || val === '' || (key === 'page' && val === 1)) {
            next.delete(key);
          } else {
            next.set(key, String(val));
          }
        });
        return next;
      });
    },
    [setSearchParams]
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return { filters, updateFilters, resetFilters };
}

/**
 * TanStack Query hook for fetching jobs
 */
export function useJobsQuery(filters: ExtendedJobFilters) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async ({ signal }: { signal?: AbortSignal }) => {
      const res = await jobsApi.getAll(filters, { signal });
      return res.data;
    },
    staleTime: 30_000,
  });
}

/**
 * Optimistic UI hook for saving/unsaving jobs with rollback on failure
 */
export function useSaveJobMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, isSaved }: { jobId: string; isSaved: boolean }) => {
      if (isSaved) {
        await savedJobsApi.unsave(jobId);
      } else {
        await savedJobsApi.save(jobId);
      }
      return { jobId, wasSaved: isSaved };
    },
    // Optimistic UI update
    onMutate: async ({ jobId, isSaved }: { jobId: string; isSaved: boolean }) => {
      await queryClient.cancelQueries({ queryKey: ['jobs'] });
      await queryClient.cancelQueries({ queryKey: ['saved-jobs'] });

      const previousSaved = queryClient.getQueryData<string[]>(['saved-jobs-ids']) || [];

      // Optimistically update
      queryClient.setQueryData<string[]>(['saved-jobs-ids'], (old = []) =>
        isSaved ? old.filter((id) => id !== jobId) : [...old, jobId]
      );

      return { previousSaved };
    },
    onSuccess: (data: { jobId: string; wasSaved: boolean }) => {
      const action = data.wasSaved ? 'removed from' : 'added to';
      toast.success(`Job ${action} saved bookmarks`, {
        action: {
          label: 'Undo',
          onClick: () => {
            // Rollback action
            if (data.wasSaved) {
              void savedJobsApi.save(data.jobId).then(() => {
                queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
                queryClient.invalidateQueries({ queryKey: ['saved-jobs-ids'] });
              });
            } else {
              void savedJobsApi.unsave(data.jobId).then(() => {
                queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
                queryClient.invalidateQueries({ queryKey: ['saved-jobs-ids'] });
              });
            }
          },
        },
      });
    },
    onError: (
      _err: unknown,
      _variables: { jobId: string; isSaved: boolean },
      context?: { previousSaved: string[] }
    ) => {
      // Automatic rollback on failure
      if (context?.previousSaved) {
        queryClient.setQueryData(['saved-jobs-ids'], context.previousSaved);
      }
      toast.error('Failed to update bookmark', {
        description: 'Your changes were reverted. Please try again.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['saved-jobs-ids'] });
    },
  });
}
