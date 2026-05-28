import { create } from 'zustand';
import { fetchOpenJobs, fetchOpenJobsForProvider, fetchProviderJobs } from '@/lib/jobService';
import type { JobRequest, JobApplication, Country } from '@/types';

interface JobState {
  openJobs: JobRequest[];
  openJobsHasMore: boolean;
  openJobsDbOffset: number;
  loadingMore: boolean;
  myApplications: JobApplication[];
  appliedJobs: JobRequest[];
  activeJobs: JobRequest[];
  completedJobs: JobRequest[];
  rejectedJobIds: string[];
  activeJob: JobRequest | null;
  loading: boolean;
  error: string | null;
  setOpenJobs: (jobs: JobRequest[]) => void;
  setMyApplications: (apps: JobApplication[]) => void;
  setActiveJob: (job: JobRequest | null) => void;
  addJob: (job: JobRequest) => void;
  updateJobStatus: (jobId: string, status: JobRequest['status']) => void;
  fetchOpenJobs: (country: Country, providerId?: string, providerRole?: 'company' | 'independent') => Promise<void>;
  loadMoreOpenJobs: (country: Country, providerId: string, providerRole: 'company' | 'independent') => Promise<void>;
  fetchMyJobs: (providerId: string) => Promise<void>;
}

export const useJobStore = create<JobState>((set, get) => ({
  openJobs: [],
  openJobsHasMore: false,
  openJobsDbOffset: 0,
  loadingMore: false,
  myApplications: [],
  appliedJobs: [],
  activeJobs: [],
  completedJobs: [],
  rejectedJobIds: [],
  activeJob: null,
  loading: false,
  error: null,
  setOpenJobs: (jobs) => set({ openJobs: jobs }),
  setMyApplications: (apps) => set({ myApplications: apps }),
  setActiveJob: (job) => set({ activeJob: job }),
  addJob: (job) => set((state) => ({ openJobs: [job, ...state.openJobs] })),
  updateJobStatus: (jobId, status) =>
    set((state) => ({
      openJobs: state.openJobs.map((j) => (j.id === jobId ? { ...j, status } : j)),
    })),
  fetchOpenJobs: async (country, providerId, providerRole) => {
    set({ loading: true, openJobsDbOffset: 0, openJobsHasMore: false });
    try {
      if (providerId && providerRole) {
        const { jobs, hasMore } = await fetchOpenJobsForProvider(providerId, providerRole, country, 0);
        set({ openJobs: jobs, openJobsHasMore: hasMore, openJobsDbOffset: 25 });
      } else {
        const jobs = await fetchOpenJobs(country);
        set({ openJobs: jobs, openJobsHasMore: false });
      }
    } catch (e: any) {
      console.error('[jobStore] fetchOpenJobs failed:', e?.message ?? e);
      set({ openJobs: [], openJobsHasMore: false });
    } finally {
      set({ loading: false });
    }
  },
  loadMoreOpenJobs: async (country, providerId, providerRole) => {
    const { openJobs, openJobsDbOffset, loadingMore } = get();
    if (loadingMore) return;
    set({ loadingMore: true });
    try {
      const { jobs: newJobs, hasMore } = await fetchOpenJobsForProvider(
        providerId, providerRole, country, openJobsDbOffset,
      );
      // Deduplicate by id before appending
      const existingIds = new Set(openJobs.map((j) => j.id));
      const fresh = newJobs.filter((j) => !existingIds.has(j.id));
      set({
        openJobs: [...openJobs, ...fresh],
        openJobsHasMore: hasMore,
        openJobsDbOffset: openJobsDbOffset + 25,
      });
    } catch (e: any) {
      console.error('[jobStore] loadMoreOpenJobs failed:', e?.message ?? e);
    } finally {
      set({ loadingMore: false });
    }
  },
  fetchMyJobs: async (providerId) => {
    set({ loading: true, error: null });
    try {
      const { applied, active, completed, rejectedJobIds } = await fetchProviderJobs(providerId);
      set({ appliedJobs: applied, activeJobs: active, completedJobs: completed, rejectedJobIds, error: null });
    } catch (e: any) {
      console.error('[jobStore] fetchMyJobs failed:', e?.message ?? e);
      set({ error: e?.message ?? 'Failed to load jobs' });
    } finally {
      set({ loading: false });
    }
  },
}));
