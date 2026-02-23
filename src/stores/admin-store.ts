import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminFilters {
  status: string;
  jobRole: string;
  dateRange: string;
  search: string;
}

interface AdminState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Current org
  orgSlug: string | null;
  orgName: string | null;

  // Filters
  interviewFilters: AdminFilters;
  candidateFilters: { search: string; status: string };

  // Pagination
  currentPage: number;
  pageSize: number;

  // Actions
  toggleSidebar: () => void;
  collapseSidebar: (collapsed: boolean) => void;
  setOrg: (slug: string, name: string) => void;
  setInterviewFilters: (filters: Partial<AdminFilters>) => void;
  setCandidateFilters: (filters: Partial<{ search: string; status: string }>) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetFilters: () => void;
}

const defaultInterviewFilters: AdminFilters = {
  status: 'all',
  jobRole: 'all',
  dateRange: '30d',
  search: '',
};

const defaultCandidateFilters = {
  search: '',
  status: 'all',
};

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      orgSlug: null,
      orgName: null,
      interviewFilters: { ...defaultInterviewFilters },
      candidateFilters: { ...defaultCandidateFilters },
      currentPage: 1,
      pageSize: 20,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      collapseSidebar: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setOrg: (slug, name) => set({ orgSlug: slug, orgName: name }),
      setInterviewFilters: (filters) =>
        set((s) => ({
          interviewFilters: { ...s.interviewFilters, ...filters },
          currentPage: 1,
        })),
      setCandidateFilters: (filters) =>
        set((s) => ({
          candidateFilters: { ...s.candidateFilters, ...filters },
          currentPage: 1,
        })),
      setPage: (page) => set({ currentPage: page }),
      setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),
      resetFilters: () =>
        set({
          interviewFilters: { ...defaultInterviewFilters },
          candidateFilters: { ...defaultCandidateFilters },
          currentPage: 1,
        }),
    }),
    {
      name: 'admin-preferences',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        pageSize: state.pageSize,
      }),
    }
  )
);
