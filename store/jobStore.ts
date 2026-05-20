import { create } from 'zustand';
import type { JobRequest, JobApplication } from '@/types';

interface JobState {
  openJobs: JobRequest[];
  myApplications: JobApplication[];
  activeJob: JobRequest | null;
  setOpenJobs: (jobs: JobRequest[]) => void;
  setMyApplications: (apps: JobApplication[]) => void;
  setActiveJob: (job: JobRequest | null) => void;
  addJob: (job: JobRequest) => void;
  updateJobStatus: (jobId: string, status: JobRequest['status']) => void;
}

export const useJobStore = create<JobState>((set) => ({
  openJobs: [],
  myApplications: [],
  activeJob: null,
  setOpenJobs: (jobs) => set({ openJobs: jobs }),
  setMyApplications: (apps) => set({ myApplications: apps }),
  setActiveJob: (job) => set({ activeJob: job }),
  addJob: (job) => set((state) => ({ openJobs: [job, ...state.openJobs] })),
  updateJobStatus: (jobId, status) =>
    set((state) => ({
      openJobs: state.openJobs.map((j) =>
        j.id === jobId ? { ...j, status } : j
      ),
    })),
}));
