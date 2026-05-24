import { create } from 'zustand';
import { fetchOpenJobs, fetchOpenJobsForProvider, fetchProviderJobs } from '@/lib/jobService';
import type { JobRequest, JobApplication, Country } from '@/types';

interface JobState {
  openJobs: JobRequest[];
  myApplications: JobApplication[];
  appliedJobs: JobRequest[];
  activeJobs: JobRequest[];
  completedJobs: JobRequest[];
  rejectedJobIds: string[];
  activeJob: JobRequest | null;
  loading: boolean;
  setOpenJobs: (jobs: JobRequest[]) => void;
  setMyApplications: (apps: JobApplication[]) => void;
  setActiveJob: (job: JobRequest | null) => void;
  addJob: (job: JobRequest) => void;
  updateJobStatus: (jobId: string, status: JobRequest['status']) => void;
  fetchOpenJobs: (country: Country, providerId?: string, providerRole?: 'company' | 'independent') => Promise<void>;
  fetchMyJobs: (providerId: string) => Promise<void>;
}

export const useJobStore = create<JobState>((set) => ({
  openJobs: [],
  myApplications: [],
  appliedJobs: [],
  activeJobs: [],
  completedJobs: [],
  rejectedJobIds: [],
  activeJob: null,
  loading: false,
  setOpenJobs: (jobs) => set({ openJobs: jobs }),
  setMyApplications: (apps) => set({ myApplications: apps }),
  setActiveJob: (job) => set({ activeJob: job }),
  addJob: (job) => set((state) => ({ openJobs: [job, ...state.openJobs] })),
  updateJobStatus: (jobId, status) =>
    set((state) => ({
      openJobs: state.openJobs.map((j) => (j.id === jobId ? { ...j, status } : j)),
    })),
  fetchOpenJobs: async (country, providerId, providerRole) => {
    set({ loading: true });
    try {
      const jobs = (providerId && providerRole)
        ? await fetchOpenJobsForProvider(providerId, providerRole, country)
        : await fetchOpenJobs(country);
      set({ openJobs: jobs });
    } catch (e: any) {
      console.error('[jobStore] fetchOpenJobs failed:', e?.message ?? e);
      set({ openJobs: [] });
    } finally {
      set({ loading: false });
    }
  },
  fetchMyJobs: async (providerId) => {
    set({ loading: true });
    try {
      const { applied, active, completed, rejectedJobIds } = await fetchProviderJobs(providerId);
      set({ appliedJobs: applied, activeJobs: active, completedJobs: completed, rejectedJobIds });
    } catch (e: any) {
      console.error('[jobStore] fetchMyJobs failed:', e?.message ?? e);
    } finally {
      set({ loading: false });
    }
  },
}));
