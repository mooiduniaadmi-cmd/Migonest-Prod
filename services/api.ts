import { createClient } from '@supabase/supabase-js';
import {
  Profile,
  Post,
  ServiceRequest,
  AppNotification,
  Document,
  ExpertApplication,
  WalletEntry,
  AdmissionStep,
  ChatMessage,
  AdmissionStepHandshake,
  MilestoneHistoryEntry
} from '../types';

const normalizeSupabaseUrl = (url: string) => {
  if (url.includes('api.migonest.com')) return 'https://gwengahnqgvwoletcovl.supabase.co';
  if (url.includes('api-staging.migonest.com')) return 'https://kogedepjtwfritbzshgq.supabase.co';
  if (url.includes('staging.migonest.com')) return 'https://kogedepjtwfritbzshgq.supabase.co';
  if (url.includes('dev.migonest.com')) return 'https://kogedepjtwfritbzshgq.supabase.co'; // Assuming dev uses staging DB for now
  return url;
};

const getSupabaseUrl = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;

  // Force staging if we detect we are in the staging or dev app bundle
  if (typeof window !== 'undefined' && (window.location.hostname.includes('staging') || window.location.hostname.includes('dev'))) {
    return 'https://kogedepjtwfritbzshgq.supabase.co';
  }

  if (envUrl) return normalizeSupabaseUrl(envUrl);

  return 'https://gwengahnqgvwoletcovl.supabase.co';
};

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_TXOoQwjKstDMsMh04S4GEg_NXVoBOdp';
export const SERVICE_REQUEST_SELECT = '*, documents(*), student:student_id(full_name, avatar_url), expert:expert_id(full_name, avatar_url)';

const getCustomBeUrl = () => {
  let envUrl = import.meta.env.VITE_CUSTOM_BE_URL;

  // Auto-correct if environment variable is still pointing to the legacy/broken custom subdomain
  if (envUrl && (envUrl.includes('api-staging.migonest.com') || envUrl.includes('api.migonest.com'))) {
    envUrl = undefined; // Fall back to relative /api
  }

  // Detection for mobile app (Capacitor) vs browser
  const isCapacitor = typeof window !== 'undefined' && (
     (window as any).Capacitor !== undefined || 
     window.location.protocol === 'capacitor:' || 
     (window.location.hostname === 'localhost' && window.location.protocol === 'https:') // Modern Android scheme
  );
  
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isMigonestDomain = typeof window !== 'undefined' && (
    window.location.hostname.includes('migonest.com') || 
    window.location.hostname.includes('vercel.app')
  );

  // 1. If we are in a BROWSER on a migonest or vercel domain, use relative /api for same-origin stability.
  // This avoids CORS preflight issues and handles staging/production automatically.
  if (typeof window !== 'undefined' && isMigonestDomain) {
    console.log('[API] Web Browser: Using relative /api for same-origin stability');
    return '/api';
  }

  // 2. If we are in Capacitor (Native App), we MUST use an absolute URL.
  if (isCapacitor) {
    const isStaging = import.meta.env.VITE_SUPABASE_URL?.includes('kogedepjtwfritbzshgq') ||
      window.location.hostname.includes('staging');

    if (isStaging) {
      console.log('[API] Capacitor Staging: Using primary staging domain');
      return 'https://staging.migonest.com/api';
    }
    console.log('[API] Capacitor Production: Using direct Vercel domain');
    return 'https://migonest-prod.vercel.app/api';
  }


  // 3. Fallback for localhost or other environments
  if (isLocalhost) {
    return '/api';
  }

  // If no env url, use relative /api
  if (!envUrl) return '/api';

  // Ensure it has /api prefix
  const base = envUrl.replace(/\/$/, '');
  if (!base.endsWith('/api')) {
    return `${base}/api`;
  }
  return base;
};
const CUSTOM_BE_URL = getCustomBeUrl();
console.log('[API] Using Supabase URL:', SUPABASE_URL);
console.log('[API] Custom Backend URL:', CUSTOM_BE_URL);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  }
});

// Global refresh lock to prevent parallel refresh token conflicts (Supabase Auth race conditions)
let refreshPromise: Promise<any> | null = null;

/**
 * Safely get the current session, ensuring that if a refresh is needed, 
 * parallel calls share the same refresh promise.
 */
export const safeGetSession = async () => {
  if (refreshPromise) {
    console.log('[Auth API] Awaiting existing refresh promise...');
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      console.log('[Auth API] safeGetSession: Fetching from Supabase...');
      const result = await supabase.auth.getSession();
      
      if (result.error) {
        console.error('[Auth API] safeGetSession error:', result.error.message);
      } else if (result.data.session) {
        console.log('[Auth API] safeGetSession success: Session restored for:', result.data.session.user.id);
      } else {
        console.warn('[Auth API] safeGetSession: No active session found.');
      }
      
      return result;
    } catch (err) {
      console.error('[Auth API] safeGetSession unexpected failure:', err);
      throw err;
    } finally {
      setTimeout(() => { refreshPromise = null; }, 50);
    }
  })();

  return refreshPromise;
};

/**
 * Safely get the current user, ensuring that parallel refresh attempts are serialized.
 */
