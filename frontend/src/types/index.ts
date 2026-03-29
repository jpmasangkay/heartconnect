// User types
export type UserRole = 'student' | 'client' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  skills?: string[];
  location?: string;
  university?: string;
  portfolio?: string;
  createdAt: string;
  // Verification
  isVerified?: boolean;
  verificationMethod?: 'school_email' | 'id_upload' | 'admin';
  verificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  // 2FA
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'totp' | 'email';
  // Onboarding
  hasCompletedOnboarding?: boolean;
  // Blocking
  blockedUsers?: string[];
  // Banning
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string;
  // Report tally (populated by admin endpoints)
  reportTally?: { reviewed: number; pending: number };
  // Legal consent
  agreedToTerms?: boolean;
}

// Auth types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  university?: string;
  agreedToTerms: boolean;
}

export interface LoginResponse {
  token?: string;
  user?: User;
  requires2FA?: boolean;
  tempToken?: string;
  twoFactorMethod?: 'totp' | 'email';
}

// Job types
export type JobStatus = 'open' | 'closed' | 'in-progress' | 'completed';
export type LocationType = 'remote' | 'on-site' | 'hybrid';

export interface Job {
  _id: string;
  title: string;
  description: string;
  budget: number;
  budgetType: 'fixed' | 'hourly';
  deadline: string;
  skills: string[];
  status: JobStatus;
  locationType: LocationType;
  client: User;
  applicationsCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Application types
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'finished';

export interface Application {
  _id: string;
  job: Job;
  applicant: User;
  coverLetter: string;
  proposedRate: number;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

// Message / Chat types
export interface Message {
  _id: string;
  conversation: string;
  sender: User;
  content: string;
  read: boolean;
  createdAt: string;
  // File attachments
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

export interface Conversation {
  _id: string;
  participants: User[];
  /** Null if the job was deleted but the conversation still exists */
  job: Job | null;
  lastMessage?: Message;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Notification types
export type NotificationType = 'application_new' | 'application_status' | 'message_new' | 'job_status' | 'review_new' | 'verification_status' | 'report_status';

export interface Notification {
  _id: string;
  recipient: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  relatedJob?: string;
  relatedApplication?: string;
  createdAt: string;
}

// Review types
export interface Review {
  _id: string;
  job: Job | { _id: string; title: string };
  reviewer: User | { _id: string; name: string; avatar?: string };
  reviewee: User | { _id: string; name: string; avatar?: string };
  rating: number;
  comment: string;
  createdAt: string;
}

// SavedJob types
export interface SavedJob {
  _id: string;
  user: string;
  job: Job;
  createdAt: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pages: number;
}

// Filter types
export interface JobFilters {
  search?: string;
  skill?: string;
  skills?: string;
  budgetMin?: number;
  budgetMax?: number;
  deadlineBefore?: string;
  deadlineAfter?: string;
  locationType?: LocationType;
  status?: JobStatus;
  page?: number;
  limit?: number;
}

// Report types
export type ReportTargetType = 'user' | 'job';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'fraud' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

export interface Report {
  _id: string;
  reporter: User | { _id: string; name: string; email: string; avatar?: string };
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  resolvedBy?: User | { _id: string; name: string };
  resolvedAt?: string;
  createdAt: string;
}
