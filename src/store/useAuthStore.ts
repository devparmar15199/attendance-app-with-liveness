import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { auth } from '../services/api';
import { User, AuthResponse } from '../types';

// Define the state shape and actions
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: {
    enrollmentNo?: string;
    email?: string;
    password: string;
  }) => Promise<void>;
  register: (data: any) => Promise<void>;
  forgotPassword: (data: {
    email?: string;
    enrollmentNo?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthState: () => Promise<void>;
  updateUser: (updatedUserData: User) => Promise<void>;
}

// Helper function to handle successful auth (login/register)
const handleAuthSuccess = async (response: AuthResponse) => {
  const { token, user } = response;
  if (!token || !user) {
    throw new Error('Invalid response from server');
  }

  // Persist to secure storage
  await SecureStore.setItemAsync('token', token);
  await SecureStore.setItemAsync('user', JSON.stringify(user));

  // Set state
  return { user, isAuthenticated: true, token: token };
};

// --- Create the Store ---
export const useAuthStore = create<AuthState>((set, get) => ({
  // --- Initial State ---
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: true,

  // --- Actions ---
  login: async (data) => {
    try {
      const response = await auth.login(data);
      const newState = await handleAuthSuccess(response);
      set(newState);
    } catch (error) {
      console.error('Login error:', error);
      throw error; // Re-throw for the UI to handle (e.g., show an alert)
    }
  },

  register: async (data) => {
    try {
      const response = await auth.register(data);
      const newState = await handleAuthSuccess(response);
      set(newState);
    } catch (error) {
      console.error('Registration error:', error);
      throw error; // Re-throw for the UI
    }
  },

  forgotPassword: async (data) => {
    try {
      await auth.forgotPassword(data);
      // No state change needed, just let the UI know it succeeded
    } catch (error) {
      console.error('Forgot Password error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear state even if storage deletion fails
      set({ user: null, isAuthenticated: false, token: null });
    }
  },

  updateUser: async (updatedUserData: User) => {
    try {
      // Update user in secure storage
      await SecureStore.setItemAsync('user', JSON.stringify(updatedUserData));
      // Update user in state
      set({ user: updatedUserData });
    } catch (error) {
      console.error('Failed to update user in store:', error);
    }
  },

  checkAuthState: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('token');
      const userData = await SecureStore.getItemAsync('user');

      if (token && userData) {
        const parsedUser = JSON.parse(userData) as User;
        set({ user: parsedUser, isAuthenticated: true, isLoading: false, token: token });
      } else {
        // No session found
        set({ isAuthenticated: false, user: null, token: null, isLoading: false });
      }
    } catch (error) {
      console.error('Failed to check auth state, clearing session.', error);
      await get().logout(); // Call logout action from within the store
    } finally {
      set({ isLoading: false });
    }
  },
}));