export const safeGetUser = async () => {
  if (refreshPromise) {
    await refreshPromise; // Wait for any existing refresh to complete
  }
  // supabase.auth.getUser() triggers a refresh if needed internally.
  // We wrap it in the same promise lock to be absolutely sure.
  refreshPromise = (async () => {
    try {
      return await supabase.auth.getUser();
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
};

export const DEFAULT_AVATAR = '/assets/default-avatar.png';
export const DEFAULT_COVER = '/assets/default-cover.png';

// Centralized Site URL detection for redirects
const getSiteUrl = () => {
  const envUrl = import.meta.env.VITE_SITE_URL;
  let url = envUrl || window.location.origin;

  // Aggressively ensure www. for production migonest.com domain
  // But avoid breaking subdomains like staging.migonest.com or api.migonest.com
  if (url.includes('migonest.com') && !url.includes('www.') && !url.includes('api.') && !url.includes('staging.')) {
    url = url.replace('migonest.com', 'www.migonest.com');
  }

  return url.replace(/\/$/, ''); // Remove trailing slash if any
};

// Utility to wrap any promise in a timeout
async function withTimeout<T>(promise: any, timeoutMs = 10000, context = 'Query'): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      console.warn(`[API] ${context} timed out after ${timeoutMs}ms`);
      reject(new Error(`${context} timeout`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (err) {
    clearTimeout(timeoutHandle!);
    throw err;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(endpoint: string, options: RequestInit = {}, isCustom = false, timeoutMs = 15000) {
  const url = isCustom ? `${CUSTOM_BE_URL}${endpoint}` : `${SUPABASE_URL}/rest/v1${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${localStorage.getItem('migonest_token') || ''}`,
    ...options.headers,
  };

  let lastError: any;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 500; // Exponential backoff: 1s, 2s
        console.warn(`[API] Retrying ${endpoint} (Attempt ${attempt}/${maxRetries}) after ${delay}ms...`);
        await sleep(delay);
      }

      const fetchPromise = fetch(url, { ...options, headers });
      const response = await withTimeout<Response>(fetchPromise, timeoutMs, `API ${endpoint}`);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const error = await response.json().catch(() => ({ message: 'Network error' }));
          const errorMessage = error.error || error.message || `Request failed: ${response.status}`;
          throw new Error(errorMessage);
        } else {
          const text = await response.text().catch(() => '');
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            throw new Error(`Server returned an error page (${response.status}). This often happens when the server is down or Vercel blocks the request. Body: ${text.substring(0, 100)}...`);
          }
          throw new Error(`Server error (${response.status}). Please try again.`);
        }
      }

      if (response.status === 204) return null;

      // Read body as text first to avoid "Unexpected token <" crash on non-JSON 200 responses
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        const contentType = response.headers.get('content-type') || '';
        console.error(`[API] JSON Parse Error for ${endpoint}:`, e, "Body snippet:", text.substring(0, 100));
        
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            throw new Error(`Server returned an HTML page instead of JSON. This may be a redirect or a proxy error. Content-Type: ${contentType}. Body: ${text.substring(0, 50)}...`);
        }
        throw new Error(`Authentication/JSON Error: Failed to parse server response. Content-Type: ${contentType}. Body: ${text.substring(0, 50)}...`);
      }
    } catch (err: any) {
      lastError = err;
      
      // Specifically retry on fetch failures (TypeError) or timeout errors
      const isNetworkError = err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('timeout');
      const isIdempotent = !options.method || options.method === 'GET';

      if (isNetworkError && isIdempotent && attempt < maxRetries) {
        continue; // Try again
      }
      
      throw err; // Permanent error or out of retries
    }
  }

  throw lastError; // Should not reach here
}

export const createDefaultProfile = (id: string, email?: string): Profile => ({
  id,
  email: email || '',
  fullName: 'New User',
  firstName: '',
  lastName: '',
  avatarUrl: DEFAULT_AVATAR,
  role: 'STUDENT',
  walletBalance: 0,
  lockedBalance: 0,
  isOnboarded: false,
  isSubscribed: false,
  homeCountries: [],
  languages: [],
  highestQualifications: [],
  interestAreas: [],
  currentStudies: [],
  targetCountries: [],
  commonDocuments: [],
  connections: [],
  walletHistory: [],
  reviews: [],
  relevanceScore: 0,
  targetDegree: [],
  slug: id,
  currentLocation: '',
  testScores: ''
});

