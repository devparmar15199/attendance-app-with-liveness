// --- Navigation Param Lists ---

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;  // The bottom tab navigator
  ChangePassword: undefined;
  ClassDetails: { classId: string };
  FaceLiveness: {
    classId: string;
    sessionId?: string; // Optional - used for legacy AWS liveness flow
    scheduleId?: string;
  };
  EditProfile: undefined;
  UpdateFace: undefined;
};

export type TabParamList = {
  Home: undefined;  // Dashboard with today's schedule
  Scan: undefined;  // QR Code Scanner
  Classes: undefined; // List of enrolled/available classes
  Profile: undefined; // User profile and settings
};

// --- Core Data Models ---

/**
 * Generic pagination info returned from list endpoints.
 */
export interface PaginationInfo {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

/**
 * Generic paginated API response.
 */
export interface Paginated<T> {
  message: string;
  data: T[];
  pagination: PaginationInfo;
}

/**
 * Basic latitude/longitude object.
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Represents the logged-in student.
 * Based on userModel.js and getProfile controller.
 */
export interface User {
  _id: string;
  fullName: string;
  email: string;
  enrollmentNo: string;
  classYear: string;
  semester: string;
  division: string;
  role: 'student';
  hasFaceImage: boolean;
  createdAt: string;
}

/**
 * Represents a class the student is enrolled in.
 * Based on classModel.js (populated).
 */
export interface EnrolledClass {
  _id: string;
  classNumber: string;
  subjectCode: string;
  subjectName: string;
  classYear: string;
  semester: string;
  division: string;
  teacherId: string; // ID
  teacherName: string; // Populated by the backend
}

/**
 * Represents a class available for enrollment.
 * Based on getAvailableClasses controller.
 */
export interface AvailableClass {
  _id: string;
  classNumber: string;
  subjectCode: string;
  subjectName: string;
  classYear: string;
  semester: string;
  division: string;
  teacher: {
    _id: string;
    fullName: string;
    email: string;
  };
}

/**
 * Represents a single attendance record.
 * Based on getMyAttendanceRecords controller (populated).
 */
export interface AttendanceRecord {
  _id: string;
  sessionId: string; // Ref to QRCodeSession
  classId: { // Populated
    _id: string;
    subjectName: string;
    subjectCode: string;
  };
  scheduleId?: string; // Ref to ScheduleInstance
  studentCoordinates?: Coordinates;
  timestamp: string; // The ISO Date string of when attendance was marked
  livenessPassed: boolean;
  manualEntry: boolean;
  notes?: string;
}

/**
 * Represents an active attendance session.
 * Based on getActiveSessions controller (populated).
 */
export interface ActiveSession {
  _id: string;
  sessionId: string;
  isActive: boolean;
  sessionExpiresAt: string; // ISO Date string
  classId: { // Populated
    _id: string;
    subjectName: string;
    subjectCode: string;
    classNumber: string;
  };
}

/**
 * Represents the summary from /api/attendance/summary
 */
export interface AttendanceSummary {
  totalHeldSessions: number;
  totalAttendedSessions: number;
  totalMissedSessions: number;
  percentage: number;
}

// --- QR Code & Scanning ---

/**
 * The data structure parsed from the QR code.
 * Based on qrCodeSessionModel.js -> qrPayload.
 */
export interface ScannedQRData {
  classNumber: string;
  subjectCode: string;
  subjectName: string;
  classYear: string;
  semester: string;
  division: string;
  timestamp: string; // ISO Date string (token generation time)
  coordinates: Coordinates; // Teacher's coordinates
  sessionId: string;
  token: string;
}

/**
 * The response from the server after validating the scanned QR data.
 * Based on /api/qr/validate controller.
 */
export interface QRValidationResponse {
  valid: boolean;
  sessionId: string; // Confirmed session ID
  classId: string; // Confirmed class ID
  message?: string; // "Success" or error message
  classInfo: {
    classNumber: string;
    subjectCode: string;
    subjectName: string;
    classYear: string;
    semester: string;
    division: string;
  };
  coordinates: Coordinates; // Teacher's coordinates for proximity check
  timestamp: string; // ISO Date string
}

// --- API Request Payloads ---

/**
 * The payload sent to the server to mark attendance.
 * Based on /api/attendance controller.
 */
export interface AttendanceSubmission {
  sessionId: string;
  classId: string;
  studentCoordinates: Coordinates;
  livenessPassed: boolean;
  faceImage: string;
}

/**
 * A liveness challenge to complete
 */
export interface LivenessChallenge {
  type: 'neutral' | 'smile' | 'turn_left' | 'turn_right' | 'eyes_open' | 'look_up';
  instruction: string;
  icon: string;
}

/**
 * Payload for enhanced face verification with challenges
 */
export interface FaceVerificationSubmission {
  classId: string;
  studentCoordinates: Coordinates;
  challengeImages: Array<{
    challengeType: string;
    image: string; // base64
  }>;
}

/**
 * Response from GET /attendance/liveness/challenges
 */
export interface LivenessChallengesResponse {
  success: boolean;
  challenges: LivenessChallenge[];
  message: string;
}

/**
 * Response from POST /attendance/verify
 */
export interface FaceVerificationResponse {
  success: boolean;
  message: string;
  reason?: string;
  challengeResults?: Array<{
    challengeType: string;
    passed: boolean;
    message: string;
  }>;
  data?: {
    attendanceId: string;
    classId: string;
    timestamp: string;
    livenessScore: number;
    faceSimilarity: number;
  };
}

// --- API Response Payloads ---

/**
 * Standard response from a successful login or register.
 */
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * Response for offline-sync operations.
 */
export interface SyncResponse {
  message: string;
  results: { sessionId: string; status: string; message?: string }[];
}

/**
 * Response from GET /api/qr/session/status/:classId
 */
export interface SessionStatusResponse {
  isActive: boolean;
  session?: {
    _id: string;
    sessionId: string;
    classId: string;
    isActive: boolean;
    sessionExpiresAt: string;
  };
  message: string;
}

// --- UPDATED: Specific response for enrollment ---
export interface EnrollResponse {
  message: string;
  // Assuming backend returns the EnrolledClass object or similar
  data: EnrolledClass | { _id: string; [key: string]: any }; 
}