import { Profile, Post, AdmissionStep, ServiceRequest, AppNotification } from './types';

export const SERVICE_FEE = 299; // Total Admission Journey fee in USD (Reverted from testing)
export const PLATFORM_FEE_PERCENT = 20;
export const SUBSCRIPTION_FEE = 19.99;

export const ADMISSION_STAGES: { id: AdmissionStep; label: string; description: string; icon: string }[] = [
  { id: 'REQUIREMENTS', label: 'Requirements', description: 'Evaluation of academic eligibility and test scores.', icon: 'fa-list-check' },
  { id: 'DOCUMENTS', label: 'Documents', description: 'Preparation of SOP, LORs, and Transcripts.', icon: 'fa-file-lines' },
  { id: 'APPLICATION_FEE', label: 'Application Fee', description: 'Payment of university processing fees.', icon: 'fa-credit-card' },
  { id: 'APPLIED', label: 'Applied', description: 'Official submission of application to target universities.', icon: 'fa-paper-plane' },
  { id: 'ACCEPTANCE_LETTER', label: 'Acceptance Letter', description: 'Receipt of official offer letter from university.', icon: 'fa-envelope-open-text' },
  { id: 'VISA', label: 'Visa', description: 'Embassy appointment and visa documentation.', icon: 'fa-passport' },
  { id: 'ADMITTED', label: 'Admitted', description: 'Final enrollment and tuition deposit confirmed.', icon: 'fa-user-graduate' },
  { id: 'ACCOMMODATION', label: 'Accommodation', description: 'Securing student housing and travel prep.', icon: 'fa-house-chimney' },
];

export const INITIAL_POSTS: Post[] = [];
export const MOCK_SERVICE_REQUESTS: ServiceRequest[] = [];
export const MOCK_NOTIFICATIONS: AppNotification[] = [];
export const MOCK_EXPERTS_LIST: Profile[] = [];
export const MOCK_STUDENTS_LIST: Profile[] = [];