export const api = {
  mapProfileFromDB(data: any): Profile {
    return {
      ...data,
      fullName: data.full_name,
      firstName: data.first_name,
      lastName: data.last_name,
      avatarUrl: data.avatar_url,
      coverPhotoUrl: data.cover_photo_url,
      homeCountries: data.home_countries || [],
      currentLocation: data.current_location,
      languages: data.languages || [],
      highestQualifications: data.highest_qualifications || [],
      interestAreas: data.interest_areas || [],
      currentStudies: data.current_studies || [],
      targetCountries: data.target_countries || [],
      walletBalance: Number(data.wallet_balance || 0),
      lockedBalance: Number(data.locked_balance || 0),
      isSubscribed: data.is_subscribed,
      isOnboarded: data.is_onboarded,
      commonDocuments: data.common_documents || [],
      connections: data.connections || [],
      walletHistory: data.wallet_history || [],
      reviews: data.reviews || [],
      gender: data.gender,
      authProvider: data.auth_provider,
      isDobPrivate: data.is_dob_private,
      isGenderPrivate: data.is_gender_private,
      relevanceScore: data.relevance_score,
      targetDegree: data.target_degree || [],
      testScores: data.test_scores,
      hourlyRate: data.hourly_rate,
      earnings: data.earnings,
      stripeConnectId: data.stripe_connect_id,
      payoutsEnabled: data.payouts_enabled,
      subscriptionId: data.subscription_id,
      currentPeriodEnd: data.current_period_end ? Number(data.current_period_end) : undefined
    };
  },

  mapServiceRequestFromDB(data: any): ServiceRequest {
    return {
      ...data,
      studentId: data.student_id,
      expertId: data.expert_id,
      currentStep: data.current_step,
      isPendingStudentConfirmation: data.is_pending_student_confirmation,
      isMilestoneRejected: data.is_milestone_rejected,
      completionFeedback: data.completion_feedback,
      rejectionFeedback: data.rejection_feedback,
      milestoneHistory: (data.milestone_history || []).map((h: any) => ({
        step: h.step,
        type: h.type,
        note: h.note || h.message || '',
        documentUrl: h.documentUrl || h.document_url,
        timestamp: h.timestamp,
        uploadedBy: h.uploadedBy || h.uploaded_by
      })),
      type: 'FULL_ASSISTANCE',
      fee: data.fee,
      platformFeePct: data.platform_fee_pct,
      paymentPlan: data.payment_plan,
      installmentsPaid: data.installments_paid,
      stripeSubscriptionId: data.stripe_subscription_id,
      isLocked: data.is_locked,
      student: data.student ? {
        fullName: data.student.full_name,
        avatarUrl: data.student.avatar_url,
      } : undefined,
      expert: data.expert ? {
        fullName: data.expert.full_name,
        avatarUrl: data.expert.avatar_url,
      } : undefined,
      studentFullName: data.student?.full_name || 'Student',
      expertFullName: data.expert?.full_name || 'Expert',
      studentAvatarUrl: data.student?.avatar_url || DEFAULT_AVATAR,
      expertAvatarUrl: data.expert?.avatar_url || DEFAULT_AVATAR,
      completedSteps: data.completed_steps || [],
      visaStatus: data.visa_status,
      studentRating: data.student_rating,
      studentFeedback: data.student_feedback,
      expertRating: data.expert_rating,
      expertFeedback: data.expert_feedback,
      visaDenialProofUrl: data.visa_denial_proof_url,
      rejectionCount: data.rejection_count,
      milestoneDates: data.milestone_dates || {},
      date: data.created_at ? (() => {
        const d = new Date(data.created_at);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
      })() : '--.--.----',
      documents: data.documents ? data.documents.map((d: any) => ({
        id: d.id,
        name: d.name,
        url: d.url,
        type: d.type,
        timestamp: d.timestamp,
        uploadedBy: d.uploaded_by
      })) : []
    };
  },

  mapWalletEntryFromDB(data: any): WalletEntry {
    return {
      id: data.id,
      profileId: data.profile_id,
      type: data.type,
      amount: Number(data.amount),
      date: data.created_at,
      description: data.description,
      status: data.status,
      requestId: data.request_id,
      counterpartyId: data.counterparty_id,
      counterpartyName: data.counterparty_name,
      counterpartyRole: data.counterparty_role,
      counterpartyAvatarUrl: data.counterparty_avatar_url || data.counterparty?.avatar_url,
      university: data.university,
      country: data.country
    };
  },

  async getSessionProfile(userId?: string): Promise<Profile | null> {
    try {
      const userRes = await safeGetUser();
      const id = userId || userRes.data.user?.id;
      if (!id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      const profile = this.mapProfileFromDB(data);
      if (userRes.data.user) {
        profile.authProvider = userRes.data.user.app_metadata?.provider || (userRes.data.user.app_metadata?.providers && userRes.data.user.app_metadata.providers[0]);
      }
      return profile;
    } catch (err) {
      console.error('[API] getSessionProfile error:', err);
      return null;
    }
  },

  async signIn(email: string, password: string): Promise<void> {
    // 1. Check lockout status before attempting to sign in
    const { data: isLocked } = await supabase.rpc('check_login_lockout', { p_email: email });
    if (isLocked === true) {
      const lockError: any = new Error('locked out');
      lockError.status = 429;
      throw lockError;
    }

    // 2. Attempt Supabase Auth sign in
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      // 3. Increment fail count on bad credentials
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        await supabase.rpc('record_failed_login', { p_email: email });
      }
      throw error;
    }

    // 4. On successful sign-in, wipe the fail counter
    await supabase.rpc('reset_login_attempts', { p_email: email });
  },

  async signUp(email: string, password: string, metadata: any): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${getSiteUrl()}/onboarding`
      }
    });
    if (error) throw error;
  },

  async checkEmailExists(email: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  },

  async getProfileProvider(email: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('auth_provider')
      .eq('email', email)
      .maybeSingle();
    if (error) return null;
    return data?.auth_provider || null;
  },

  async resendVerificationEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${getSiteUrl()}/onboarding`
      }
    });
    if (error) throw error;
  },

  async resetPasswordForEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/reset-password`,
    });
    if (error) throw error;
  },

  async getProfileBySlug(slug: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapProfileFromDB(data) : null;
  },

  async createProfile(profile: Profile): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: profile.id,
        email: profile.email,
        full_name: profile.fullName,
        first_name: profile.firstName,
        last_name: profile.lastName,
        avatar_url: profile.avatarUrl,
        role: profile.role,
        is_onboarded: profile.isOnboarded,
        is_subscribed: profile.isSubscribed
      });

    if (error) throw error;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
    const dbUpdates: any = {};

    // Direct mappings (snake_case in DB)
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.coverPhotoUrl !== undefined) dbUpdates.cover_photo_url = updates.coverPhotoUrl;
    if (updates.homeCountries !== undefined) dbUpdates.home_countries = updates.homeCountries;
    if (updates.currentLocation !== undefined) dbUpdates.current_location = updates.currentLocation;
    if (updates.languages !== undefined) dbUpdates.languages = updates.languages;
    if (updates.highestQualifications !== undefined) dbUpdates.highest_qualifications = updates.highestQualifications;
    if (updates.interestAreas !== undefined) dbUpdates.interest_areas = updates.interestAreas;
    if (updates.currentStudies !== undefined) dbUpdates.current_studies = updates.currentStudies;
    if (updates.targetCountries !== undefined) dbUpdates.target_countries = updates.targetCountries;
    if (updates.targetDegree !== undefined) dbUpdates.target_degree = updates.targetDegree;
    if (updates.isOnboarded !== undefined) dbUpdates.is_onboarded = updates.isOnboarded;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.dob !== undefined) dbUpdates.dob = updates.dob;
    if (updates.isDobPrivate !== undefined) dbUpdates.is_dob_private = updates.isDobPrivate;
    if (updates.isGenderPrivate !== undefined) dbUpdates.is_gender_private = updates.isGenderPrivate;
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.isSubscribed !== undefined) dbUpdates.is_subscribed = updates.isSubscribed;
    if (updates.commonDocuments !== undefined) dbUpdates.common_documents = updates.commonDocuments;
    if (updates.testScores !== undefined) dbUpdates.test_scores = updates.testScores;
    if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId);

    if (error) throw error;
  },

  async getProfiles(role?: string, query?: string, page: number = 0, limit: number = 20, ids?: string[]): Promise<{ profiles: Profile[], hasMore: boolean }> {
    // If there's a search query, use the RPC for multi-field array search
    if (query) {
      try {
        const { data, error } = await supabase.rpc('search_profiles_v2', {
          p_role: role || 'STUDENT',
          p_query: query,
          p_limit: limit,
          p_offset: page * limit
        });

        if (error) {
          console.error('[API] Search RPC error:', error);
          return { profiles: [], hasMore: false };
        }

        const profiles = (data.profiles || []).map((p: any) => this.mapProfileFromDB(p));
        const count = data.total_count || 0;
        const hasMore = (page + 1) * limit < count;
        return { profiles, hasMore };
      } catch (e) {
        console.error('[API] Search Exception:', e);
        return { profiles: [], hasMore: false };
      }
    }

    // Default path for Discover tab or specific ids
    let supabaseQuery = supabase.from('profiles').select('*', { count: 'exact' });

    if (role) supabaseQuery = supabaseQuery.eq('role', role);
    if (ids && ids.length > 0) supabaseQuery = supabaseQuery.in('id', ids);

    supabaseQuery = supabaseQuery
      .order('full_name', { ascending: true })
      .range(page * limit, (page + 1) * limit - 1);

    try {
      const { data, error, count } = await withTimeout<{ data: any; error: any; count: number | null }>(supabaseQuery, 10000, 'getProfiles');
      if (error) return { profiles: [], hasMore: false };
      const profiles = (data || []).map((p: any) => this.mapProfileFromDB(p));
      const hasMore = count ? (page + 1) * limit < count : false;
      return { profiles, hasMore };
    } catch (e) {
      return { profiles: [], hasMore: false };
    }
  },

  async getExperts(): Promise<Profile[]> {
    const query = supabase.from('profiles').select('*').eq('role', 'EXPERT');
    try {
      const { data, error } = await withTimeout<{ data: any; error: any }>(query, 10000, 'getExperts');
      if (error) return [];
      return (data || []).map((p: any) => this.mapProfileFromDB(p));
    } catch (e) {
      return [];
    }
  },

  async getAllStudents(): Promise<Profile[]> {
    const query = supabase.from('profiles').select('*').eq('role', 'STUDENT');
    try {
      const { data, error } = await withTimeout<{ data: any; error: any }>(query, 10000, 'getAllStudents');
      if (error) return [];
      return (data || []).map((p: any) => this.mapProfileFromDB(p));
    } catch (e) {
      return [];
    }
  },

  async getServiceRequestsPaginated(userId: string, subView: string | null = null, query: string = '', year: string = 'All Years', page: number = 0, limit: number = 20): Promise<{ requests: ServiceRequest[], hasMore: boolean }> {

    let supabaseQuery = supabase
      .from('service_requests')
      .select(SERVICE_REQUEST_SELECT, { count: 'exact' })
      .or(`student_id.eq.${userId},expert_id.eq.${userId}`);

    if (subView === 'ACTIVE') {
      supabaseQuery = supabaseQuery.or('status.eq.PAID,status.eq.PENDING_PAYMENT');
    } else if (subView === 'SUCCESSFUL') {
      // Successful if status is COMPLETED and visa is NOT DENIED
      supabaseQuery = supabaseQuery.eq('status', 'COMPLETED').or('visa_status.is.null,visa_status.neq.DENIED');
    } else if (subView === 'REJECTED') {
      // Simple OR for any rejected status or visa denial
      supabaseQuery = supabaseQuery.or('status.eq.REJECTED,visa_status.eq.DENIED');
    }


    if (query) {
      supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    if (year && year !== 'All Years') {
      const yearStart = `${year}-01-01T00:00:00Z`;
      const yearEnd = `${year}-12-31T23:59:59Z`;
      supabaseQuery = supabaseQuery.gte('created_at', yearStart).lte('created_at', yearEnd);
    }

    supabaseQuery = supabaseQuery
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    try {
      const { data, error, count } = await withTimeout<{ data: any; error: any; count: number | null }>(supabaseQuery, 10000, 'getServiceRequestsPaginated');
      if (error) throw error;
      
      let requests = (data || []).map((sr: any) => this.mapServiceRequestFromDB(sr));
      
      const hasMore = count ? (page + 1) * limit < count : false;
      return { requests, hasMore };
    } catch (e) {

      return { requests: [], hasMore: false };
    }
  },

  async getServiceRequestById(id: string): Promise<ServiceRequest | null> {
    const { data, error } = await supabase
      .from('service_requests')
      .select('*, documents(*), student:student_id(full_name, avatar_url), expert:expert_id(full_name, avatar_url)')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this.mapServiceRequestFromDB(data);
  },

  async syncStatus(id: string): Promise<{ success: boolean; status: string; source: string }> {
    return request(`/requests/${id}/sync-status`, {}, true);
  },

  async getServiceRequests(userId: string): Promise<ServiceRequest[]> {
    const query = supabase
      .from('service_requests')
      .select(SERVICE_REQUEST_SELECT)
      .or(`student_id.eq.${userId},expert_id.eq.${userId}`)
      // Allow students to see their own pending payments, but hide them from experts
      .or(`status.neq.PENDING_PAYMENT,student_id.eq.${userId}`)
      .order('created_at', { ascending: false });


    try {
      const { data, error } = await withTimeout<{ data: any; error: any }>(query, 10000, 'getServiceRequests');
      if (error) return [];
      return (data || []).map((sr: any) => this.mapServiceRequestFromDB(sr));
    } catch (e) {
      return [];
    }
  },

  async createDocument(requestId: string, doc: { name: string, url: string, type: string, uploadedBy: string }): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        request_id: requestId,
        name: doc.name,
        url: doc.url,
        type: doc.type,
        uploaded_by: doc.uploadedBy
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      url: data.url,
      type: data.type,
      timestamp: data.timestamp,
      uploadedBy: data.uploaded_by
    };
  },

  async renameDocument(id: string, name: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update({ name })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async createServiceRequest(payload: any): Promise<ServiceRequest> {
    const result = await request('/hire', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, true);
    return result.request;
  },

  async initiateExpertHire(payload: { studentId: string, expertId: string, questionnaire: any, agreements: any, hiringDocuments: any[], platform?: string, paymentPlan?: string }): Promise<{ success: boolean, url?: string, requestId?: string }> {
    return await withTimeout<{ success: boolean, url?: string, requestId?: string }>(request('/hire', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, true), 30000, 'Hire Expert');
  },

  async resumeServiceRequestPayment(requestId: string, platform?: string): Promise<{ success: boolean, url?: string }> {
    return await request(`/requests/${requestId}/resume-payment`, {
      method: 'POST',
      body: platform ? JSON.stringify({ platform }) : undefined
    }, true);
  },

  async cancelServiceRequest(requestId: string): Promise<{ success: boolean }> {
    return await request(`/requests/${requestId}`, {
      method: 'DELETE'
    }, true);
  },



  // Legacy for compatibility - should be replaced by initiateExpertHire
  async createServiceRequestMock(payload: { studentId: string, expertId: string, questionnaire: any, agreements: any, hiringDocuments: any[] }): Promise<ServiceRequest> {
    const { data, error } = await supabase
      .from('service_requests')
      .insert({
        student_id: payload.studentId,
        expert_id: payload.expertId,
        status: 'PAID',
        current_step: 'REQUIREMENTS',
        questionnaire: payload.questionnaire,
        agreements: payload.agreements,
        hiring_documents: payload.hiringDocuments,
        fee: 599,
        platform_fee_pct: 20
      })
      .select()
      .single();

    if (error) throw error;

    const { data: fullData } = await supabase
      .from('service_requests')
      .select(SERVICE_REQUEST_SELECT)
      .eq('id', data.id)
      .single();

    return this.mapServiceRequestFromDB(fullData || data);
  },

  async hireExpert(payload: any): Promise<void> {
    return request('/hire', { method: 'POST', body: JSON.stringify(payload) }, true);
  },

  async expertMarkMilestone(id: string, feedback?: { message: string, documentUrl?: string }, userId?: string): Promise<void> {
    return request(`/requests/${id}/handshake/expert`, {
      method: 'PUT',
      body: JSON.stringify({ feedback, userId })
    }, true);
  },

  async studentRejectMilestone(id: string, feedback: { message: string, documentUrl?: string }, nextCount: number, userId?: string): Promise<void> {
    return request(`/requests/${id}/handshake/reject`, {
      method: 'PUT',
      body: JSON.stringify({ feedback, nextCount, userId })
    }, true);
  },

  async studentApproveMilestone(id: string, currentStep: AdmissionStep, nextStep: AdmissionStep, completedSteps: AdmissionStep[]): Promise<void> {
    return request(`/requests/${id}/handshake/student`, {
      method: 'PUT',
      body: JSON.stringify({ currentStep, nextStep, completedSteps })
    }, true);
  },

  async confirmVisaDenial(id: string): Promise<void> {
    return request(`/requests/${id}/deny-confirm`, { method: 'POST' }, true);
  },

  async reportVisaRejection(requestId: string, proofUrl: string): Promise<void> {
    return request(`/requests/${requestId}/report-visa-rejection`, {
      method: 'POST',
      body: JSON.stringify({ proofUrl })
    }, true);
  },

  async expertVerifyRejection(requestId: string): Promise<void> {
    return this.confirmVisaDenial(requestId);
  },


  async updateJourneyReview(requestId: string, role: 'STUDENT' | 'EXPERT', rating: number, feedback: string): Promise<void> {
    const update: any = {};
    if (role === 'STUDENT') {
      update.student_rating = rating;
      update.student_feedback = feedback;
    } else {
      update.expert_rating = rating;
      update.expert_feedback = feedback;
    }

    const { error } = await supabase
      .from('service_requests')
      .update(update)
      .eq('id', requestId);
    if (error) throw error;
  },

  // Wallet
  async requestWithdrawal(userId: string, amount: number): Promise<any> {
    return request('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ userId, amount })
    }, true, 60000); // 60s timeout for Stripe transfers
  },

  async createConnectAccountLink(userId: string, email?: string, country?: string, platform?: string): Promise<{ url: string }> {
    return request('/connect/create-account-link', {
      method: 'POST',
      body: JSON.stringify({ userId, email, country, platform })
    }, true);
  },

  async getConnectAccountStatus(userId: string): Promise<{ payouts_enabled: boolean, stripe_connect_id: string | null }> {
    return request(`/connect/account-status?userId=${userId}`, {
      method: 'GET'
    }, true);
  },

  async createConnectLoginLink(userId: string): Promise<{ url: string }> {
    return await request('/connect/login-link', {
      method: 'POST',
      body: JSON.stringify({ userId })
    }, true);
  },

  async getWalletTransactionsPaginated(userId: string, query: string, year: string, page: number = 0, limit: number = 20): Promise<{ transactions: WalletEntry[], hasMore: boolean }> {
    let supabaseQuery = supabase
      .from('wallet_entries')
      .select('*, counterparty:profiles!counterparty_id(avatar_url)', { count: 'exact' })
      .eq('profile_id', userId);

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      supabaseQuery = supabaseQuery.or(`description.ilike.${q},counterparty_name.ilike.${q},counterparty_role.ilike.${q},university.ilike.${q},country.ilike.${q}`);
    }

    if (year && year !== 'All Years') {
      const yearStart = `${year}-01-01T00:00:00Z`;
      const yearEnd = `${year}-12-31T23:59:59Z`;
      supabaseQuery = supabaseQuery.gte('created_at', yearStart).lte('created_at', yearEnd);
    }

    supabaseQuery = supabaseQuery
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    try {
      const { data, error, count } = await withTimeout<{ data: any; error: any; count: number | null }>(supabaseQuery, 10000, 'getWalletTransactionsPaginated');
      if (error) throw error;
      const transactions = (data || []).map((t: any) => this.mapWalletEntryFromDB(t));
      const hasMore = count ? (page + 1) * limit < count : false;
      return { transactions, hasMore };
    } catch (err: any) {
      console.error('[API] getWalletTransactionsPaginated error:', err.message);
      return { transactions: [], hasMore: false };
    }
  },

  async getPendingWithdrawals(): Promise<WalletEntry[]> {
    const { data, error } = await supabase
      .from('wallet_entries')
      .select('*')
      .eq('status', 'PENDING_APPROVAL')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((t: any) => this.mapWalletEntryFromDB(t));
  },

  async approveWithdrawal(withdrawalId: string): Promise<void> {
    return await request('/admin/approve-withdrawal', {
      method: 'POST',
      body: JSON.stringify({ withdrawalId })
    }, true);
  },

  // Community
  async getPosts(page: number = 0, pageSize: number = 20, authorIds?: string[]): Promise<{ posts: Post[], hasMore: boolean }> {
    let query = supabase
      .from('posts')
      .select('*, author:profiles(id, full_name, avatar_url, role)', { count: 'exact' });

    if (authorIds && authorIds.length > 0) {
      query = query.in('author_id', authorIds);
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    query = query
      .order('timestamp', { ascending: false })
      .range(from, to);

    try {
      const { data, error, count } = await withTimeout<{ data: any; error: any; count: number | null }>(query, 10000, 'getPosts');
      if (error) return { posts: [], hasMore: false };

      const posts = (data || []).map((p: any) => ({
        ...p,
        authorId: p.author_id,
        authorName: p.author?.full_name,
        authorAvatarUrl: p.author?.avatar_url,
        authorRole: p.author?.role,
        reposts: p.reposts || 0
      }));

      const hasMore = count ? (from + posts.length) < count : false;

      return { posts, hasMore };
    } catch (e) {
      return { posts: [], hasMore: false };
    }
  },

  async createPost(post: Partial<Post>): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: post.authorId,
        content: post.content
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      authorId: data.author_id,
      content: data.content,
      likes: data.likes || 0,
      reposts: data.reposts || 0,
      comments: data.comments || 0,
      timestamp: data.timestamp,
      authorName: '',
      authorAvatarUrl: '',
      authorRole: 'STUDENT'
    };
  },

  async updatePost(postId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('posts')
      .update({ content })
      .eq('id', postId);
    if (error) throw error;
  },

  async deletePost(postId: string): Promise<void> {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);
    if (error) throw error;
  },

  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean, newCount: number }> {
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id);
      await supabase.rpc('decrement_post_likes', { post_id: postId });
    } else {
      const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
      if (error && error.code === '23505') {
        // Already liked by someone else or another tab in the meantime
        // Just proceed to get the latest count
      } else if (error) {
        throw error;
      } else {
        await supabase.rpc('increment_post_likes', { post_id: postId });
      }
    }
    
    const { data: post } = await supabase.from('posts').select('likes').eq('id', postId).single();
    return { liked: !existing, newCount: post?.likes || 0 };
  },

  async getUserLikes(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId);
    return (data || []).map(l => l.post_id);
  },

  async getUserReposts(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('post_reposts')
      .select('post_id')
      .eq('user_id', userId);
    return (data || []).map(r => r.post_id);
  },

  // Notifications
  mapNotificationFromDB(data: any): AppNotification {
    return {
      id: data.id,
      title: data.title,
      message: data.message,
      timestamp: data.timestamp,
      read: data.read,
      type: data.type
    };
  },

  async getNotifications(userId: string): Promise<AppNotification[]> {
    const query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    try {
      const { data, error } = await withTimeout<{ data: any; error: any }>(query, 10000, 'getNotifications');
      if (error) return [];
      return data || [];
    } catch (e) {
      return [];
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) throw error;
  },

  async createNotification(userId: string, title: string, message: string, type: 'SYSTEM' | 'WALLET' | 'ADMISSION' | 'CHAT' | 'POST'): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        read: false,
        timestamp: Date.now()
      });
    if (error) console.error("Failed to create notification", error);
  },

  // Storage
  async uploadFile(bucket: string, path: string, file: File | Blob): Promise<string> {
    let lastError: any;
    for (let i = 0; i < 3; i++) {
      try {
        const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
          upsert: true
        });
        
        if (error) {
          const isAbort = error.name === 'AbortError' || error.message?.toLowerCase().includes('abort');
          if (isAbort) {
            console.warn(`[API] Upload aborted, retry attempt ${i + 1}/3...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            continue;
          }
          throw error;
        }

        if (!data) throw new Error('Upload failed: No data returned');

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
        if (bucket === 'documents' || bucket === 'admission-documents' || bucket === 'hiring-documents') {
          return publicUrl.replace('/public/', '/authenticated/');
        }
        return publicUrl;
      } catch (err: any) {
        lastError = err;
        const isAbort = err.name === 'AbortError' || err.message?.toLowerCase().includes('abort');
        if (isAbort) {
          console.warn(`[API] Upload caught AbortError, retry attempt ${i + 1}/3...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  },

  async getFileUrl(bucket: string, path: string, isPublic: boolean = true, download: boolean = false): Promise<string> {
    if (isPublic) {
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path, { download });
      return publicUrl;
    } else {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600, { download });
      if (error) throw error;
      return data.signedUrl;
    }
  },

  // Chat
  mapMessageFromDB(data: any): ChatMessage {
    return {
      id: data.id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      text: data.content,
      timestamp: new Date(data.created_at).getTime(),
      read: data.read
    };
  },

  async getMessages(userId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API] getMessages error:', error);
      return [];
    }
    return (data || []).map(this.mapMessageFromDB);
  },

  async sendMessage(senderId: string, receiverId: string, content: string): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: content,
        read: false
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapMessageFromDB(data);
  },

  async updateMessage(id: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ content })
      .eq('id', id);
    if (error) throw error;
  },

  async deleteMessage(id: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async deleteChatHistory(userId: string, partnerId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`);

    if (error) throw error;
  },

  async markMessagesRead(senderId: string, receiverId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', receiverId)
      .eq('read', false); // Only update unread ones
    if (error) throw error;
  },

  mapExpertApplicationFromDB(item: any): ExpertApplication {
    if (!item) return item;
    return {
      id: item.id,
      studentId: item.student_id,
      studentName: item.student_name,
      studentAvatarUrl: item.student_avatar_url,
      data: item.data,
      timestamp: (item.timestamp || item.created_at) ? new Date(item.timestamp || item.created_at).getTime() : Date.now(),
      status: item.status
    };
  },

  async getExpertApplications(): Promise<ExpertApplication[]> {
    const { data, error } = await supabase
      .from('expert_applications')
      .select('*, applicant:profiles(full_name, avatar_url, email)');
    if (error) throw error;
    return (data || []).map(item => this.mapExpertApplicationFromDB(item));
  },

  async getExpertApplicationsPaginated(status: string | null = null, page: number = 0, limit: number = 20): Promise<{ applications: ExpertApplication[], hasMore: boolean }> {
    let supabaseQuery = supabase
      .from('expert_applications')
      .select('*, applicant:profiles(full_name, avatar_url, email)', { count: 'exact' });

    if (status) {
      supabaseQuery = supabaseQuery.eq('status', status);
    }

    supabaseQuery = supabaseQuery
      .order('timestamp', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    const { data, error, count } = await supabaseQuery;
    if (error) throw error;
    return {
      applications: (data || []).map(item => this.mapExpertApplicationFromDB(item)),
      hasMore: count ? (page + 1) * limit < count : false
    };
  },

  async createExpertApplication(payload: any): Promise<ExpertApplication> {
    // Prevent duplicate pending/approved applications
    const { data: existing } = await supabase
      .from('expert_applications')
      .select('id')
      .eq('student_id', payload.studentId)
      .in('status', ['PENDING', 'APPROVED'])
      .maybeSingle();

    if (existing) {
      throw new Error('An application is already pending or approved.');
    }

    const { data, error } = await supabase
      .from('expert_applications')
      .insert({
        student_id: payload.studentId,
        student_name: payload.studentName,
        student_avatar_url: payload.studentAvatarUrl,
        data: payload.data,
        status: 'PENDING'
      })
      .select()
      .single();
    if (error) throw error;

    // Notify Admin
    try {
      await request(`/expert-applications/${data.id}/notify-admin`, {
        method: 'POST',
      }, true);
    } catch (err) {
      console.error('Failed to trigger admin notification:', err);
    }

    return this.mapExpertApplicationFromDB(data);
  },

  async updateExpertApplication(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('expert_applications')
      .update({ status })
      .eq('id', id);
    if (error) throw error;

    if (status === 'APPROVED') {
      try {
        await request(`/expert-applications/${id}/notify-approved`, {
          method: 'POST'
        }, true);
      } catch (err: any) {
        console.error('Failed to trigger approval notification:', err.message);
        alert(`Warning: Profile sync might have failed. Backend error: ${err.message}`);
      }
    }
  },

  async getSignedUrl(bucket: string, path: string): Promise<string> {
    // path is the part after bucket name, or a full URL
    let relativePath = path;
    if (path.includes('/storage/v1/object/')) {
      const parts = path.split(/\/storage\/v1\/object\/(?:authenticated|public)\//);
      if (parts.length > 1) {
        const bucketAndPath = parts[1];
        relativePath = bucketAndPath.substring(bucketAndPath.indexOf('/') + 1);
      }
    }

    // Decode URI component to handle spaces (%20) etc.
    try {
      relativePath = decodeURIComponent(relativePath);
    } catch (e) {
      console.warn('[API] Failed to decode path:', relativePath);
    }

    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(relativePath, 3600, { download: true }); // 1 hour expiry, force download

    if (error) throw error;
    return data.signedUrl;
  },

  async getRecommendedProfiles(userId: string, page: number = 0, limit: number = 20): Promise<{ profiles: Profile[], hasMore: boolean }> {
    const { data, error } = await supabase
      .rpc('get_recommended_profiles', {
        user_id: userId,
        p_limit: limit,
        p_offset: page * limit
      });

    if (error) throw error;
    const profiles = (data || []).map((p: any) => this.mapProfileFromDB(p));

    // RPC might not support direct pagination easily, slice for now if needed or adjust RPC
    const start = page * limit;
    const end = start + limit;
    const paginated = profiles.slice(start, end);
    const hasMore = end < profiles.length;

    return { profiles: paginated, hasMore };
  },

  async subscribe(userId: string, referrerId?: string, force = false): Promise<{ success: boolean, url?: string, mode?: string, alreadySubscribed?: boolean }> {
    return await request('/subscribe', {
      method: 'POST',
      body: JSON.stringify({ userId, referrerId, force })
    }, true);
  },

  async createPortalSession(userId: string): Promise<{ url: string }> {
    return await request('/create-portal-session', {
      method: 'POST',
      body: JSON.stringify({ userId })
    }, true);
  },

  async syncSubscription(userId: string, sessionId?: string): Promise<{ success: boolean, activated: boolean, source?: string }> {
    const url = sessionId 
      ? `/sync-subscription?userId=${userId}&sessionId=${sessionId}`
      : `/sync-subscription?userId=${userId}`;
    return await request(url, {
      method: 'GET',
    }, true);
  },

  async getSubscriptionStatus(userId: string, force: boolean = false): Promise<{ isSubscribed: boolean; cancelAtPeriodEnd?: boolean; currentPeriodEnd?: number; subscriptionId?: string }> {
    return request(`/subscription-status?userId=${userId}${force ? '&force=true' : ''}`, { method: 'GET' }, true);
  },

  async resumeSubscription(subscriptionId: string): Promise<{ success: boolean; cancelAtPeriodEnd: boolean }> {
    return request('/resume-subscription', { method: 'POST', body: JSON.stringify({ subscriptionId }) }, true);
  },

  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } finally {
      // Defensive cleanup: Ensure tokens are removed even if the SDK call fails
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('migonest_token');
      // Clear any other potential auth-related items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth') || key.includes('token'))) {
          localStorage.removeItem(key);
        }
      }
    }
  },

  async toggleConnection(userId: string, targetId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('toggle_connection', {
      user_id: userId,
      target_id: targetId
    });
    if (error) throw error;
    return data;
  },

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
  },

  async resetStripeSetup(userId: string): Promise<{ success: boolean; message: string }> {
    return await request('/connect/reset', {
      method: 'POST',
      body: JSON.stringify({ userId })
    }, true);
  },

  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    return await request('/delete-account', {
      method: 'POST'
    }, true);
  }
};
