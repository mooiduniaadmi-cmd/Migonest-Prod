
export type UserRole = 'STUDENT' | 'EXPERT' | 'ADMIN';

export type AdmissionStep =
  | 'REQUIREMENTS'
  | 'DOCUMENTS'
  | 'APPLICATION_FEE'
  | 'APPLIED'
  | 'ACCEPTANCE_LETTER'
  | 'VISA'
  | 'ADMITTED'
  | 'ACCOMMODATION';

export interface WalletEntry {
  id: string;
  profileId: string;
  type: 'PAYMENT' | 'WITHDRAWAL' | 'REFUND' | 'UNLOCK' | 'EARNING';
  amount: number;
  date: string;
  description: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'PENDING_APPROVAL';
  requestId?: string;
  counterpartyId?: string;
  counterpartyName?: string;
  counterpartyRole?: string;
  university?: string;
  country?: string;
  counterpartyAvatarUrl?: string;
}

export interface Document {
  id: string;
  name: string;
  type: 'PDF' | 'IMAGE' | 'DOC';
  url: string;
  uploadedBy: string; // Profile ID
  timestamp: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'SYSTEM' | 'WALLET' | 'ADMISSION' | 'CHAT' | 'POST';
}

export interface Review {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  authorRole: UserRole;
  rating: number;
  comment: string;
  timestamp: number;
}

export interface Profile {
  id: string;
  slug: string; // Unique URL identifier like Linkedin
  fullName: string;
  firstName?: string;
  lastName?: string;
  avatarUrl: string;
  coverPhotoUrl?: string;
  role: UserRole;
  email?: string;
  password?: string;
  dob?: string;
  gender?: string;
  authProvider?: string;
  isDobPrivate?: boolean;
  isGenderPrivate?: boolean;

  // Demographics
  homeCountries: string[];
  currentLocation: string;
  languages: string[];

  // Academic & Professional
  highestQualifications: string[];
  interestAreas: string[];
  currentStudies: string[];
  testScores: string;

  // Targets (Experts cover these, Students seek these)
  targetCountries: string[];
  targetDegree?: string[];

  // Expert specific
  hourlyRate?: number;
  earnings?: number;

  // Financials
  walletBalance: number;
  lockedBalance: number;
  walletHistory: WalletEntry[];

  // Student specific
  isSubscribed?: boolean;

  // Personal Library
  commonDocuments?: Document[];

  // Networking
  connections: string[]; // Array of Profile IDs
  reviews?: Review[];
  isOnboarded?: boolean;
  relevanceScore?: number;
  stripeConnectId?: string;
  payoutsEnabled?: boolean;
  subscriptionId?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
}

export interface MilestoneHistoryEntry {
  step: AdmissionStep;
  type: 'COMPLETED' | 'REJECTED';
  note: string;
  documentUrl?: string;
  timestamp: string;
  uploadedBy?: string;
}

export interface ExpertApplication {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatarUrl: string;
  data: any;
  timestamp: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ServiceRequest {
  id: string;
  studentId: string;
  expertId: string;
  expertFullName: string;
  studentFullName: string;
  expertAvatarUrl?: string;
  studentAvatarUrl?: string;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'PAID' | 'PENDING_PAYMENT' | 'REJECTED';


  currentStep: AdmissionStep;
  completedSteps: AdmissionStep[];
  isPendingStudentConfirmation?: boolean;
  isMilestoneRejected?: boolean;
  visaStatus?: 'PENDING' | 'APPROVED' | 'DENIED';
  visaDenialProofUrl?: string;
  rejectionCount?: number;
  type: 'FULL_ASSISTANCE';
  fee: number;
  platformFeePct: number;
  date: string;
  milestoneDates?: Record<string, string>;
  documents: Document[];
  hiringDocuments?: Document[];
  expertDocuments?: Document[];

  // Feedback
  studentFeedback?: string;
  expertFeedback?: string;
  studentRating?: number;
  expertRating?: number;
  rejectionFeedback?: { message: string, documentUrl?: string };
  completionFeedback?: { message: string, documentUrl?: string };
  milestoneHistory?: MilestoneHistoryEntry[];

  // Hiring Data
  questionnaire?: {
    nationality: string;
    residency: string;
    languages: string;
    lastEducation: string;
    targetCountries: string;
    targetUnis: string;
  };
  agreements?: {
    maxLimit: boolean;
    noResponsibility: boolean;
    refundPolicy: boolean;
  };
}

export interface AdmissionStepHandshake {
  currentStep: AdmissionStep;
  nextStep: AdmissionStep;
  completedSteps: AdmissionStep[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string;
  authorRole: UserRole;
  content: string;
  timestamp: number;
  likes: number;
  reposts: number;
  comments: number;
}