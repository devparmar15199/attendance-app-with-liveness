import axios from 'axios';
import * as T from '../types';
import { useAuthStore } from '../store/useAuthStore';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api/student';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request Interceptor: Uses Zustand for synchronous token access
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    const token = useAuthStore.getState().token;

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Triggers Zustand logout on 401
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const message = error.response?.data?.message || error.response?.data?.error || error.message || 'An unknown error occurred';

    if (error.response?.status === 401) {
      console.log('401 Unauthorized - logging out user.');
      // Uncomment this line to enable auto-logout
      useAuthStore.getState().logout();
      throw new Error('Session expired. Please log in again.');
    }

    console.error('API Error:', message, error.response?.data);
    throw new Error(message);
  }
);

// --- API Endpoints for Students ---

export const auth = {
  // POST /auth/login
  login: (data: { enrollmentNo?: string; email?: string; password: string }) => {
    return api.post<T.AuthResponse>('/student/auth/login', data).then(res => res.data);
  },

  // POST /auth/register (Handles FormData for file upload)
  register: (data: FormData) => {
    return api.post<T.AuthResponse>('/student/auth/register', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
  },

  // POST /auth/forgot-password
  forgotPassword: (data: { email?: string; enrollmentNo?: string }) => {
    return api.post<{ message: string }>('/student/auth/forgot-password', data).then(res => res.data);
  },
};

export const users = {
  // GET /users/profile
  getProfile: () =>
    api.get<T.User>('/student/users/profile').then(res => res.data),

  // PUT /users/profile
  updateProfile: (data: { fullName?: string; email?: string; classYear?: string; semester?: string; division?: string }) =>
    api.put<T.User>('/student/users/profile', data).then(res => res.data),

  // PUT /users/change-password
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<{ message: string }>('/student/users/change-password', data).then(res => res.data),

  // PUT /users/profile/face
  updateFaceImage: (data: FormData) =>
    api.put<{ message: string; hasFaceImage: boolean }>('/student/users/profile/face', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),
};

export const attendance = {
  // GET /attendance/liveness/challenges - Get random liveness challenges
  getLivenessChallenges: () =>
    api.get<T.LivenessChallengesResponse>('/student/attendance/liveness/challenges').then(res => res.data),

  // POST /attendance/verify - Submit with enhanced face verification
  submitWithFaceVerification: (data: T.FaceVerificationSubmission) =>
    api.post<T.FaceVerificationResponse>('/student/attendance/verify', data).then(res => res.data),

  // POST /attendance (legacy)
  submit: (data: T.AttendanceSubmission) =>
    api.post<{ message: string; attendance: T.AttendanceRecord }>('/student/attendance', data).then(res => res.data),

  // POST /attendance/sync
  sync: (data: T.AttendanceSubmission[]) =>
    api.post<T.SyncResponse>('/student/attendances/sync', { attendances: data }).then(res => res.data),

  // GET /attendance/records
  getMyRecords: (page = 1, limit = 20) =>
    api.get<T.Paginated<T.AttendanceRecord>>('/student/attendance/records', { params: { page, limit } }).then(res => res.data),

  // GET /attendance/records/class/:classId
  getRecordsByClass: (classId: string, page = 1, limit = 20) =>
    api.get<T.Paginated<T.AttendanceRecord>>(`/student/attendance/records/class/${classId}`, { params: { page, limit } }).then(res => res.data),

  // GET /attendance/summary
  getOverallSummary: () =>
    api.get<{ message: string; summary: T.AttendanceSummary }>('/student/attendance/summary').then(res => res.data.summary),

  // GET /attendance/summary/class/:classId
  getClassSummary: (classId: string) =>
    api.get<{ message: string; summary: T.AttendanceSummary }>(`/student/attendance/summary/class/${classId}`).then(res => res.data.summary),
};

export const classes = {
  // GET /classes/enrolled
  getEnrolled: () =>
    api.get<T.EnrolledClass[]>('/student/classes/enrolled').then(res => res.data),

  // GET /classes/available
  getAvailable: () =>
    api.get<{ message: string; data: T.AvailableClass[] }>('/student/classes/available').then(res => res.data.data),

  // GET /classes/:id
  getById: (id: string) =>
    api.get<T.EnrolledClass>(`/student/classes/${id}`).then(res => res.data),

  // POST /classes/:classId/enroll
  enrollInClass: (classId: string) =>
    api.post<T.EnrollResponse>(`/student/classes/${classId}/enroll`).then(res => res.data),

  // DELETE /classes/:classId/unenroll
  unenrollFromClass: (classId: string) =>
    api.delete<{ message: string }>(`/student/classes/${classId}/unenroll`).then(res => res.data),
};

export const qr = {
  // POST /qr/validate
  validate: (data: { token: string }) =>
    api.post<T.QRValidationResponse>('/student/qr/validate', data).then(res => res.data),

  // GET /qr/session/status/:classId
  getSessionStatus: (classId: string) =>
    api.get<T.SessionStatusResponse>(`/student/qr/session/status/${classId}`).then(res => res.data),

  // GET /qr/session/active
  getActiveSessions: () =>
    api.get<{ message: string; activeSessions: T.ActiveSession[] }>('/student/qr/session/active').then(res => res.data.activeSessions),
};

export default api;