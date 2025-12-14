import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { classes } from '../services/api';
import { EnrolledClass, AvailableClass } from '../types';

interface ClassState {
  // State
  enrolledClasses: EnrolledClass[];
  availableClasses: AvailableClass[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null; // Timestamp to manage cache staleness

  // Actions
  fetchEnrolledClasses: (forceRefresh?: boolean) => Promise<void>;
  fetchAvailableClasses: (forceRefresh?: boolean) => Promise<void>;
  
  // Mutations
  enrollInClass: (classId: string) => Promise<boolean>;
  unenrollFromClass: (classId: string) => Promise<boolean>;
  
  // Utility
  clearData: () => void;
}

// Cache duration in milliseconds (e.g., 5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export const useClassStore = create<ClassState>()(
  persist(
    (set, get) => ({
      enrolledClasses: [],
      availableClasses: [],
      isLoading: false,
      error: null,
      lastUpdated: null,

      fetchEnrolledClasses: async (forceRefresh = false) => {
        const { lastUpdated, enrolledClasses } = get();
        const now = Date.now();

        // If data exists, isn't stale, and we aren't forcing a refresh, return early
        if (!forceRefresh && enrolledClasses.length > 0 && lastUpdated && (now - lastUpdated < CACHE_DURATION)) {
            console.log('Serving Enrolled Classes from Cache');
            return;
        }

        set({ isLoading: true, error: null });
        try {
          const data = await classes.getEnrolled();
          set({ enrolledClasses: data, lastUpdated: now, isLoading: false });
        } catch (error: any) {
          set({ error: error.message || 'Failed to fetch classes', isLoading: false });
        }
      },

      fetchAvailableClasses: async (forceRefresh = false) => {
        set({ isLoading: true, error: null });
        try {
          const data = await classes.getAvailable();
          set({ availableClasses: data, isLoading: false });
        } catch (error: any) {
          set({ error: error.message || 'Failed to fetch available classes', isLoading: false });
        }
      },

      enrollInClass: async (classId: string) => {
        set({ isLoading: true, error: null });
        try {
          await classes.enrollInClass(classId);
          // Refresh both lists to ensure consistency
          await get().fetchEnrolledClasses(true);
          await get().fetchAvailableClasses(true);
          return true;
        } catch (error: any) {
            set({ error: error.message || 'Enrollment failed', isLoading: false });
            return false;
        }
      },

      unenrollFromClass: async (classId: string) => {
        set({ isLoading: true, error: null });
        try {
          await classes.unenrollFromClass(classId);
          // Optimistic update: Remove locally immediately for better UX
          set((state) => ({
            enrolledClasses: state.enrolledClasses.filter((c) => c._id !== classId),
            isLoading: false
          }));
          return true;
        } catch (error: any) {
          set({ error: error.message || 'Unenrollment failed', isLoading: false });
          return false;
        }
      },

      clearData: () => {
        set({ enrolledClasses: [], availableClasses: [], lastUpdated: null, error: null });
      }
    }),
    {
      name: 'student-class-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the enrolled classes and timestamp, not loading states or errors
      partialize: (state) => ({ 
        enrolledClasses: state.enrolledClasses, 
        lastUpdated: state.lastUpdated 
      }),
    }
  )
);