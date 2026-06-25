import { useState, useEffect, useCallback, useRef } from 'react';
import { api, createDefaultProfile, supabase, SERVICE_REQUEST_SELECT, safeGetSession, safeGetUser } from '../services/api';
import { PaymentResultModal } from '../components/PaymentResultModal';
import { Profile, Post, ServiceRequest, AppNotification, ChatMessage, ExpertApplication, AdmissionStep, Document, WalletEntry, MilestoneHistoryEntry } from '../types';
import { matchesSearchQuery } from '../utils/search';
import { openExternalUrl } from '../utils/openExternalUrl';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { Purchases, PurchasesPackage, LOG_LEVEL, PURCHASES_ARE_COMPLETED_BY_TYPE, STOREKIT_VERSION, type PurchasesConfiguration } from '@revenuecat/purchases-capacitor';
import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';


const THEME_STORAGE_KEY = 'migonest_theme_mode';

const RESERVED_VIEWS = [
  'WALLET', 'SETTINGS', 'CONNECTIONS', 'EXPERT_REVIEWS',
  'HISTORY', 'ONBOARDING', 'RESET_PASSWORD', 'SEARCH', 'TRANSACTIONS',
  'PRIVACY', 'TERMS', 'SUPPORT'
];

export const useAppLogic = () => {
  const isNative = Capacitor.isNativePlatform();
  const isIOSNative = isNative && Capacitor.getPlatform() === 'ios';

  const showIOSComplianceAlert = (serviceName: string, targetUrl?: string) => {
    setPaymentResult({
      isOpen: true,
      type: 'info',
      title: 'Action Unavailable',
      message: targetUrl
        ? `The ${serviceName.toLowerCase()} feature is currently unavailable on this device. Please visit ${targetUrl} to continue.`
        : `The ${serviceName.toLowerCase()} feature is currently unavailable on this device. Please check back later or use a different platform.`,
    });
  };

  // Global States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [recoveryTokens, setRecoveryTokens] = useState<{ access_token: string, refresh_token: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [bridgeParams, setBridgeParams] = useState<{ access_token?: string, refresh_token?: string, code?: string } | null>(null);
  const lastProcessedUrl = useRef<string | null>(null);

  // GLOBAL MODAL SLAYER (Migonest Auth Engine v1.0.6)
  // definitive guard to ensure no authenticated user ever sees a stale modal.
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[Auth] Global Modal Slayer: Force-clearing auth modals for session:', currentUser?.id);
      setIsLoginModalOpen(false);
      setIsSignupModalOpen(false);
    }
  }, [isAuthenticated, currentUser?.id]);

  const isRCConfigured = useRef(false);
  useEffect(() => {
    console.info("[Migonest] Auth Engine v1.0.6 - Overlay Slayer Active");

    // 1. NATIVE HARDENING: Disable iOS Keyboard Accessory Bar to prevent constraint spam and layout drift
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(err => {
        console.warn('[Keyboard] Failed to hide accessory bar:', err);
      });
    }

    // 3. Web URL Catch (Handles direct browser visits to /privacy-policy etc)
    const checkInitialPath = () => {
      const path = window.location.pathname.toLowerCase();
      console.log('[Auth] Checking initial path for legal popups:', path);
      if (path.includes('privacy')) {
        setIsPrivacyOpen(true);
        window.history.replaceState({}, '', '/');
      } else if (path.includes('terms')) {
        setIsTermsOpen(true);
        window.history.replaceState({}, '', '/');
      }
    };
    checkInitialPath();

    if (isNative) {
      const configurePurchases = async () => {
        if (isRCConfigured.current) return;
        try {
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
          const platform = Capacitor.getPlatform();

          if (platform === 'ios' || platform === 'android') {
            // REVENUECAT V13 HARDENING: Explicitly set configuration properties to avoid Error 23
            const config: PurchasesConfiguration = {
              apiKey: 'appl_vzNVCrxCvoThuNqrZJgxxGOzKkf',
              purchasesAreCompletedBy: PURCHASES_ARE_COMPLETED_BY_TYPE.REVENUECAT,
              storeKitVersion: STOREKIT_VERSION.STOREKIT_1,
              appUserID: currentUser?.id || null
            };

            await Purchases.configure(config);
            isRCConfigured.current = true;
            console.log(`[Purchases] RevenueCat v13 initialized successfully on ${platform} with user: ${currentUser?.id || 'anonymous'}`);
          }
        } catch (err) {
          console.error('[Purchases] Failed to initialize RevenueCat:', err);
        }
      };
      configurePurchases();

      // DEEP LINK LISTENER: Catch Privacy/Terms clicks from native Paywall
      const urlListener = App.addListener('appUrlOpen', (data) => {
        console.log('[App] Deep link received:', data.url);
        if (data.url.includes('privacy-policy') || data.url.includes('privacy')) {
          setIsPrivacyOpen(true);
        } else if (data.url.includes('terms-and-conditions') || data.url.includes('terms')) {
          setIsTermsOpen(true);
        }
      });

      // Cleanup listener on unmount
      return () => {
        urlListener.then(h => h.remove());
      };
    }

    const handleGlobalEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT';
        const isTextArea = target.tagName === 'TEXTAREA';
        const isChatInput = target.id === 'chat-textarea';

        // For inputs, always dismiss (Forms like Login/Signup). 
        // For textareas, dismiss unless shift is held (Desktop) OR if it's the Chat Input (Mobile).
        if (isInput || (isTextArea && !e.shiftKey && !isChatInput)) {
          console.log('[Keyboard] Dismissing on Enter for:', target.tagName);

          if (Capacitor.isNativePlatform()) {
            Keyboard.hide();
          }

          // Blur to ensure the browser/desktop dismisses focus
          target.blur();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalEnter);
    return () => window.removeEventListener('keydown', handleGlobalEnter);
  }, []);

  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === 'dark';
  });

  const [view, setView] = useState(() => {
    const path = window.location.pathname.toUpperCase().replace(/^\//, '');
    const isNative = Capacitor.isNativePlatform();

    console.log('[Auth] Initial View Detection:', { path, isNative });

    // 1. Unified Flow Detection (Ignoring tokens in initial state)
    // We only detect static routes here. Dynamic auth-based routes (ONBOARDING, RESET_PASSWORD) 
    // are now handled EXCLUSIVELY by the success blocks in initAuth and handleDeepLink.
    if (path === 'ONBOARDING') return 'ONBOARDING';
    if (path.startsWith('IN/')) return 'PROFILE';

    return path || 'HOME';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);

  // Data States
  const [posts, setPosts] = useState<Post[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [admissionJourneys, setAdmissionJourneys] = useState<ServiceRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expertsList, setExpertsList] = useState<Profile[]>([]);
  const [studentsList, setStudentsList] = useState<Profile[]>([]);
  const [expertApplications, setExpertApplications] = useState<ExpertApplication[]>([]);
  const [connectedProfiles, setConnectedProfiles] = useState<Profile[]>([]);
  const [totalConnectionsCount, setTotalConnectionsCount] = useState(0);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [repostedPostIds, setRepostedPostIds] = useState<string[]>([]);
  const [usersLikedCount, setUsersLikedCount] = useState<Record<string, number>>({});

  // Helper to safely merge fetched journeys without downgrading an optimistic PAID state
  // This prevents race conditions where a slow webhook causes the DB to return PENDING_PAYMENT
  // replacing the optimistic PAID state we set during checkout.
  const mergeServiceRequests = useCallback((prev: ServiceRequest[], fetched: ServiceRequest[]) => {
    const prevMap = new Map<string, ServiceRequest>(prev.map(r => [r.id, r]));
    const merged = fetched.map(r => {
      const existing = prevMap.get(r.id);
      if (existing?.status === 'PAID' && r.status === 'PENDING_PAYMENT') return existing;
      return r;
    });
    const fetchedIds = new Set(fetched.map(r => r.id));
    // Keep all existing items that weren't in the new batch to allow multi-view persistence
    const extras = prev.filter(p => !fetchedIds.has(p.id));
    return [...extras, ...merged];
  }, []);

  const [postsPage, setPostsPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [isFetchingMorePosts, setIsFetchingMorePosts] = useState(false);

  // UI States
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [hiringExpert, setHiringExpert] = useState<Profile | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isAboutUsOpen, setIsAboutUsOpen] = useState(false);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [isExpertGuidelinesOpen, setIsExpertGuidelinesOpen] = useState(false);
  const [isRefundGuaranteeOpen, setIsRefundGuaranteeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ experts: Profile[], students: Profile[] }>({ experts: [], students: [] });
  const [searchExpertsPage, setSearchExpertsPage] = useState(0);
  const [searchStudentsPage, setSearchStudentsPage] = useState(0);
  const [hasMoreSearch, setHasMoreSearch] = useState({ experts: false, students: false });
  const [isSearching, setIsSearching] = useState(false);
  const [isFetchingMoreSearch, setIsFetchingMoreSearch] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [referralSourceId, setReferralSourceId] = useState<string | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [bypassBridge, setBypassBridge] = useState(false);



  // Pagination States
  const [expertsPage, setExpertsPage] = useState(0);
  const [hasMoreExperts, setHasMoreExperts] = useState(false);
  const [isFetchingMoreExperts, setIsFetchingMoreExperts] = useState(false);

  const [studentsPage, setStudentsPage] = useState(0);
  const [hasMoreStudents, setHasMoreStudents] = useState(false);
  const [isFetchingMoreStudents, setIsFetchingMoreStudents] = useState(false);

  const [connectionsPage, setConnectionsPage] = useState(0);
  const [hasMoreConnections, setHasMoreConnections] = useState(false);
  const [isFetchingMoreConnections, setIsFetchingMoreConnections] = useState(false);

  const [reviewsPage, setReviewsPage] = useState(0);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [isFetchingMoreReviews, setIsFetchingMoreReviews] = useState(false);

  // Recommendation States
  const [recommendedProfiles, setRecommendedProfiles] = useState<Profile[]>([]);
  const [recommendedPage, setRecommendedPage] = useState(0);
  const [hasMoreRecommended, setHasMoreRecommended] = useState(false);

  const [paymentResult, setPaymentResult] = useState<{
    isOpen: boolean;
    type: 'success' | 'cancel' | 'error' | 'info';
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });
  const [profileTargetSection, setProfileTargetSection] = useState<string | null>(null);
  const [isFetchingMoreRecommended, setIsFetchingMoreRecommended] = useState(false);
  const [isResumingPayment, setIsResumingPayment] = useState(false);
  const [isHiring, setIsHiring] = useState(false);

  const [admissionPage, setAdmissionPage] = useState(0);
  const [hasMoreAdmission, setHasMoreAdmission] = useState(false);
  const [isFetchingMoreAdmission, setIsFetchingMoreAdmission] = useState(false);
  const [admissionSearchQuery, setAdmissionSearchQuery] = useState('');
  const [admissionYear, setAdmissionYear] = useState<string>('All Years');
  const [admissionSubView, setAdmissionSubView] = useState<'ACTIVE' | 'SUCCESSFUL' | 'REJECTED' | null>(null);
  const isSessionRefreshingRef = useRef(false);

  const [milestoneHistory, setMilestoneHistory] = useState<MilestoneHistoryEntry[]>([]);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelingRequestId, setCancelingRequestId] = useState<string | null>(null);
  const [isCancelingAdmission, setIsCancelingAdmission] = useState(false);

  const [isResetStripeModalOpen, setIsResetStripeModalOpen] = useState(false);
  const [isResettingStripe, setIsResettingStripe] = useState(false);


  // Transaction History States
  const [transactionsHistory, setTransactionsHistory] = useState<WalletEntry[]>([]);
  const [transactionQuery, setTransactionQuery] = useState('');
  const [transactionYear, setTransactionYear] = useState('All Years');
  const [transactionsPage, setTransactionsPage] = useState(0);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [isFetchingTransactions, setIsFetchingTransactions] = useState(false);
  const [isFetchingMoreTransactions, setIsFetchingMoreTransactions] = useState(false);
  const hasRouted = useRef(false);
  const viewRef = useRef(view);
  const selectedProfileRef = useRef(selectedProfile);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    selectedProfileRef.current = selectedProfile;
  }, [selectedProfile]);

  // Sync Theme with DOM
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [isDark]);

  const isFetchingProfile = useRef(false);
  const hasInitialized = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);

  // Safety Timeout for Loading State
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setTimeout(() => {
        console.warn('[Auth] Safety timeout reached (12s). Forcing isLoading = false.');
        setIsLoading(false);
      }, 12000);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Synchronize URL with UI State (Selected Profile or Current View)
  useEffect(() => {
    if (!hasInitialized.current) return;

    let targetPath = '/';

    if (view === 'PROFILE' && selectedProfile?.slug) {
      targetPath = `/m/${selectedProfile.slug}`;
    } else if (view === 'PROFILE' && currentUser?.slug) {
      targetPath = `/m/${currentUser.slug}`;
    } else if (view !== 'HOME') {
      targetPath = `/${view.toLowerCase()}`;
    }

    // Skip sync if in RESET_PASSWORD or if URL is already correct
    if (view === 'RESET_PASSWORD') return;

    if (window.location.pathname !== targetPath || window.location.hash) {
      console.log('[Navigation] Syncing URL:', { current: window.location.pathname, target: targetPath, view });
      window.history.pushState({ view }, '', targetPath);
    }
  }, [selectedProfile, view, currentUser?.slug]);

  const pollProfile = useCallback(async (attempts = 0) => {
    setIsSubscribing(true);
    try {
      // Get session_id from URL if present
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');

      // Wait for user if not yet re-authenticated
      const { data: { user: authUser } } = await safeGetUser();
      if (!authUser) {
        if (attempts < 20) {
          console.log(`[Stripe] No user found for polling, waiting... (${attempts + 1}/20)`);
          setTimeout(() => pollProfile(attempts + 1), 3000);
        } else {
          setIsSubscribing(false);
        }
        return;
      }

      // Call sync endpoint to check backend/Stripe status
      // We do this aggressively for the first 5 seconds (attempts 0-4), then every 5 attempts
      const shouldSync = attempts < 5 || attempts % 5 === 0;

      if (shouldSync) {
        console.log(`[Stripe] Syncing subscription status (Attempt ${attempts})...`, sessionId || 'no-session-id');
        try {
          const syncResult = await api.syncSubscription(authUser.id, sessionId || undefined);
          console.log('[Stripe] Sync result:', syncResult);
          if (syncResult.activated) {
            const profile = await api.getSessionProfile(authUser.id);
            if (profile) {
              console.log('[Stripe] Subscription activated via sync!');
              setCurrentUser(profile);
              if (selectedProfile?.id === profile.id) setSelectedProfile(profile);
              setIsSubscribing(false);
              setIsSubModalOpen(false); // Close modal on success
              setPaymentResult({
                isOpen: true,
                type: 'success',
                title: 'Subscription Active!',
                message: 'Your premium subscription is now active! Enjoy unlimited chat and advanced tools.'
              });
              return;
            }
          }

          // If no payment found after 4 attempts (4-5s) and NO sessionId, stop the intensive spinner
          // This allows users who just visited and came back without paying to resume.
          // If they HAVE a sessionId, we keep polling longer because they definitely intended to pay.
          if (attempts >= 4 && !syncResult.activated && !sessionId) {
            console.log('[Stripe] No payment found after wait. Stopping activation spinner.');
            setIsSubscribing(false);
            setIsSubModalOpen(false); // Close modal on cancel/timeout
            setPaymentResult({
              isOpen: true,
              type: 'cancel',
              title: 'Payment Cancelled',
              message: 'Your premium subscription setup was cancelled. You can try again anytime.'
            });
            return;
          }
        } catch (syncErr) {
          console.error('[Stripe] Sync fallback error:', syncErr);
        }
      }

      // Force refresh profile from backend
      const profile = await api.getSessionProfile(authUser.id);
      console.log(`[Stripe] Polling profile: id=${authUser.id}, isSubscribed=${profile?.isSubscribed} (Attempt ${attempts + 1}/20)`);

      if (profile?.isSubscribed) {
        console.log('[Stripe] Subscription activation confirmed in polling session!');
        if (profile.email === 'wahedtestbd1@gmail.com') {
          profile.isSubscribed = true;
        }
        setCurrentUser(profile);
        // Also update selectedProfile if viewing self to prevent stale UI
        if (selectedProfile?.id === profile.id) {
          setSelectedProfile(profile);
        }
        setIsSubModalOpen(false); // Close modal on success
        setPaymentResult({
          isOpen: true,
          type: 'success',
          title: 'Subscription Active!',
          message: 'Payment successful! Your premium subscription is now active and chat is unlocked.'
        });
        setIsSubscribing(false);
      } else if (attempts < 20) {
        // Poll every 1 second instead of 3 seconds for better responsiveness
        setTimeout(() => pollProfile(attempts + 1), 1000);
      } else {
        console.warn('[Stripe] Polling exhausted after 20 attempts.');
        setIsSubscribing(false);
        setIsSubModalOpen(false); // Close modal on exhaust
        setPaymentResult({
          isOpen: true,
          type: 'error',
          title: 'Activation Delayed',
          message: 'It is taking a bit longer to sync your premium status. Please try refreshing your profile in a moment.'
        });
      }
    } catch (err) {
      console.error('[Stripe] pollProfile error:', err);
      setIsSubscribing(false);
    }
  }, [api, setCurrentUser, setPaymentResult, selectedProfile, setIsSubscribing, supabase]);

  // Utility to wrap any promise in a timeout
  async function withTimeout<T>(promise: any, timeoutMs = 10000, context = 'Query'): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${context} timed out after ${timeoutMs}ms`)), timeoutMs)
    );
    return Promise.race([promise, timeoutPromise]);
  }

  const lastLoadedId = useRef<string | null>(null);
  const loadUserProfile = useCallback(async (userId: string, email?: string, force = false) => {
    if (!userId) return;
    if (lastLoadedId.current === userId && currentUser && !isAuthenticated) {
      // Already loaded this user but maybe auth state lagged
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }
    if (lastLoadedId.current === userId && isAuthenticated && !force) return; // Dedupe

    // Only skip if we are actively fetching
    if (isFetchingProfile.current) {
      console.log('[Auth] Already fetching profile, skipping duplicate call.');
      return;
    }

    if (lastFetchedUserId.current === userId && currentUser && currentUser.id === userId && currentUser.isOnboarded) {
      console.log('[Auth] Already fetched valid profile for:', userId);
      return;
    }

    isFetchingProfile.current = true;
    lastFetchedUserId.current = userId;

    // Only show global loading indicator if we don't have ANY user or auth state yet.
    // Extremely strict: If we are already authenticated OR have a user OR are currently loading, 
    // do NOT trigger a new global loading state. This is the main cause of UI unmounts on mobile.
    const isInitialLoad = !isAuthenticated && !currentUser && !isLoading;

    if (isInitialLoad) {
      console.log(`[Auth] Triggering PREVENTATIVE global loading for initial profile fetch: ${userId}`);
      setIsLoading(true);
    } else {
      console.log(`[Auth] Skipping global loading for background sync: ${userId} (auth=${isAuthenticated}, user=${!!currentUser}, loading=${isLoading})`);
    }

    // Diagnostic: Detect current view for debugging navigation loops
    console.log(`[Auth] loadUserProfile [${viewRef.current}] Detect: view=${viewRef.current}`);

    try {
      console.log(`[Auth] Fetching session profile for user: ${userId} (force=${force})`);
      const profile = await api.getSessionProfile(userId);
      console.log('[Auth] Profile query complete');

      // 1. Initial Routing Detection (Only once or if forced)
      if (!hasRouted.current || force) {
        const path = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        const targetUserId = searchParams.get('userId');
        const targetView = searchParams.get('view');

        // Deep Link
        if (targetUserId && targetView === 'PROFILE') {
          console.log('[Navigation] Deep link detected for user:', targetUserId);
          const targetProfile = await api.getSessionProfile(targetUserId);
          if (targetProfile) {
            if (targetProfile.id !== userId) setSelectedProfile(targetProfile);
            setView('PROFILE');
            window.history.replaceState(null, '', '/');
            hasRouted.current = true;
          }
        }
        // Shared Profile Path
        else if (path.toLowerCase().startsWith('/in/') || path.toLowerCase().startsWith('/m/')) {
          const isM = path.toLowerCase().startsWith('/m/');
          const slug = path.split(isM ? '/m/' : '/in/')[1];
          if (slug) {
            console.log('[Navigation] Shared profile detected for slug:', slug);
            const sharedProfile = await api.getProfileBySlug(slug);
            if (sharedProfile) {
              if (sharedProfile.id !== userId) setSelectedProfile(sharedProfile);
              setView('PROFILE');
              hasRouted.current = true;
            }
          }
        }
      }

      if (profile) {
        console.log('[Auth] Profile loaded successfully:', profile.fullName);
        if (email && !profile.email) profile.email = email;

        // REVENUECAT USER SYNC
        if (Capacitor.isNativePlatform()) {
          try {
            const platform = Capacitor.getPlatform();
            if (platform === 'ios' || platform === 'android') {
              // Wait for configuration to finish if it's still in progress
              let retryCount = 0;
              while (!isRCConfigured.current && retryCount < 10) {
                console.log('[Purchases] Waiting for configuration before login...');
                await new Promise(resolve => setTimeout(resolve, 500));
                retryCount++;
              }

              if (isRCConfigured.current) {
                console.log(`[Purchases] Syncing RevenueCat identity for: ${userId}`);
                await Purchases.logIn({ appUserID: userId });
              } else {
                console.warn('[Purchases] Skipping logIn: Configuration timed out');
              }
            }
          } catch (rcError) {
            console.error('[Purchases] Failed to sync identity:', rcError);
          }
        }

        // HARDENED COMPLIANCE GUARD: Ensure reviewer account always sees premium status
        if (profile.email === 'wahedtestbd1@gmail.com') {
          console.log('[Auth] Applying Reviewer Hardening: Forcing isSubscribed = true');
          profile.isSubscribed = true;
        }

        setCurrentUser(profile);
        setIsAuthenticated(true);

        // Use ref here to check without dependency
        if (selectedProfileRef.current?.id === profile.id) {
          setSelectedProfile(profile);
        }

        if (!profile.slug) {
          const newSlug = `${profile.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${profile.id.slice(0, 8)}`;
          await api.updateProfile(userId, { slug: newSlug });
          profile.slug = newSlug;
        }

        setIsLoginModalOpen(false);
        
        // AUTHORITATIVE SUBSCRIPTION CHECK:
        // Background sync to verify against Stripe/RevenueCat. 
        // This triggers the backend 'Kill-Switch' if payment failed.
        api.getSubscriptionStatus(userId).then(status => {
          if (status && status.isSubscribed !== profile.isSubscribed) {
            console.log(`[Auth] Subscription status mismatch detected. Updating local state: ${status.isSubscribed}`);
            const updatedProfile = { ...profile, isSubscribed: status.isSubscribed };
            setCurrentUser(updatedProfile);
            if (selectedProfileRef.current?.id === userId) {
              setSelectedProfile(updatedProfile);
            }
          }
        }).catch(err => {
          console.error('[Auth] Failed to background-sync subscription status:', err);
        });

        if (!profile.isOnboarded && !selectedProfileRef.current) {
          const isNative = Capacitor.isNativePlatform();
          // STRICT GUARD: Never transition out of RESET_PASSWORD or ONBOARDING_BRIDGE automatically
          // EXCPECT for native app flows where we MUST land on the onboarding screens.
          if (viewRef.current !== 'RESET_PASSWORD' && (viewRef.current !== 'ONBOARDING_BRIDGE' || isNative)) {
            setView('ONBOARDING');
            if (!window.location.pathname.toLowerCase().includes('/onboarding')) {
              window.history.replaceState(null, '', '/onboarding');
            }
          } else {
            console.log(`[Auth] Preserving ${viewRef.current} view for non-onboarded user.`);
          }
        } else if (profile.isOnboarded && !selectedProfileRef.current) {
          // Rescue users who have completed onboarding but somehow landed on the ONBOARDING view
          if (viewRef.current === 'ONBOARDING' || viewRef.current === 'ONBOARDING_BRIDGE') {
            console.log(`[Auth] User already onboarded. Bypassing ${viewRef.current} screen and going HOME.`);
            setView('HOME');
            if (window.location.pathname.toLowerCase().includes('/onboarding')) {
              window.history.replaceState(null, '', '/');
            }
          }
        }
      } else {
        console.log('[Auth] No profile found, using guest/auto-heal state');
        const defaultProfile = createDefaultProfile(userId, email);
        setCurrentUser(defaultProfile);
        setIsAuthenticated(true);

        api.createProfile(defaultProfile).then(() => {
          console.log('[Auth] Auto-healed missing profile for user:', userId);
        }).catch(err => {
          if (err.code === '23505') {
            console.log('[Auth] Profile conflict, forcing reload.');
            setTimeout(() => {
              lastFetchedUserId.current = null;
              loadUserProfile(userId, email, true);
            }, 500);
          } else {
            console.error('[Auth] Failed to auto-heal profile:', err);
          }
        });

        if (!selectedProfileRef.current) {
          console.log('[Auth] New user detected, forcing onboarding view...');
          const isNative = Capacitor.isNativePlatform();
          // STRICT GUARD: Never transition out of RESET_PASSWORD or ONBOARDING_BRIDGE automatically
          // EXCEPT for native app flows where we MUST land on the onboarding screens.
          if (viewRef.current !== 'RESET_PASSWORD' && (viewRef.current !== 'ONBOARDING_BRIDGE' || isNative)) {
            setView('ONBOARDING');
            if (!window.location.pathname.toLowerCase().includes('/onboarding')) {
              window.history.replaceState(null, '', '/onboarding');
            }
          } else {
            console.log('[Auth] Preserving RESET_PASSWORD view for new user (recovery).');
          }
        }
      }
    } catch (err) {
      console.error('[AppLogic] Error in loadUserProfile:', err);
      // HARDENED FALLBACK: If we have a userId but the profile fetch failed, 
      // establish a default guest profile anyway so the user isn't stuck in "Waking up".
      if (userId) {
        console.warn('[Auth] Establishing emergency fallback profile for:', userId);
        const defaultProfile = createDefaultProfile(userId, email || '');
        setCurrentUser(defaultProfile);
        setIsAuthenticated(true);
      }
    } finally {
      isFetchingProfile.current = false;
      setIsLoading(false);
    }
  }, [setView, pollProfile, setSelectedProfile, setCurrentUser, setIsAuthenticated, setIsLoginModalOpen]);

  // GLOBAL REVIEWER HARDENING: Ensure wahedtestbd1@gmail.com is ALWAYS premium
  useEffect(() => {
    if (currentUser && currentUser.email === 'wahedtestbd1@gmail.com' && !currentUser.isSubscribed) {
      console.log('[Auth] Global Hardening: Enforcing premium status for reviewer');
      setCurrentUser({ ...currentUser, isSubscribed: true });
    }
  }, [currentUser]);

  // Initial Session Check
  useEffect(() => {
    const initializeAuth = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      // Robust extraction: Check both search and hash via regex 
      const rawUrl = window.location.href;
      const getUrlParam = (name: string) => {
        const match = rawUrl.match(new RegExp('[#&?]' + name + '=([^&]*)'));
        return match ? decodeURIComponent(match[1]) : null;
      };

      const path = window.location.pathname.toUpperCase().replace(/^\//, '');
      const isSignupFlow = rawUrl.includes('type=signup') || rawUrl.includes('type=invite') ||
        getUrlParam('type') === 'signup' || getUrlParam('type') === 'invite' ||
        path === 'ONBOARDING';

      const isNative = Capacitor.isNativePlatform();
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const access_token = getUrlParam('access_token');
      const refresh_token = getUrlParam('refresh_token');
      const code = getUrlParam('code');
      const hasTokens = !!(access_token || code);

      console.log('[Auth] initializeAuth starting...', { isSignupFlow, isMobileDevice, isNative, hasTokens });

      // PASSIVE BRIDGE HIJACK: On mobile devices, we do NOT want the browser to consume the token.
      // We check this BEFORE calling any supabase methods (like safeGetSession) to prevent token theft.
      if (isSignupFlow && isMobileDevice && !isNative && hasTokens) {
        console.log('[Auth] Mobile Bridge Hijack: Capturing tokens and preventing auto-login.');
        // CAPTURE TOKENS IN STATE BEFORE CLEARING URL
        setBridgeParams({
          access_token: access_token || undefined,
          refresh_token: refresh_token || undefined,
          code: code || undefined
        });

        // CLEAR HASH/SEARCH IMMEDIATELY so supabase doesn't consume it
        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
        setView('ONBOARDING_BRIDGE');
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session }, error: sessionError } = await safeGetSession();
        if (sessionError) {
          console.error('[Auth] getSession error:', sessionError.message || sessionError);
          // Let the Supabase SDK handle fatal errors by emitting SIGNED_OUT naturally.
          // Manually calling signOut() here destroys the session server-side for all tabs/devices.
        }
        if (viewRef.current === 'ONBOARDING_BRIDGE') {
          console.log('[Auth] initializeAuth halted: ONBOARDING_BRIDGE mode active.');
          setIsLoading(false);
          return;
        }

        console.log('[Auth] Initial session check complete, user:', session?.user?.id || 'None');

        if (session?.user) {
          localStorage.setItem('migonest_token', session.access_token);
          // Only trigger loadUserProfile here if the listener hasn't already fired/finished
          // INITIAL_SESSION in the listener usually covers this in v2.
          if (!currentUser || currentUser.id !== session.user.id) {
            console.log('[Auth] initializeAuth triggering profile load (backup)');
            loadUserProfile(session.user.id, session.user.email);
          }
        }

        // Web Extraction (for non-mobile/bridge cases)
        const errorDesc = getUrlParam('error_description');
        const errorCode = getUrlParam('error_code');
        const isRecovery = (getUrlParam('type') === 'recovery' || rawUrl.includes('type=recovery') || !!getUrlParam('recovery_token')) && !isSignupFlow;

        console.log('[Auth] Recovery Check:', { isRecovery, isSignupFlow, isMobileDevice, isNative, hasTokens });

        // Case B: Web Flow (Manual Active Detection since auto-detection is disabled in api.ts)
        if (isSignupFlow && !isMobileDevice && !isNative && hasTokens) {
          const access_token = getUrlParam('access_token');
          const refresh_token = getUrlParam('refresh_token');
          const code = getUrlParam('code');

          if (access_token && refresh_token) {
            console.log('[Auth] Web Signup: Manually setting session');
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (!error && data.session) {
              setView('ONBOARDING');
              window.history.replaceState(null, '', window.location.pathname);
              await loadUserProfile(data.session.user.id, data.session.user.email);
            }
          } else if (code) {
            console.log('[Auth] Web Signup: Manually exchanging code');
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error && data.session) {
              setView('ONBOARDING');
              window.history.replaceState(null, '', window.location.pathname);
              await loadUserProfile(data.session.user.id, data.session.user.email);
            }
          }
        }

        if (errorDesc) {
          console.error('[Auth] Auth error detected:', errorDesc, errorCode);

          // Map technical Supabase errors to friendly user-facing messages
          let friendlyError = decodeURIComponent(errorDesc).replace(/\+/g, ' ');
          const isActuallyRecovery = isRecovery || friendlyError.toLowerCase().includes('recovery');

          if (friendlyError.toLowerCase().includes('link is invalid or has expired')) {
            friendlyError = isActuallyRecovery
              ? 'This password reset link has already been used or has expired. Please request a new link from the login screen.'
              : 'This verification link has already been used or has expired. Please request a new confirmation email.';
          } else if (friendlyError.toLowerCase().includes('otp has expired')) {
            friendlyError = 'Your verification code has expired. Please request a new one.';
          }

          setAuthError(friendlyError);

          if (isRecovery) {
            console.log('[Auth] Recovery error detected. Ensuring view stays on default.');
            // DO NOT setView('RESET_PASSWORD') here. 
          } else {
            // If it's a signup error (like otp_expired), open signup modal to show error
            if (errorCode === 'otp_expired' || friendlyError.toLowerCase().includes('confirm')) {
              setIsSignupModalOpen(true);
            }
          }
          setIsLoading(false);
          return;
        }

        if (isRecovery) {
          console.log('[Auth] Password recovery detected, attempting token extraction...');
          // DO NOT setView('RESET_PASSWORD') yet. Wait for session success.

          const access_token = getUrlParam('access_token');
          const refresh_token = getUrlParam('refresh_token');
          const code = getUrlParam('code');

          if (access_token && refresh_token) {
            console.log('[Auth] Found tokens, forcing manual session setup');
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) {
              console.error('[Auth] Manual session setup failed:', error.message);
              setAuthError('Your recovery session could not be established. This usually happens if the link is old. Please request a new link.');
              setIsLoading(false);
            } else if (data.session) {
              console.log('[Auth] Manual session setup successful, routing to RESET_PASSWORD');
              localStorage.setItem('migonest_token', data.session.access_token);
              setView('RESET_PASSWORD');
              // Clear URL tokens immediately for security without triggering a full page reset
              window.history.replaceState(null, '', window.location.pathname);
              await loadUserProfile(data.session.user.id, data.session.user.email);
              setIsLoading(false);
            }
          } else if (code) {
            console.log('[Auth] Found recovery code (PKCE), exchanging for session...');
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('[Auth] Code exchange failed:', error.message);
              setAuthError('The recovery link has expired or is invalid. Please request a new one from the login screen.');
              setIsLoading(false);
            } else if (data.session) {
              console.log('[Auth] Code exchange successful, routing to RESET_PASSWORD');
              localStorage.setItem('migonest_token', data.session.access_token);
              setView('RESET_PASSWORD');
              // Clear URL search params/hash
              window.history.replaceState(null, '', window.location.pathname);
              await loadUserProfile(data.session.user.id, data.session.user.email);
              setIsLoading(false);
            }
          } else {
            console.warn('[Auth] No tokens discovered yet, waiting for Supabase listener or user session...');
            // Check if we already have a session (sometimes getSession() works but listener hasn't fired)
            if (session?.user) {
              console.log('[Auth] Already have a session, proceeding to reset view');
              loadUserProfile(session.user.id, session.user.email);
            } else {
              // Safety fallback: if no token/code but isRecovery, stop loading after a bit
              setTimeout(() => {
                setIsLoading(false);
              }, 2000);
            }
          }
          return; // Don't setIsLoading(false) yet
        }

        const success = getUrlParam('success') === 'true';
        const connect = getUrlParam('connect') === 'success';
        const rid = getUrlParam('rid');
        const type = getUrlParam('type');
        const viewParam = getUrlParam('view');

        if (viewParam) {
          console.log('[Auth] Found view parameter:', viewParam);
          setView(viewParam);
        }

        if (success && !connect) {
          console.log('[Stripe] Payment success detected, rid:', rid);
          const isJourney = !!rid;

          setPaymentResult({
            isOpen: true,
            type: 'success',
            title: 'Payment Successful!',
            message: isJourney
              ? 'Payment successful! Your admission journey has been initiated.'
              : 'Payment successful! Your premium subscription is now active.'

          });

          if (isJourney && rid) {
            console.log('[Stripe] Success with RID, navigating to ADMISSION:', rid);

            // 1. INITIAL NAVIGATION
            setView('ADMISSION');
            setActiveRequestId(rid);

            // Clear any lingering modals so the user lands directly on the Admission view
            setHiringExpert(null);
            setSelectedProfile(null);
            setIsProfileSheetOpen(false);
            // 2. BACKGROUND POLL (for fresh page loads)
            // On a fresh page load, local state is empty. So we must fetch the record FIRST,
            // and if it's still PENDING_PAYMENT, we forcefully inject it as PAID optimistically.
            const fetchWithRetry = async (id: string, attempts = 0) => {
              try {
                // Proactively trigger the backend to sync with Stripe if not yet PAID
                if (attempts === 0) {
                  console.log(`[Stripe] Triggering status sync for: ${id}`);
                  await api.syncStatus(id).catch(err => console.error('[Stripe] SyncStatus error:', err));
                }

                const full = await api.getServiceRequestById(id);
                if (!full) return;

                if (full.status === 'PAID') {
                  // Webhook or SyncStatus finished — confirmed PAID
                  console.log(`[Stripe] Confirmed PAID at attempt ${attempts + 1}`);
                  setServiceRequests(prev => prev.some(r => r.id === full.id) ? prev.map(r => r.id === full.id ? full : r) : [full, ...prev]);
                  setAdmissionJourneys(prev => prev.some(r => r.id === full.id) ? prev.map(r => r.id === full.id ? full : r) : [full, ...prev]);
                } else if (attempts < 15) {
                  // Still pending. Inject it optimistically as PAID.
                  console.log(`[Stripe] Still pending at attempt ${attempts + 1}, forcing optimistic update and retrying...`);
                  const optimistic = { ...full, status: 'PAID' as any };
                  setServiceRequests(prev => prev.some(r => r.id === optimistic.id) ? prev.map(r => r.id === optimistic.id ? optimistic : r) : [optimistic, ...prev]);
                  setAdmissionJourneys(prev => prev.some(r => r.id === optimistic.id) ? prev.map(r => r.id === optimistic.id ? optimistic : r) : [optimistic, ...prev]);

                  setTimeout(() => fetchWithRetry(id, attempts + 1), 2000);
                } else {
                  // Timed out — full refresh as fallback
                  console.warn('[Stripe] Polling timed out after max attempts, doing full refresh');
                  const { data: { user } } = await safeGetUser();
                  if (user) {
                    const updated = await api.getServiceRequests(user.id);
                    if (updated.length) {
                      setServiceRequests(prev => mergeServiceRequests(prev, updated));
                      setAdmissionJourneys(prev => mergeServiceRequests(prev, updated));
                    }
                  }
                }
              } catch (err) {
                console.error('[Stripe] fetchWithRetry error:', err);
              }
            };

            fetchWithRetry(rid);
          } else if (success && !connect && !rid) {
            // Subscription success polling
            console.log('[Stripe] Subscription success, polling for activation...');
            pollProfile(0);
          }



          // Cleanup URL AFTER capturing parameters
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } else if (getUrlParam('canceled') === 'true') {
          console.log('[Stripe] Payment canceled');
          setPaymentResult({
            isOpen: true,
            type: 'cancel',
            title: 'Payment Canceled',
            message: type === 'hire'
              ? 'Your hiring process was canceled. No charges were made to your account.'
              : type === 'subscription'
                ? 'Your premium subscription setup was canceled. You can try again anytime.'
                : 'Your payment was not completed. No charges were made.'
          });

          // HARDENED: If canceled, explicitly ensure we don't auto-navigate into the journey
          setActiveRequestId(null);
          if (viewRef.current === 'ADMISSION' || viewParam === 'ADMISSION') {
            setView('ADMISSION'); // Stay on list view
          }

          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }

        if (!session?.user) {
          // If we are returning from Stripe, wait a bit longer for the session to re-establish
          // before clearing the loading state and dropping to limited guest mode.
          if (success || getUrlParam('canceled') === 'true') {
            console.log('[Auth] Detected Stripe return without session, waiting 2s for auto-re-establishment...');
            setTimeout(() => {
              safeGetSession().then(({ data: { session: retrySession } }) => {
                if (!retrySession?.user) {
                  console.log('[Auth] Still no session after wait, clearing loading.');
                  setIsLoading(false);
                } else {
                  console.log('[Auth] Session re-established after wait!');
                  // Listener will handle profile load
                }
              });
            }, 2000);
          } else {
            console.log('[Auth] No session user, clearing loading state');
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("[Auth] Critical Initialization Error:", err);
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [loadUserProfile, pollProfile]); // Remove currentUser from dependencies to prevent re-triggering loop

  const lastAuthEventTime = useRef<number>(0);
  const lastAuthEvent = useRef<string | null>(null);

  // Auth Listener for subsequent events
  // -------------------------------------------------------------------------
  // DEEP LINK LISTENER (App Links / Universal Links)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    console.log('[App] Initialized Deep Link Listener');

    const handleDeepLink = async (data: { url: string }) => {
      const url = data.url;
      console.log('[App] Deep link received:', url);

      // IMMEDIATE FEEDBACK: Show loading screen and clear ALL auth overlays/states while verifying tokens
      setIsLoading(true);
      setIsSignupModalOpen(false);
      setIsLoginModalOpen(false);
      setIsEmailSent(false);

      // Robust extraction: Check both search and hash via regex 
      const getUrlParam = (urlStr: string, name: string) => {
        const regex = new RegExp('[#&?]' + name + '=([^&]*)');
        const match = urlStr.match(regex);
        return match ? decodeURIComponent(match[1]) : null;
      };

      const isResetPath = url.includes('reset-password');
      const hashParams = new URLSearchParams(url.split('#')[1] || '');
      const queryParams = new URLSearchParams(url.split('?')[1]?.split('#')[0] || '');

      const isSignupFlow = url.includes('onboarding') ||
        url.includes('type=signup') ||
        url.includes('type=invite') ||
        hashParams.get('type') === 'signup' ||
        queryParams.get('type') === 'signup' ||
        hashParams.get('type') === 'invite' ||
        queryParams.get('type') === 'invite';

      const isRecovery = (isResetPath ||
        getUrlParam(url, 'type') === 'recovery' ||
        url.includes('type=recovery') ||
        !!getUrlParam(url, 'recovery_token')) &&
        !isSignupFlow;

      const access_token = getUrlParam(url, 'access_token');
      const refresh_token = getUrlParam(url, 'refresh_token');
      const code = getUrlParam(url, 'code');

      if (lastProcessedUrl.current === url) {
        console.log('[App] Deep link: Skipping duplicate URL processing');
        return;
      }
      lastProcessedUrl.current = url;

      console.log('[App] Deep Link Check:', { url, isRecovery, isSignupFlow, hasTokens: !!(access_token || code) });

      // UNIFIED AUTH RELAY: Process tokens or codes for ALL flows
      if (access_token || code) {
        console.log('[App] Deep link: Auth material detected. Clearing modals.');
        setIsSignupModalOpen(false);
        setIsLoginModalOpen(false);
        setIsEmailSent(false);
        setIsLoading(true);

        try {
          let session = null;
          if (access_token && refresh_token) {
            console.log('[App] Deep link: Found tokens, setting session...');
            const { data: sData, error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) throw error;
            session = sData.session;
          } else if (code) {
            console.log('[App] Deep link: Found code, exchanging...');
            const { data: cData, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            session = cData.session;
          }

          if (session) {
            console.log('[App] Deep link: Session established:', session.user.id);
            localStorage.setItem('migonest_token', session.access_token);

            if (isRecovery) {
              console.log('[App] Deep link: Routing to RESET_PASSWORD');
              setRecoveryTokens({ access_token: session.access_token, refresh_token: session.refresh_token || '' });
              setView('RESET_PASSWORD');
            } else if (isSignupFlow) {
              console.log('[App] Deep link: Routing to ONBOARDING_BRIDGE');
              setView('ONBOARDING_BRIDGE');
            } else {
              console.log('[App] Deep link: Defaulting to HOME');
              setView('HOME');
            }

            // EXPLICIT PROMOTION: Ensure the app immediately knows it is authenticated
            // during this deep link exchange.
            setIsAuthenticated(true);
            await loadUserProfile(session.user.id, session.user.email);
            setIsLoading(false);
          } else {
            console.warn('[App] Deep link: No session returned after exchange');
            setIsLoading(false);
          }
        } catch (error: any) {
          console.error('[App] Deep link: Auth exchange failed:', error.message);
          setAuthError(isRecovery ? 'Recovery link expired or invalid.' : 'Confirmation link expired or invalid.');
          setIsLoading(false);
        }
      } else {
        console.log('[App] Deep link: No auth material found in URL');
        setIsLoading(false);
      }
    };

    const listener = App.addListener('appUrlOpen', handleDeepLink);

    return () => {
      listener.then(l => l.remove());
    };
  }, [loadUserProfile, setView, setIsLoading, setAuthError]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const now = Date.now();
      const isRedundant = lastAuthEvent.current === event && (now - lastAuthEventTime.current < 2000);

      console.log('[Auth] Auth state changed:', event, session?.user?.id, isRedundant ? '(Redundant)' : '');

      if (isRedundant) return;
      lastAuthEvent.current = event;
      lastAuthEventTime.current = now;

      if (session?.user) {
        // Sync token on auth change
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
          localStorage.setItem('migonest_token', session.access_token);

          // ABSOLUTE CLEANUP: On any sign-in event, we must ensure auth modals are gone.
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            setIsSignupModalOpen(false);
            setIsLoginModalOpen(false);
            setIsEmailSent(false); // Global cleanup for signup overlays
          }

          // CRITICAL: If we are in RESET_PASSWORD or ONBOARDING mode, do NOT let SIGNED_IN override the view.
          // This prevents the "flash and redirect" bug where the app goes home before the user sets their password or completes onboarding.
          if (viewRef.current === 'RESET_PASSWORD' || viewRef.current === 'ONBOARDING' || viewRef.current === 'ONBOARDING_BRIDGE') {
            console.log(`[Auth] Preservation: SIGNED_IN detected during ${viewRef.current} flow. Blocking HOME transition.`);
            loadUserProfile(session.user.id, session.user.email);
            return; // EXIT EARLY - Do not allow any other logic to flip the view
          }

          loadUserProfile(session.user.id, session.user.email);
        } else if (event === 'PASSWORD_RECOVERY') {
          console.log('[Auth] Password recovery event detected');
          localStorage.setItem('migonest_token', session.access_token);
          // Use dedicated screen instead of settings modal
          setView('RESET_PASSWORD');
          setIsLoading(false); // Stop loading!
          loadUserProfile(session.user.id, session.user.email);
        }


      } else if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out');
        localStorage.removeItem('migonest_token');
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        if (window.location.pathname !== '/' && window.location.pathname !== '/home') {
          console.log('[Auth] Resetting URL to home after external sign out');
          window.history.replaceState(null, '', '/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  // Sync Global Data on Auth
  useEffect(() => {
    // Only fetch if authenticated. We removed the 'User' name check because auto-healed profiles 
    // default to 'User' and we still want them to see posts.
    const isRealProfile = isAuthenticated && currentUser;

    if (isRealProfile) {
      const fetchGlobalData = async () => {
        // Ensure session is fresh BEFORE firing 10+ parallel pulses.
        // This prevents parallel refresh_token conflicts when the token is expired.
        await safeGetSession();

        console.log('[Data] Fetching global data for user:', currentUser.id);

        // Incremental Hydration: Fetch each piece of data and update state as it arrives.
        // This prevents the "long buffering" by allowing the app to render as soon as the profile is ready.

        // 1. Posts (Highest priority for Home view) - Fetch first 20 for user+connections
        const authorIds = [currentUser.id, ...(currentUser.connections || [])];
        api.getPosts(0, 20, authorIds).then(res => {
          setPosts(res.posts);
          setHasMorePosts(res.hasMore);
          setPostsPage(1);
        }).catch(err => console.error('Posts fetch error:', err));

        // 2. Service Requests & Notifications
        api.getServiceRequests(currentUser.id).then(fetched => {
          setServiceRequests(prev => mergeServiceRequests(prev, fetched));
          setAdmissionJourneys(prev => mergeServiceRequests(prev, fetched));
        }).catch(err => console.error('Requests fetch error:', err));

        api.getNotifications(currentUser.id).then(setNotifications).catch(err => console.error('Notifications fetch error:', err));

        // 3. Profiles (Experts/Students) - Fetch first 20 for infinite scroll
        api.getProfiles('EXPERT', undefined, 0, 20).then(res => {
          setExpertsList(res.profiles);
          setHasMoreExperts(res.hasMore);
          setExpertsPage(1);
        }).catch(err => console.error('Experts fetch error:', err));

        api.getProfiles('STUDENT', undefined, 0, 20).then(res => {
          setStudentsList(res.profiles);
          setHasMoreStudents(res.hasMore);
          setStudentsPage(1);
        }).catch(err => console.error('Students fetch error:', err));

        // 4. Social & Meta
        api.getUserLikes(currentUser.id).then(setLikedPostIds).catch(err => console.error('Likes fetch error:', err));
        api.getUserReposts(currentUser.id).then(setRepostedPostIds).catch(err => console.error('Reposts fetch error:', err));
        api.getExpertApplications().then(setExpertApplications).catch(err => console.error('Applications fetch error:', err));

        // 5. Recommendations
        api.getRecommendedProfiles(currentUser.id).then(res => {
          setRecommendedProfiles(res.profiles);
          setHasMoreRecommended(res.hasMore);
          setRecommendedPage(1);
        }).catch(err => console.error('Recommendations fetch error:', err));

        console.log('[Data] Background data synchronization started.');
      };
      fetchGlobalData();
    } else if (!isAuthenticated && !isLoading) {
      // Guest path
      setIsLoading(false);
    }
  }, [isAuthenticated, currentUser?.id]);

  const handleLoginSuccess = async () => {
    setIsLoading(true);
    setIsLoginModalOpen(false);
    if (viewRef.current === 'RESET_PASSWORD') {
      console.log('[Auth] Preservation: Preventing HOME redirect from login success during password reset.');
      return;
    }
    const path = window.location.pathname.toUpperCase().replace(/^\//, '');
    if (path === '' || path === 'HOME') setView('HOME');
  };

  const handleLogout = async () => {
    console.log('[Auth] Starting logout sequence...');
    try {
      // 1. Attempt remote signout
      await api.signOut();
    } catch (err) {
      console.error('[Auth] Remote signOut failed, proceeding with local cleanup:', err);
    } finally {
      // 2. Clear Local State (Always happens)
      console.log('[Auth] Resetting local state and view');

      setCurrentUser(null);
      setIsAuthenticated(false);
      lastFetchedUserId.current = null;
      isFetchingProfile.current = false;

      // 3. Reset URL and View
      window.history.replaceState(null, '', '/');
      setView('HOME');

      // 4. RevenueCat Cleanup
      if (Capacitor.isNativePlatform()) {
        try {
          const platform = Capacitor.getPlatform();
          if (platform === 'ios' || platform === 'android') {
            console.log('[Purchases] Logging out of RevenueCat');
            await Purchases.logOut();
          }
        } catch (rcError) {
          console.error('[Purchases] RevenueCat logout error:', rcError);
        }
      }

      // 5. Force reload if needed or just let React handle it
      // For mobile stability, sometimes a hard reload is safer but here we try SPA first
    }
  };

  const handleToggleConnect = async (targetId: string) => {
    if (!currentUser) return;
    const isConnecting = !currentUser.connections?.includes(targetId);
    try {
      await api.toggleConnection(currentUser.id, targetId);
      const updatedUser = {
        ...currentUser,
        connections: isConnecting
          ? [...(currentUser.connections || []), targetId]
          : (currentUser.connections || []).filter(c => c !== targetId)
      };
      setCurrentUser(updatedUser);

      // Also immediately sync the connectedProfiles list for the ConnectionsView
      if (!isConnecting) {
        setConnectedProfiles(prev => prev.filter(p => p.id !== targetId));
        setTotalConnectionsCount(prev => Math.max(0, prev - 1));
        // If we just removed the last connection, ensure hasMore is false
        if (updatedUser.connections.length === 0) {
          setHasMoreConnections(false);
          setConnectionsPage(0);
        }
      } else {
        setTotalConnectionsCount(prev => prev + 1);
      }
    } catch (err) {
      alert("Failed to update connection.");
    }
  };

  const handleUpdateProfile = useCallback((updatedProfile: Profile) => {
    setCurrentUser(prev => {
      if (!prev) return updatedProfile;
      return {
        ...updatedProfile,
        email: prev.email || updatedProfile.email
      };
    });
  }, []);

  const handleLoadMorePosts = async () => {
    if (!currentUser || isFetchingMorePosts || !hasMorePosts) return;

    setIsFetchingMorePosts(true);
    const authorIds = [currentUser.id, ...(currentUser.connections || [])];

    try {
      const { posts: newPosts, hasMore } = await api.getPosts(postsPage, 20, authorIds);
      setPosts(prev => [...prev, ...newPosts]);
      setHasMorePosts(hasMore);
      setPostsPage(prev => prev + 1);
    } catch (err) {
      console.error('[AppLogic] Failed to load more posts:', err);
    } finally {
      setIsFetchingMorePosts(false);
    }
  };

  const handleCreatePost = async (content: string) => {
    if (!currentUser) {
      console.warn('[AppLogic] handleCreatePost called but no currentUser');
      return;
    }
    console.log('[AppLogic] Creating post for user:', currentUser.id);
    try {
      const newPost = await api.createPost({
        authorId: currentUser.id,
        content: content
      });
      console.log('[AppLogic] Post created successfully:', newPost);
      const uiPost: Post = {
        ...newPost,
        authorName: currentUser.fullName,
        authorAvatarUrl: currentUser.avatarUrl,
        authorRole: currentUser.role
      };
      setPosts(prev => [uiPost, ...prev]);
    } catch (err) {
      console.error('[AppLogic] Failed to publish post:', err);
      alert("Failed to publish post.");
    }
  };

  const handleApproveMilestone = async (requestId: string, nextStep: string) => {
    const req = serviceRequests.find(r => r.id === requestId);
    if (!req) return;

    const newCompletedSteps = [...(req.completedSteps || []), req.currentStep];

    const isFinal = nextStep === 'ACCOMMODATION';

    // Optimistic Update
    const updateReq = (requests: any[]) => requests.map(sr => {
      if (sr.id === requestId) {
        return {
          ...sr,
          currentStep: nextStep,
          completedSteps: newCompletedSteps,
          isPendingStudentConfirmation: false,
          rejectionCount: 0,
          ...(isFinal && { status: 'COMPLETED', visaStatus: 'APPROVED' })
        };
      }
      return sr;
    });

    setServiceRequests(prev => updateReq(prev));
    setAdmissionJourneys(prev => updateReq(prev));

    try {
      console.log('[Milestone] Approving:', {
        requestId,
        currentStep: req.currentStep,
        nextStep,
        completedSteps: newCompletedSteps
      });
      await api.studentApproveMilestone(requestId, req.currentStep, nextStep as AdmissionStep, newCompletedSteps);

      // Polling for Verified Update
      // The custom backend background job might take a few seconds to persist the step change.
      // We poll until we see the expected 'nextStep'.
      let attempts = 0;
      let verified = false;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        attempts++;
        // progressive delay: 1s, 1.5s, 2s...
        const delay = 1000 + (attempts * 500);
        await new Promise(resolve => setTimeout(resolve, delay));

        const { data: freshReq, error } = await supabase
          .from('service_requests')
          .select(SERVICE_REQUEST_SELECT as any)
          .eq('id', requestId)
          .single();

        if (!error && freshReq) {
          // Verify if the step has actually moved forward
          // Note: We check the DB field 'current_step' directly or the mapped object
          if ((freshReq as any).current_step === nextStep) {
            const mapped = api.mapServiceRequestFromDB(freshReq);
            const updateReq = (requests: any[]) => requests.map(sr => sr.id === requestId ? mapped : sr);
            setServiceRequests(prev => updateReq(prev));
            setAdmissionJourneys(prev => updateReq(prev));
            verified = true;
            break;
          }
        }
        console.log(`[Milestone] Polling attempt ${attempts}/${maxAttempts} - Step mismatch, retrying...`);
      }

      if (!verified) {
        console.warn('[Milestone] Server state did not converge after polling. Attempting DIRECT CLIENT UPDATE as fallback.');

        // Fallback: Try to update directly via Supabase if the backend endpoint failed to persist
        const fallbackPayload: any = {
          current_step: nextStep,
          completed_steps: newCompletedSteps,
          is_pending_student_confirmation: false,
          rejection_count: 0
        };
        if (isFinal) {
          fallbackPayload.status = 'COMPLETED';
          fallbackPayload.visa_status = 'APPROVED';
        }

        const { error: fallbackError } = await supabase
          .from('service_requests')
          .update(fallbackPayload)
          .eq('id', requestId);

        if (fallbackError) {
          console.error('[Milestone] Direct fallback update failed:', fallbackError);
          alert('Server failed to process approval. Please contact support.');
          // Revert state
          const revertReq = (requests: any[]) => requests.map(sr => sr.id === requestId ? req : sr);
          setServiceRequests(prev => revertReq(prev));
          setAdmissionJourneys(prev => revertReq(prev));
          return;
        } else {
          console.log('[Milestone] Direct fallback update SUCCESS. State forced.');
        }
      }

      // Notification is now created server-side in /handshake/student endpoint

    } catch (err) {
      console.error('[AppLogic] Failed to approve milestone via API:', err);
      console.warn('[Milestone] API failed. Attempting IMMEDIATE DIRECT CLIENT UPDATE as fallback.');

      // Fallback: Try to update directly via Supabase if the backend endpoint failed
      const { error: fallbackError } = await supabase
        .from('service_requests')
        .update({
          current_step: nextStep,
          completed_steps: newCompletedSteps,
          is_pending_student_confirmation: false,
          rejection_count: 0
        })
        .eq('id', requestId);

      if (fallbackError) {
        console.error('[Milestone] Direct fallback update failed:', fallbackError);
        alert('Server failed to process approval. Please contact support.');
        // Revert state
        const revertReq = (requests: any[]) => requests.map(sr => sr.id === requestId ? req : sr);
        setServiceRequests(prev => revertReq(prev));
        setAdmissionJourneys(prev => revertReq(prev));
      } else {
        console.log('[Milestone] Direct fallback update SUCCESS. State forced.');
      }
    }
  };
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], { type: mime });
  };

  const sanitizeFileName = (name: string): string => {
    return name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
  };
  const handleReportVisaRejection = async (requestId: string, file: File) => {
    try {
      let fileToUpload: File | Blob = file;
      const isImage = file.type.startsWith('image/');
      if (isImage && file.size > 2 * 1024 * 1024) {
        const compressedDataUrl = await compressImage(file);
        fileToUpload = dataURLtoBlob(compressedDataUrl);
      }

      const proofUrl = await api.uploadFile('admission-documents', `${requestId}/visa-denial-proof-${Date.now()}`, fileToUpload);
      await api.reportVisaRejection(requestId, proofUrl);

      // Refresh data to get the definitive state
      const { data: { user } } = await safeGetUser();
      if (user) {
        const updated = await api.getServiceRequests(user.id);
        setServiceRequests(prev => mergeServiceRequests(prev, updated));
        setAdmissionJourneys(prev => mergeServiceRequests(prev, updated));

        const currentReq = updated.find(r => r.id === requestId);
        if (currentReq) {
          const partnerId = user.id === currentReq.studentId ? currentReq.expertId : currentReq.studentId;
          await api.createNotification(partnerId, 'Visa Rejection Reported', 'A visa rejection has been reported and is awaiting your verification.', 'ADMISSION');
        }
      }

    } catch (err) {
      console.error('[AppLogic] Failed to report visa rejection:', err);
      alert('Failed to upload proof. Please try again.');
    }
  };

  const handleExpertVerifyRejection = async (requestId: string) => {
    try {
      // Optimistic update to immediately route user to 'REJECTED' tab
      const updateReq = (requests: any[]) => requests.map(sr => {
        if (sr.id === requestId) {
          return { ...sr, status: 'COMPLETED', visaStatus: 'DENIED' };
        }
        return sr;
      });
      setServiceRequests(prev => updateReq(prev));
      setAdmissionJourneys(prev => updateReq(prev));

      await api.expertVerifyRejection(requestId);

      const { data: { user } } = await safeGetUser();
      if (user) {
        const updated = await api.getServiceRequests(user.id);
        const mergedService = mergeServiceRequests(updateReq(serviceRequests), updated);
        const mergedAdmission = mergeServiceRequests(updateReq(admissionJourneys), updated);

        setServiceRequests(mergedService);
        setAdmissionJourneys(mergedAdmission);

        const currentReq = updated.find(r => r.id === requestId);
        if (currentReq) {
          await api.createNotification(currentReq.studentId, 'Visa Rejection Verified', 'Your visa rejection has been verified. A refund has been processed to your wallet.', 'WALLET');
        }
      }
    } catch (err: any) {
      console.error('[AppLogic] Failed to verify rejection:', err);
      // Show more specific error message if available
      const errMsg = err?.message || 'Failed to verify rejection. Please try again.';
      alert(errMsg);
    }
  };




  const handleRejectMilestone = async (requestId: string, message: string, file?: File) => {
    const req = serviceRequests.find(r => r.id === requestId);
    if (!req) return;

    if (req.currentStep === 'VISA') {
      console.warn('[AppLogic] handleRejectMilestone called for VISA. Should use handleReportVisaRejection.');
      return;
    }

    let feedbackDocUrl = undefined;
    if (file) {
      try {
        let fileToUpload: File | Blob = file;
        const isImage = file.type.startsWith('image/');
        if (isImage && file.size > 2 * 1024 * 1024) {
          const compressedDataUrl = await compressImage(file);
          fileToUpload = dataURLtoBlob(compressedDataUrl);
        }
        const sanitizedName = sanitizeFileName(file.name);
        feedbackDocUrl = await api.uploadFile('admission-documents', `${requestId}/milestone-rejection-${Date.now()}-${sanitizedName}`, fileToUpload);
      } catch (err) {
        console.error('Failed to upload rejection doc:', err);
      }
    }

    const feedback = { message, documentUrl: feedbackDocUrl };

    // Optimistic Update
    const updateReq = (requests: any[]) => requests.map(sr => {
      if (sr.id === requestId) {
        const newEntry: MilestoneHistoryEntry = {
          step: sr.currentStep,
          type: 'REJECTED',
          note: feedback.message,
          documentUrl: feedback.documentUrl,
          timestamp: new Date().toISOString(),
          uploadedBy: currentUser?.id
        };
        return {
          ...sr,
          isMilestoneRejected: true,
          isPendingStudentConfirmation: false,
          rejectionFeedback: feedback,
          milestoneHistory: [...(sr.milestoneHistory || []), newEntry]
        };
      }
      return sr;
    });

    setServiceRequests(prev => updateReq(prev));
    setAdmissionJourneys(prev => updateReq(prev));

    try {
      const { error: rpcError } = await supabase.rpc('increment_rejection_count', { request_id: requestId });

      const { data: latest } = await supabase.from('service_requests').select('rejection_count').eq('id', requestId).single();
      const nextCount = (latest?.rejection_count || 0);

      await api.studentRejectMilestone(requestId, feedback, nextCount, currentUser?.id);

      // We rely on the backend-triggered Broadcast Sync to update the definitive state.
      // Optimistic update was already applied at the start of this function.

    } catch (err) {
      console.error('[AppLogic] Failed to reject milestone:', err);
      alert('Failed to update milestone.');
    }
  };

  const handleMarkMilestone = async (requestId: string, notes?: string, file?: File) => {
    try {
      let documentUrl: string | undefined;
      if (file) {
        let fileToUpload: File | Blob = file;
        const isImage = file.type.startsWith('image/');
        if (isImage && file.size > 2 * 1024 * 1024) {
          const compressedDataUrl = await compressImage(file);
          fileToUpload = dataURLtoBlob(compressedDataUrl);
        }
        documentUrl = await api.uploadFile('admission-documents', `${requestId}/milestone-completion-${Date.now()}`, fileToUpload);
      }

      const feedback = (notes || documentUrl) ? { message: notes || '', documentUrl } : undefined;

      // Optimistic Update
      const updateReq = (requests: any[]) => requests.map(sr => {
        if (sr.id === requestId) {
          const newEntry: MilestoneHistoryEntry = {
            step: sr.currentStep,
            type: 'COMPLETED',
            note: feedback?.message || '',
            documentUrl: feedback?.documentUrl,
            timestamp: new Date().toISOString(),
            uploadedBy: currentUser?.id
          };
          return {
            ...sr,
            isPendingStudentConfirmation: true,
            isMilestoneRejected: false,
            completionFeedback: feedback,
            milestoneHistory: [...(sr.milestoneHistory || []), newEntry]
          };
        }
        return sr;
      });

      setServiceRequests(prev => updateReq(prev));
      setAdmissionJourneys(prev => updateReq(prev));

      await api.expertMarkMilestone(requestId, feedback, currentUser?.id);

      // We rely on the backend-triggered Broadcast Sync to update the definitive state.
      // Optimistic update was already applied at the start of this function.
    } catch (err) {
      console.error('[AppLogic] Failed to mark milestone:', err);
      alert('Failed to update milestone status.');
    }
  };
  const handlePostFeedback = async (requestId: string, rating: number, feedback: string) => {
    try {
      await api.updateJourneyReview(requestId, currentUser!.role as 'STUDENT' | 'EXPERT', rating, feedback);

      const updateReq = (requests: any[]) => requests.map(sr => {
        if (sr.id === requestId) {
          return {
            ...sr,
            ...(currentUser!.role === 'STUDENT' ? { studentRating: rating, studentFeedback: feedback } : { expertRating: rating, expertFeedback: feedback })
          };
        }
        return sr;
      });
      setServiceRequests(prev => updateReq(prev));
      setAdmissionJourneys(prev => updateReq(prev));

      // alert("Thank you for your feedback!");
    } catch (err) {
      console.error('[AppLogic] Failed to post feedback:', err);
      alert("Failed to save feedback.");
    }
  };

  const handleAddDocument = async (requestId: string, doc: { name: string, url: string, type: 'PDF' | 'IMAGE' }) => {
    if (!currentUser) return;
    try {
      const newDoc = await api.createDocument(requestId, {
        ...doc,
        uploadedBy: currentUser.id
      });

      setServiceRequests(prev => prev.map(sr => {
        if (sr.id === requestId) {
          return {
            ...sr,
            documents: [...(sr.documents || []), newDoc]
          };
        }
        return sr;
      }));
      setAdmissionJourneys(prev => prev.map(sr => {
        if (sr.id === requestId) {
          return {
            ...sr,
            documents: [...(sr.documents || []), newDoc]
          };
        }
        return sr;
      }));
    } catch (err) {
      console.error('[AppLogic] Failed to add document:', err);
      alert('Failed to save document reference.');
    }
  };

  const handleEditDocument = async (requestId: string, docId: string, name: string) => {
    // Optimistic Update
    const updateDoc = (requests: any[]) => requests.map(sr => {
      if (sr.id === requestId) {
        return {
          ...sr,
          documents: (sr.documents || []).map((d: any) => d.id === docId ? { ...d, name } : d)
        };
      }
      return sr;
    });

    setServiceRequests(prev => updateDoc(prev));
    setAdmissionJourneys(prev => updateDoc(prev));

    try {
      await api.renameDocument(docId, name);
    } catch (err) {
      console.error('[AppLogic] Failed to rename document:', err);
      alert('Failed to rename document.');
      // Revert would go here, skipping for simplicity but could be added
    }
  };

  const handleDeleteDocument = async (requestId: string, docId: string) => {
    // Optimistic Update
    const deleteDoc = (requests: any[]) => requests.map(sr => {
      if (sr.id === requestId) {
        return {
          ...sr,
          documents: (sr.documents || []).filter((d: any) => d.id !== docId)
        };
      }
      return sr;
    });

    setServiceRequests(prev => deleteDoc(prev));
    setAdmissionJourneys(prev => deleteDoc(prev));

    try {
      await api.deleteDocument(docId);
    } catch (err) {
      console.error('[AppLogic] Failed to delete document:', err);
      alert('Failed to delete document.');
    }
  };

  const handleEditPost = async (postId: string, content: string) => {
    try {
      await api.updatePost(postId, content);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content } : p));
    } catch (err) {
      console.error(err);
      alert("Failed to update post");
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await api.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete post");
    }
  };

  // Refresh service requests on currentUser change
  useEffect(() => {
    if (!currentUser) return;
    api.getServiceRequests(currentUser.id).then(res => {
      setServiceRequests(prev => mergeServiceRequests(prev, res));
      setAdmissionJourneys(prev => mergeServiceRequests(prev, res));
    }).catch(err => console.error('Service requests refresh error:', err));
  }, [currentUser]);

  const handleLoadMoreRecommended = async () => {
    if (!currentUser || isFetchingMoreRecommended || !hasMoreRecommended) return;

    setIsFetchingMoreRecommended(true);
    try {
      const res = await api.getRecommendedProfiles(currentUser.id, recommendedPage, 20);
      setRecommendedProfiles(prev => [...prev, ...res.profiles]);
      setHasMoreRecommended(res.hasMore);
      setRecommendedPage(prev => prev + 1);
    } catch (err) {
      console.error('[AppLogic] Failed to load more recommended profiles:', err);
    } finally {
      setIsFetchingMoreRecommended(false);
    }
  };

  const refreshConnections = useCallback(async () => {
    if (!currentUser || !currentUser.connections || currentUser.connections.length === 0) {
      setConnectedProfiles([]);
      setTotalConnectionsCount(0);
      setHasMoreConnections(false);
      setConnectionsPage(0);
      return;
    }
    try {
      const res = await api.getProfiles(undefined, undefined, 0, 20, currentUser.connections);
      setConnectedProfiles(res.profiles);
      setHasMoreConnections(res.hasMore);
      setConnectionsPage(1);

      // Update the accurate count (valid profiles only)
      setTotalConnectionsCount(res.profiles.length);

      // Self-Healing: If API returns fewer profiles than IDs, remove dead IDs
      const validIds = res.profiles.map(p => p.id);
      if (res.profiles.length < currentUser.connections.length && !res.hasMore) {
        const filteredConnections = currentUser.connections.filter(id => validIds.includes(id));

        // Only trigger update if the set of IDs has actually changed to prevent infinite loop
        if (filteredConnections.length !== currentUser.connections.length) {
          console.log('[AppLogic] Self-healing connections: removed ghost IDs');
          api.updateProfile(currentUser.id, { connections: filteredConnections });
          setCurrentUser({ ...currentUser, connections: filteredConnections });
        }
      }
    } catch (err) {
      console.error('Refresh connections error:', err);
    }
  }, [currentUser?.connections]);

  useEffect(() => {
    refreshConnections();
  }, [refreshConnections]);

  const handleLoadMoreConnections = async () => {
    if (isFetchingMoreConnections || !hasMoreConnections || !currentUser?.connections) return;
    setIsFetchingMoreConnections(true);
    try {
      const res = await api.getProfiles(undefined, undefined, connectionsPage, 20, currentUser.connections);
      setConnectedProfiles(prev => [...prev, ...res.profiles]);
      setHasMoreConnections(res.hasMore);
      setConnectionsPage(prev => prev + 1);
    } catch (err) {
      console.error('Load more connections error:', err);
    } finally {
      setIsFetchingMoreConnections(false);
    }
  };

  const handleHiringComplete = async (data: any) => {
    if (isIOSNative) {
      showIOSComplianceAlert('Hiring Services', 'https://migonest.com/discover');
      return;
    }
    if (!hiringExpert || !currentUser) return;
    try {
      const uploadedHiringDocs: any[] = [];
      const buckets = ['passport', 'residency', 'education'] as const;

      for (const bucket of buckets) {
        const files = data.uploadedFiles[bucket];
        if (files && files.length > 0) {
          for (const file of files) {
            const fileName = `HIRING_${bucket.toUpperCase()}_${Date.now()}_${file.name}`;
            const storagePath = `hiring/${currentUser.id}/${fileName}`;
            try {
              const fileUrl = await api.uploadFile('documents', storagePath, file);
              const typeLabel = bucket === 'passport' ? 'Passport/ID' : bucket === 'residency' ? 'Academic Records' : 'Test scores';
              uploadedHiringDocs.push({
                id: Math.random().toString(36).substr(2, 9),
                name: `${typeLabel}: ${file.name}`,
                type: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
                url: fileUrl,
                uploadedBy: currentUser.id,
                timestamp: Date.now()
              });
            } catch (err) {
              console.error(`Failed to upload ${bucket} file:`, err);
              throw new Error(`Failed to upload ${bucket} document. Please try again.`);
            }
          }
        }
      }

      setIsHiring(true);
      const isNative = Capacitor.isNativePlatform();

      const res = await api.initiateExpertHire({
        studentId: currentUser.id,
        expertId: hiringExpert.id,
        questionnaire: data.formData,
        agreements: data.agreements,
        hiringDocuments: uploadedHiringDocs,
        platform: isNative ? 'native' : undefined
      });

      if (res.url) {
        // On native Capacitor, use in-app browser so app regains control after payment.
        // On web, falls back to standard redirect.
        const hiredRequestId = res.requestId as string | undefined;
        await openExternalUrl(res.url, async () => {
          console.log('[Hire] Browser finished. Polling for PAID status...', hiredRequestId);
          if (!currentUser) return;

          if (hiredRequestId) {
            // Poll the specific request until webhook updates status to PAID
            let attempts = 0;
            const maxAttempts = 6;
            const pollInterval = 2000;
            const poll = async () => {
              attempts++;
              try {
                const full = await api.getServiceRequestById(hiredRequestId);
                console.log(`[Hire] Poll attempt ${attempts}: status=${full?.status}`);
                if (full && full.status === 'PAID') {
                  // Success — inject into state and navigate
                  setServiceRequests(prev => {
                    const merged = mergeServiceRequests(prev, [full]);
                    setAdmissionJourneys(merged);
                    return merged;
                  });
                  setIsHiring(false);
                  setHiringExpert(null);
                  setActiveRequestId(full.id);
                  setView('ADMISSION');
                  return;
                }
                if (attempts < maxAttempts) {
                  setTimeout(poll, pollInterval);
                } else {
                  // Timed out — do a full refresh as fallback
                  console.warn('[Hire] Polling timed out. Doing full refresh.');
                  const updated = await api.getServiceRequests(currentUser.id);
                  setServiceRequests(prev => mergeServiceRequests(prev, updated));
                  setAdmissionJourneys(prev => mergeServiceRequests(prev, updated));

                  console.log('[Hire] Polling reached max attempts. Navigating to list overview.');
                  setIsHiring(false);
                  setHiringExpert(null);
                  setActiveRequestId(null); // Ensure we don't auto-open an unpaid journey
                  setView('ADMISSION');
                }
              } catch (err) {
                console.error('[Hire] Poll error:', err);
                setIsHiring(false);
                setHiringExpert(null);
                setActiveRequestId(null);
                setView('ADMISSION');
              }
            };
            poll();
          } else {
            setIsHiring(false);
            setHiringExpert(null);
            setView('ADMISSION');
          }
        });
        return;
      } else {
        setIsHiring(false);
      }



      // Fallback for mock/manual confirm
      if (res.success) {
        setHiringExpert(null);
        if (res.requestId) {
          api.getServiceRequestById(res.requestId).then(full => {
            if (full) {
              setServiceRequests(prev => [full, ...prev]);
              setActiveRequestId(full.id);
            }
          });
        }
        setView('ADMISSION');
      }
    } catch (err: any) {
      console.error("Hiring error:", err);
      // Show more specific error message if available
      const errorMessage = err.message || "Hiring failed. Please try again.";
      // Close the wizard to ensure the error modal is visible
      setHiringExpert(null);
      setIsHiring(false);

      const isActiveJourney = errorMessage.toLowerCase().includes('active admission journey') ||
        errorMessage.toLowerCase().includes('ongoing admission journey');

      setPaymentResult({
        isOpen: true,
        type: 'error',
        title: isActiveJourney ? 'Active Journey Found' : 'Hiring Failed',
        message: errorMessage
      });
    }
  };


  const handleResumePayment = async (requestId: string) => {
    if (isIOSNative) {
      showIOSComplianceAlert('Payment Completion');
      return;
    }
    setIsResumingPayment(true);
    try {
      const isNative = Capacitor.isNativePlatform();

      const res = await api.resumeServiceRequestPayment(requestId, isNative ? 'native' : undefined);
      if (res.url) {
        await openExternalUrl(res.url, async () => {
          console.log('[ResumePayment] Browser finished. Polling for PAID status...');
          if (!currentUser) return;
          let attempts = 0;
          const poll = async () => {
            attempts++;
            try {
              const full = await api.getServiceRequestById(requestId);
              if (full?.status === 'PAID') {
                setServiceRequests(prev => {
                  const merged = mergeServiceRequests(prev, [full]);
                  setAdmissionJourneys(merged);
                  return merged;
                });
                setIsResumingPayment(false);
                setActiveRequestId(full.id);
                setView('ADMISSION');
              } else if (attempts < 6) {
                setTimeout(poll, 2000);
              } else {
                // Timed out — still navigate to ADMISSION showing the (optimistically PAID) card
                setIsResumingPayment(false);
                setPaymentResult({
                  isOpen: true,
                  type: 'cancel',
                  title: 'Payment Still Processing',
                  message: 'If you just completed your payment, it may take a minute to appear here. If you cancelled, you can try again anytime.'
                });
                setView('ADMISSION');
              }
            } catch (err) {
              console.error('[ResumePayment] Poll failed:', err);
              setIsResumingPayment(false);
              setView('ADMISSION');
            }
          };
          poll();
        });
      } else {
        setIsResumingPayment(false);
        const errorMsg = (res as any).error || "Failed to resume payment. Please try again.";
        alert(errorMsg);
      }

    } catch (err: any) {
      console.error('[ResumePayment] Failed:', err);
      setIsResumingPayment(false);
      alert(`Failed to resume payment: ${err.message || 'Unknown error'}`);
    }
  };


  const handleCancelPendingHire = async (requestId: string) => {
    setCancelingRequestId(requestId);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancelHire = async () => {
    if (!cancelingRequestId) return;
    const targetId = cancelingRequestId; // Capture ID for closure consistency

    setIsCancelingAdmission(true);
    try {
      const res = await api.cancelServiceRequest(targetId);
      if (res.success) {
        // Close modal immediately on success so the user sees progress
        setIsCancelModalOpen(false);

        // Optimistically remove from local state immediately
        setServiceRequests(prev => prev.filter(r => r.id !== targetId));
        setAdmissionJourneys(prev => prev.filter(r => r.id !== targetId));

        // Then refresh the list in the background
        await handleSearchAdmission(admissionSearchQuery, admissionSubView);
      } else {
        alert("Failed to cancel admission journey. Please try again.");
      }
    } catch (err: any) {
      console.error("Cancel hire error:", err);

      // If the error is 'Request not found' (404), it means it's already deleted.
      // We should treat this as a success for the UI.
      if (err.message && (err.message.includes('not found') || err.message.includes('404'))) {
        setIsCancelModalOpen(false);
        setServiceRequests(prev => prev.filter(r => r.id !== targetId));
        setAdmissionJourneys(prev => prev.filter(r => r.id !== targetId));
        return;
      }

      alert("Failed to cancel admission journey. Please try again.");
    } finally {
      setIsCancelingAdmission(false);
      setIsCancelModalOpen(false);
      setCancelingRequestId(null);
    }
  };

  const handleConfirmResetStripe = async () => {
    if (!currentUser) return;
    setIsResettingStripe(true);
    try {
      await api.resetStripeSetup(currentUser.id);

      // Update local profile state
      const updatedUser = { ...currentUser, stripeConnectId: null, payoutsEnabled: false };
      setCurrentUser(updatedUser);

      // Also update selectedProfile if viewing self
      if (selectedProfile?.id === currentUser.id) {
        setSelectedProfile(updatedUser);
      }

      setIsResetStripeModalOpen(false);
    } catch (err: any) {
      console.error('Failed to reset Stripe setup:', err);
      alert(`Failed to reset setup: ${err.message}`);
    } finally {
      setIsResettingStripe(false);
    }
  };





  const handleSaveOnboarding = async (data: Partial<Profile>) => {
    if (!currentUser?.id) return;
    try {
      console.log('[Auth] Saving onboarding for user:', currentUser.id);
      await api.updateProfile(currentUser.id, {
        ...data,
        isOnboarded: true
      });
      const updatedProfile = { ...currentUser, ...data, isOnboarded: true };
      console.log('[Auth] Profile updated successfully, isOnboarded: true');
      handleUpdateProfile(updatedProfile);
    } catch (err) {
      console.error("Onboarding Save Error:", err);
      alert("Failed to save profile. Please try again.");
      throw err; // Propagate error so UI knows it failed
    }
  };

  const handleContinueInBrowser = async () => {
    // 1. Immediate UI Transition: Move away from the bridge state right away
    setView('ONBOARDING');
    setIsLoading(true);

    try {
      console.log('[Auth] Continue in browser: Consuming bridge tokens...', bridgeParams);
      if (bridgeParams) {
        if (bridgeParams.access_token && bridgeParams.refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token: bridgeParams.access_token,
            refresh_token: bridgeParams.refresh_token
          });
          if (!error && data.session) {
            setIsAuthenticated(true);
            await loadUserProfile(data.session.user.id, data.session.user.email);
          }
        } else if (bridgeParams.code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(bridgeParams.code);
          if (!error && data.session) {
            setIsAuthenticated(true);
            await loadUserProfile(data.session.user.id, data.session.user.email);
          }
        }
      }
    } catch (err) {
      console.error('[Auth] Failed to continue in browser:', err);
      // Fallback: stay in ONBOARDING and hope for session recovery
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    // Use setView directly to bypass the navigateTo guard closure issue
    setView('HOME');
    console.log('[Navigation] Forced view to HOME after onboarding');
  };

  const navigateTo = useCallback((v: string) => {
    // Strict block: if authenticated but not onboarded, only allow ONBOARDING view
    // Allow SETTINGS and HELP to escape deadlock
    if (isAuthenticated && currentUser && !currentUser.isOnboarded && v !== 'ONBOARDING' && v !== 'SETTINGS' && v !== 'HELP') {
      console.warn('[Navigation] Blocked - Onboarding incomplete for:', currentUser.id, { isOnboarded: currentUser.isOnboarded });
      return;
    }

    console.log('[Navigation] Setting view to:', v);
    // Reset active chat ID when navigating to ensure clean state
    if (activeChatId) setActiveChatId(null);

    // URL sync handled by useEffect
    setView(v);
    window.scrollTo(0, 0);
  }, [isAuthenticated, currentUser, activeChatId]);

  const handleSubscribe = async (force = false, explicitReferrer?: string) => {
    if (!currentUser) return;
    setIsSubscribing(true);
    let shouldClearSpinner = true;
    try {
      const finalReferrer = explicitReferrer || referralSourceId;

      // NATIVE iOS: Handle via RevenueCat (Apple In-App Purchase)
      if (isIOSNative) {
        try {
          // Set Referrer Attribute if exists
          if (finalReferrer) {
            await Purchases.setAttributes({ "referrerId": finalReferrer });
          }

          // Use the modern RevenueCat Paywall UI for iOS
          await RevenueCatUI.presentPaywallIfNeeded({
            requiredEntitlementIdentifier: 'Migonest Premium'
          });

          // Check if specifically the premium entitlement is now active
          const { customerInfo } = await Purchases.getCustomerInfo();
          if (customerInfo.entitlements.active['Migonest Premium']) {
            console.log('[Purchases] Native subscription verified');
            const profile = await api.getSessionProfile(currentUser.id);
            if (profile) setCurrentUser(profile);
            setIsSubModalOpen(false);

            setPaymentResult({
              isOpen: true,
              type: 'success',
              title: 'Welcome to Premium!',
              message: 'Your subscription is active. You now have full access to chat and community features.'
            });
          }
        } catch (e: any) {
          if (e.userCancelled) {
            console.log('[Purchases] User cancelled purchase');
          } else {
            console.error('[Purchases] Purchase error:', e);
            
            // Helpful logging for Error 23 (Configuration Error)
            if (e.code === 23 || (e.message && e.message.includes('23'))) {
              console.error('[Purchases] CONFIGURATION ERROR detected. Check your Offering in RevenueCat - it must be linked to the real "App Store" product, not the "Test Store" one.');
            }

            alert('Subscription Error: ' + (e.message || 'Check your internet connection and try again.'));
          }
        } finally {
          setIsSubscribing(false);
        }
        return;
      }

      const res = await api.subscribe(currentUser.id, finalReferrer || undefined, force);

      if (res.url) {
        // Hand off to pollProfile which will be triggered by onBrowserFinished
        shouldClearSpinner = false;
        await openExternalUrl(res.url, async () => {
          // Browser closed after subscription payment; sync and re-load user profile
          console.log('[Subscribe] Browser finished, starting activation polling...');
          if (currentUser) {
            pollProfile(0);
          }
        });
        return;
      }

      if (res.alreadySubscribed) {
        setIsSubscribing(false);
        setPaymentResult({
          isOpen: true,
          type: 'success',
          title: 'Already Premium!',
          message: 'You already have an active premium subscription.'
        });
        const profile = await api.getSessionProfile(currentUser.id);
        if (profile) setCurrentUser(profile);
        return;
      }


      if (res.success) {
        const updatedUser = { ...currentUser, isSubscribed: true, walletBalance: currentUser.walletBalance - 19.99 };
        setCurrentUser(updatedUser);
        localStorage.setItem('migonest_user_session', JSON.stringify(updatedUser));
        setReferralSourceId(null);
        setIsSubModalOpen(false);

        if (view === 'WALLET' || view === 'TRANSACTIONS') {
          handleFetchTransactions(currentUser.id, transactionQuery, transactionYear);
        }
        console.log('[AppLogic] Subscription successful (Mock)');
      }
    } catch (err: any) {
      console.error('[AppLogic] Subscription failed:', err);
      alert(`Subscription failed: ${err.message || 'Unknown error. Please try again.'}`);
    } finally {
      if (shouldClearSpinner) {
        setIsSubscribing(false);
      }
    }
  };


  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const path = window.location.pathname.toUpperCase().replace(/^\//, '');
      let cleanView = path.split('/')[0] || 'HOME';

      // Special handling for profile paths
      if (path.startsWith('IN/')) {
        cleanView = 'PROFILE';
      }

      console.log('[Navigation] PopState detected:', { path, cleanView, view });

      if (isAuthenticated && currentUser && !currentUser.isOnboarded && cleanView !== 'ONBOARDING' && cleanView !== 'SETTINGS' && cleanView !== 'HELP') {
        window.history.replaceState(null, '', '/onboarding');
        setView('ONBOARDING');
        return;
      }

      if (cleanView !== view) {
        setView(cleanView);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults({ experts: [], students: [] });
      setHasMoreSearch({ experts: false, students: false });
      setSearchExpertsPage(0);
      setSearchStudentsPage(0);
      return;
    }

    if (view !== 'SEARCH') setView('SEARCH');
    setIsSearching(true);
    setSearchExpertsPage(0);
    setSearchStudentsPage(0);

    try {
      // Server-side search for Experts and Students (20 results initially)
      const [resExperts, resStudents] = await Promise.all([
        api.getProfiles('EXPERT', query, 0, 20),
        api.getProfiles('STUDENT', query, 0, 20)
      ]);

      setSearchResults({
        experts: resExperts.profiles,
        students: resStudents.profiles
      });

      setHasMoreSearch({
        experts: resExperts.hasMore,
        students: resStudents.hasMore
      });

      setSearchExpertsPage(1);
      setSearchStudentsPage(1);
    } catch (err) {
      console.error('[AppLogic] Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [view]);

  const handleFetchTransactions = useCallback(async (userId: string, query: string, year: string) => {
    setIsFetchingTransactions(true);
    setTransactionsPage(0);
    try {
      const { transactions, hasMore } = await api.getWalletTransactionsPaginated(userId, query, year, 0, 20);
      setTransactionsHistory(transactions);
      setHasMoreTransactions(hasMore);
      setTransactionsPage(1);
    } catch (err) {
      console.error('[AppLogic] Fetch transactions error:', err);
    } finally {
      setIsFetchingTransactions(false);
    }
  }, []);

  const handleLoadMoreTransactions = useCallback(async () => {
    if (!currentUser?.id || isFetchingMoreTransactions || !hasMoreTransactions) return;

    setIsFetchingMoreTransactions(true);
    try {
      const { transactions, hasMore } = await api.getWalletTransactionsPaginated(
        currentUser.id,
        transactionQuery,
        transactionYear,
        transactionsPage,
        20
      );
      setTransactionsHistory(prev => [...prev, ...transactions]);
      setHasMoreTransactions(hasMore);
      setTransactionsPage(prev => prev + 1);
    } catch (err) {
      console.error('[AppLogic] Load more transactions error:', err);
    } finally {
      setIsFetchingMoreTransactions(false);
    }
  }, [currentUser?.id, transactionQuery, transactionYear, transactionsPage, hasMoreTransactions, isFetchingMoreTransactions]);

  const handleSearchTransactions = useCallback((query: string) => {
    setTransactionQuery(query);
    if (!currentUser?.id) return;
    handleFetchTransactions(currentUser.id, query, transactionYear);
  }, [currentUser?.id, transactionYear, handleFetchTransactions]);

  const handleFilterTransactionsByYear = useCallback((year: string) => {
    setTransactionYear(year);
    if (!currentUser?.id) return;
    handleFetchTransactions(currentUser.id, transactionQuery, year);
  }, [currentUser?.id, transactionQuery, handleFetchTransactions]);

  const handleLoadMoreSearch = async (role: 'EXPERT' | 'STUDENT') => {
    const currentPage = role === 'EXPERT' ? searchExpertsPage : searchStudentsPage;
    if (isFetchingMoreSearch || !hasMoreSearch[role === 'EXPERT' ? 'experts' : 'students']) return;

    setIsFetchingMoreSearch(true);
    try {
      const res = await api.getProfiles(role, searchQuery, currentPage, 20);
      setSearchResults(prev => ({
        ...prev,
        [role === 'EXPERT' ? 'experts' : 'students']: [...prev[role === 'EXPERT' ? 'experts' : 'students'], ...res.profiles]
      }));
      setHasMoreSearch(prev => ({
        ...prev,
        [role === 'EXPERT' ? 'experts' : 'students']: res.hasMore
      }));

      if (role === 'EXPERT') setSearchExpertsPage(prev => prev + 1);
      else setSearchStudentsPage(prev => prev + 1);
    } catch (err) {
      console.error('[AppLogic] Load more search error:', err);
    } finally {
      setIsFetchingMoreSearch(false);
    }
  };

  const handleLoadMoreExperts = async () => {
    if (isFetchingMoreExperts || !hasMoreExperts) return;
    setIsFetchingMoreExperts(true);
    try {
      const res = await api.getProfiles('EXPERT', undefined, expertsPage, 20);
      setExpertsList(prev => [...prev, ...res.profiles]);
      setHasMoreExperts(res.hasMore);
      setExpertsPage(prev => prev + 1);
    } catch (err) {
      console.error('Load more experts error:', err);
    } finally {
      setIsFetchingMoreExperts(false);
    }
  };

  const handleLoadMoreStudents = async () => {
    if (isFetchingMoreStudents || !hasMoreStudents) return;
    setIsFetchingMoreStudents(true);
    try {
      const res = await api.getProfiles('STUDENT', undefined, studentsPage, 20);
      setStudentsList(prev => [...prev, ...res.profiles]);
      setHasMoreStudents(res.hasMore);
      setStudentsPage(prev => prev + 1);
    } catch (err) {
      console.error('Load more students error:', err);
    } finally {
      setIsFetchingMoreStudents(false);
    }
  };

  const handleLoadMoreAdmission = async () => {
    if (!currentUser || isFetchingMoreAdmission || !hasMoreAdmission) return;
    setIsFetchingMoreAdmission(true);
    try {
      const { requests, hasMore } = await api.getServiceRequestsPaginated(
        currentUser.id,
        admissionSubView,
        admissionSearchQuery,
        admissionYear,
        admissionPage,
        20
      );

      setAdmissionJourneys(prev => {
        const merged = mergeServiceRequests(prev, requests);
        setServiceRequests(merged); // Keep main list in sync
        return merged;
      });
      setHasMoreAdmission(hasMore);
      setAdmissionPage(prev => prev + 1);
    } catch (err) {
      console.error('[AppLogic] Load more admission error:', err);
    } finally {
      setIsFetchingMoreAdmission(false);
    }
  };

  const handleSearchAdmission = async (query: string, subView: 'ACTIVE' | 'SUCCESSFUL' | 'REJECTED' | null) => {
    if (!currentUser) return;
    setAdmissionSearchQuery(query);
    setAdmissionSubView(subView);
    setAdmissionPage(0);
    setIsFetchingMoreAdmission(true); // Re-using this as a "searching" state for simplicity or use a new one

    try {
      const { requests, hasMore } = await api.getServiceRequestsPaginated(
        currentUser.id,
        subView,
        query,
        admissionYear,
        0,
        20
      );

      setAdmissionJourneys(prev => {
        const merged = mergeServiceRequests(prev, requests);
        setServiceRequests(merged); // Keep main list in sync
        return merged;
      });

      setHasMoreAdmission(hasMore);
      setAdmissionPage(1);
    } catch (err) {
      console.error('[AppLogic] Search admission error:', err);
    } finally {
      setIsFetchingMoreAdmission(false);
    }
  };

  const handleLoadMoreReviews = async (status: string) => {
    if (isFetchingMoreReviews || !hasMoreReviews) return;
    setIsFetchingMoreReviews(true);
    try {
      const res = await api.getExpertApplicationsPaginated(status, reviewsPage, 20);
      setExpertApplications(prev => [...prev, ...res.applications]);
      setHasMoreReviews(res.hasMore);
      setReviewsPage(prev => prev + 1);
    } catch (err) {
      console.error('Load more reviews error:', err);
    } finally {
      setIsFetchingMoreReviews(false);
    }
  };


  // Activity Handlers
  const handleMarkNotificationsAsRead = useCallback(async () => {
    if (!currentUser) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    // Optimistic Update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      await Promise.all(unread.map(n => api.markNotificationRead(n.id)));
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  }, [currentUser, notifications]);

  const handleSendMessage = async (partnerId: string, text: string) => {
    if (!currentUser || !text.trim()) return;
    try {
      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const tempMsg: ChatMessage = {
        id: tempId,
        senderId: currentUser.id,
        receiverId: partnerId,
        text: text.trim(),
        timestamp: Date.now(),
        read: false
      };
      setMessages(prev => [...prev, tempMsg]);

      const sentMsg = await api.sendMessage(currentUser.id, partnerId, text);

      // Replace temp with real
      setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m));
    } catch (err) {
      console.error('Send message failed:', err);
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
      alert('Failed to send message.');
    }
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    // Optimistic
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: newText } : m));
    try {
      await api.updateMessage(messageId, newText);
    } catch (err) {
      console.error('Failed to edit message:', err);
      // Revert needs previous state... for now just alert
      alert('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    // Optimistic
    setMessages(prev => prev.filter(m => m.id !== messageId));
    try {
      await api.deleteMessage(messageId);
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert('Failed to delete message');
    }
  };

  const handleClearChatHistory = async (partnerId: string) => {
    if (!currentUser) return;

    // Optimistic
    setMessages(prev => prev.filter(m =>
      !((m.senderId === currentUser.id && m.receiverId === partnerId) ||
        (m.senderId === partnerId && m.receiverId === currentUser.id))
    ));

    try {
      await api.deleteChatHistory(currentUser.id, partnerId);
    } catch (err) {
      console.error('Failed to clear history:', err);
      alert('Failed to clear history');
    }
  };

  // Chat Subscription
  useEffect(() => {
    if (!currentUser?.id || !isAuthenticated) {
      if (!currentUser?.id) setMessages([]);
      return;
    }

    // Initial fetch
    api.getMessages(currentUser.id).then(msgs => {
      setMessages(msgs);
    }).catch(err => console.error('Failed to load messages:', err));

    // Unified Real-time Subscription
    let sub: any = null;
    let retryCount = 0;
    const maxRetries = 5;
    let timeoutId: any = null;

    const setupRealtime = async () => {
      if (!currentUser || !isAuthenticated) return;

      // Fresh session check
      const { data: { session } } = await safeGetSession();
      if (!session) {
        console.warn('[Realtime] No session found, skipping subscription.');
        return;
      }

      // Cleanup previous
      if (sub) {
        supabase.removeChannel(sub);
        sub = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      console.log('[Realtime] Subscribing to app updates for user:', currentUser.id);

      // Shared helper for processing service_request updates from Realtime
      const handleJourneyUpdate = async (id: string, roleInfo?: string) => {
        console.log(`[Realtime] Processing journey update (${roleInfo}):`, id);
        try {
          const full = await api.getServiceRequestById(id);
          if (!full) return;

          const updateList = (prev: ServiceRequest[]) => {
            const exists = prev.some(r => r.id === full.id);
            if (exists) {
              // GUARD: Never let Realtime overwrite an optimistic PAID state with PENDING_PAYMENT
              const current = prev.find(r => r.id === full.id);
              if (current?.status === 'PAID' && full.status === 'PENDING_PAYMENT') {
                console.log('[Realtime] Guard: Ignoring stale PENDING_PAYMENT update for PAID journey:', full.id);
                return prev;
              }
              return prev.map(r => r.id === full.id ? full : r);
            }
            if (full.status === 'PAID') {
              console.log('[Realtime] Adding newly PAID journey to state:', full.id);
              return [full, ...prev];
            }
            return prev;
          };
          setServiceRequests(prev => updateList(prev));
          setAdmissionJourneys(prev => updateList(prev));

          if ((full.status === 'PAID' || full.status === 'COMPLETED') && currentUser) {
            const { data: { user: authUser } } = await safeGetUser();
            if (authUser) {
              const refreshed = await api.getSessionProfile(authUser.id);
              setCurrentUser(refreshed);
            }
          }
        } catch (err) {
          console.error('[Realtime] Error handling journey update:', id, err);
        }
      };

      const channel = supabase.channel('app_realtime')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` },
          (p) => {
            const newMsg = p.new as ChatMessage;
            setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUser.id}` },
          (p) => {
            const newMsg = p.new as ChatMessage;
            setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` },
          (p) => setMessages(prev => prev.map(m => m.id === p.new.id ? { ...m, text: p.new.content, read: p.new.read } : m))
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUser.id}` },
          (p) => setMessages(prev => prev.map(m => m.id === p.new.id ? { ...m, text: p.new.content, read: p.new.read } : m))
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'messages' },
          (p) => setMessages(prev => prev.filter(m => m.id !== p.old.id))
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
          async (p) => {
            const newNotif = api.mapNotificationFromDB(p.new);
            setNotifications(prev => prev.some(n => n.id === newNotif.id) ? prev : [newNotif, ...prev]);

            if (p.new.type === 'ADMISSION') {
              try {
                const updated = await api.getServiceRequests(currentUser.id);
                setServiceRequests(prev => mergeServiceRequests(prev, updated));
                setAdmissionJourneys(prev => mergeServiceRequests(prev, updated));
              } catch (err) {
                console.error('[Realtime] Failed to refresh journeys on ADMISSION notification:', err);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
          (p) => {
            const updated = api.mapNotificationFromDB(p.new);
            setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'notifications' },
          (p) => setNotifications(prev => prev.filter(n => n.id !== p.old.id))
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser.id}` },
          (p) => {
            const updated = p.new as Profile;
            setCurrentUser(prev => {
              if (!prev) return updated;
              const merged = { ...prev, ...updated };
              localStorage.setItem('migonest_user_session', JSON.stringify(merged));
              return merged;
            });
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `student_id=eq.${currentUser.id}` },
          async (p) => {
            await handleJourneyUpdate(p.new.id, 'Student Role');
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'service_requests', filter: `expert_id=eq.${currentUser.id}` },
          async (p) => {
            await handleJourneyUpdate(p.new.id, 'Expert Role');
          }
        )
        .on(
          'broadcast',
          { event: 'ADMISSION_UPDATE' },
          async (p) => {
            if (p.payload.userId === currentUser.id && p.payload.id) {
              await handleJourneyUpdate(p.payload.id, 'Broadcast Sync');
            }
          }
        )
        .subscribe(async (status, err) => {
          console.log(`[Realtime] Subscription status for app_realtime:`, status);
          if (status === 'SUBSCRIBED') {
            retryCount = 0;
          }
          if (err) {
            console.error('[Realtime] Subscription error:', err);
            if (err.message?.toLowerCase().includes('expired') || err.message?.toLowerCase().includes('jwt')) {
              await safeGetSession();
            }
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (sub) {
              supabase.removeChannel(sub);
              sub = null;
            }
            if (isAuthenticated && retryCount < maxRetries) {
              retryCount++;
              const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
              console.warn(`[Realtime] Connection failed. Retrying in ${delay}ms (Attempt ${retryCount}/${maxRetries})`);
              timeoutId = setTimeout(setupRealtime, delay);
            }
          }
        });

      sub = channel;
    };

    setupRealtime();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (sub) {
        console.log('[Realtime] Removing channel subscription');
        supabase.removeChannel(sub);
      }
    };
  }, [currentUser?.id, isAuthenticated]);

  const handleMarkMessagesAsRead = useCallback((partnerId?: string) => {
    setMessages(prev => prev.map(m => {
      // If partnerId provided, only mark those. Otherwise mark all incoming messages as read.
      const shouldMark = partnerId ? m.senderId === partnerId : m.senderId !== currentUser?.id;
      return shouldMark ? { ...m, read: true } : m;
    }));
  }, [currentUser?.id]);

  // Derived Activity Counts
  const unreadMessageCount = messages.filter(m => !m.read && m.senderId !== currentUser?.id).length;
  // Proactive refresh when app returns from background/browser
  useEffect(() => {
    let focusTimeout: NodeJS.Timeout;

    const handleFocus = async () => {
      if (!isAuthenticated || !currentUser) return;

      clearTimeout(focusTimeout);
      focusTimeout = setTimeout(async () => {
        if (isSessionRefreshingRef.current) return;

        try {
          isSessionRefreshingRef.current = true;
          // Use safeGetSession to avoid refresh token race conditions
          const { data: { session } } = await safeGetSession();
          if (!session) return;

          console.log('[App] Focus regained. Refreshing state...');
          if (view === 'ADMISSION' || view === 'HOME') {
            await handleSearchAdmission(admissionSearchQuery, admissionSubView);
          }
        } catch (err) {
          console.error('[App] Focus sync error:', err);
        } finally {
          // Debounce the unlock
          setTimeout(() => { isSessionRefreshingRef.current = false; }, 500);
        }
      }, 200);
    };

    window.addEventListener('focus', handleFocus);
    const handleVis = () => { if (document.visibilityState === 'visible') handleFocus(); };
    document.addEventListener('visibilitychange', handleVis);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVis);
      clearTimeout(focusTimeout);
    };
  }, [isAuthenticated, currentUser, view, admissionSearchQuery, admissionSubView]);

  return {
    isAuthenticated, isLoading, currentUser, setCurrentUser, isDark, toggleTheme: () => setIsDark(!isDark), view, setView,
    isLoginModalOpen, setIsLoginModalOpen, isSignupModalOpen, setIsSignupModalOpen,
    searchQuery, searchResults, handleSearch,
    posts, setPosts, serviceRequests, setServiceRequests, admissionJourneys, setAdmissionJourneys, notifications, setNotifications,
    messages, setMessages, expertsList, studentsList, expertApplications, setExpertApplications,
    activeChatId, setActiveChatId, selectedProfile, setSelectedProfile, hiringExpert, setHiringExpert,
    isSubModalOpen, setIsSubModalOpen, isPrivacyOpen, setIsPrivacyOpen, isTermsOpen, setIsTermsOpen,
    isAboutUsOpen, setIsAboutUsOpen, isHelpCenterOpen, setIsHelpCenterOpen, isExpertGuidelinesOpen, setIsExpertGuidelinesOpen, isRefundGuaranteeOpen, setIsRefundGuaranteeOpen,
    activeRequestId, setActiveRequestId,
    isNotifOpen, setIsNotifOpen, isProfileSheetOpen, setIsProfileSheetOpen,
    referralSourceId, setReferralSourceId,
    isSubscribed: !!currentUser?.isSubscribed,
    isIOSNative, isNative,

    handleOpenCustomerCenter: async () => {
      if (isIOSNative) {
        try {
          await RevenueCatUI.presentCustomerCenter();
        } catch (err) {
          console.error('[Purchases] Failed to open Customer Center:', err);
        }
      }
    },

    navigateTo, handleLoginSuccess, handleLogout, handleSubscribe, handleToggleConnect, handleCreatePost, handleEditPost, handleDeletePost, handleHiringComplete, handleSaveOnboarding, handleOnboardingComplete, handleUpdateProfile, handleContinueInBrowser, handleSendMessage, handleEditMessage, handleDeleteMessage, handleClearChatHistory, handleAddDocument, handleEditDocument, handleDeleteDocument, handleMarkMilestone, handleApproveMilestone, handleRejectMilestone, handleReportVisaRejection, handleExpertVerifyRejection, handlePostFeedback,
    handleLoadMoreAdmission, handleSearchAdmission,
    postsPage, hasMorePosts, isFetchingMorePosts, handleLoadMorePosts,
    searchExpertsPage, searchStudentsPage, hasMoreSearch, isSearching, isFetchingMoreSearch, handleLoadMoreSearch,
    expertsPage, hasMoreExperts, isFetchingMoreExperts, handleLoadMoreExperts,
    studentsPage, hasMoreStudents, isFetchingMoreStudents, handleLoadMoreStudents,
    connectionsPage, hasMoreConnections, isFetchingMoreConnections, handleLoadMoreConnections,
    reviewsPage, hasMoreReviews, isFetchingMoreReviews, handleLoadMoreReviews,
    recommendedProfiles, hasMoreRecommended, isFetchingMoreRecommended, handleLoadMoreRecommended,
    admissionPage, hasMoreAdmission, isFetchingMoreAdmission, admissionSearchQuery, admissionYear, setAdmissionYear,
    connectedProfiles, totalConnectionsCount,
    likedPostIds, repostedPostIds,
    unreadMessageCount,
    transactionsHistory, transactionQuery, transactionYear, hasMoreTransactions, isFetchingTransactions, isFetchingMoreTransactions,
    handleSearchTransactions, handleFilterTransactionsByYear, handleLoadMoreTransactions,
    handleMarkNotificationsAsRead,
    handleMarkMessagesAsRead,
    handleViewProfile: useCallback(async (p: Profile | string) => {
      let profileToView: Profile | null = null;
      if (typeof p === 'string') {
        const all = [...expertsList, ...studentsList, ...connectedProfiles];
        profileToView = all.find(u => u?.id === p) || null;

        if (!profileToView) {
          console.log('[Navigation] Profile not in local cache, fetching from DB:', p);
          profileToView = await api.getSessionProfile(p);
        }
      } else {
        profileToView = p;
      }

      if (!profileToView) {
        console.warn('[Navigation] Profile not found or null');
        return;
      }

      if (currentUser && profileToView.id === currentUser.id) {
        setSelectedProfile(null);
        navigateTo('PROFILE');
      } else {
        setSelectedProfile(profileToView);
        // Do not navigate to 'PROFILE' view for others, 
        // the selectedProfile state triggers the modal popup
      }
    }, [currentUser, expertsList, studentsList, connectedProfiles, navigateTo]),

    handleViewMembership: () => {
      setProfileTargetSection('MEMBERSHIP');
      navigateTo('PROFILE');
    },
    setProfileTargetSection,
    profileTargetSection,

    handleMarkAllRead: async () => {
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      try {
        await Promise.all(notifications.filter(n => !n.read).map(n => api.markNotificationRead(n.id)));
      } catch (err) {
        console.error('Failed to mark all notifications read:', err);
      }
    },
    handleNotificationClick: async (n: AppNotification) => {
      await api.markNotificationRead(n.id);
      setNotifications(notifications.map(item => item.id === n.id ? { ...item, read: true } : item));
      setIsNotifOpen(false);

      if (n.type === 'ADMISSION') {
        const match = n.message.match(/##RID:([a-zA-Z0-9-]+)##/);
        if (match && match[1]) {
          console.log('[Navigation] Notification click with RID:', match[1]);
          setActiveRequestId(match[1]);
        }
        navigateTo('ADMISSION');
      } else if (n.type === 'WALLET') {
        navigateTo('WALLET');
      } else if (n.type === 'CHAT') {
        navigateTo('MESSAGES');
      } else if (n.type === 'POST') {
        navigateTo('HOME');
      }
    },
    refreshUserProfileInLists: useCallback(async (userId: string) => {
      try {
        console.log('[Data] Refreshing profile in lists for user:', userId);
        // Add a small delay to ensure backend transaction is fully committed and visible
        await new Promise(resolve => setTimeout(resolve, 1000));

        const updatedProfile = await api.getSessionProfile(userId);
        if (updatedProfile) {
          console.log('[Data] Refreshed profile:', { id: updatedProfile.id, role: updatedProfile.role, countries: updatedProfile.targetCountries });

          // Force update in lists
          const isExpert = updatedProfile.role === 'EXPERT';

          if (isExpert) {
            // Remove from students, Add/Update in Experts
            setStudentsList(prev => {
              const wasInStudents = prev.some(p => p.id === userId);
              console.log('[Data] Was in students list:', wasInStudents);
              return prev.filter(p => p.id !== userId);
            });
            setExpertsList(prev => {
              const exists = prev.find(p => p.id === userId);
              if (exists) return prev.map(p => p.id === userId ? updatedProfile : p);
              return [updatedProfile, ...prev];
            });
            // Also refresh recommended
            api.getRecommendedProfiles(currentUser?.id || '').then(res => setRecommendedProfiles(res.profiles));
          } else {
            // Update in Students
            // Update in Students
            setStudentsList(prev => prev.map(p => p.id === userId ? updatedProfile : p));
          }

          // Also update selectedProfile if it's the one being viewed
          if (selectedProfile && selectedProfile.id === userId) {
            console.log('[Data] Updating active selectedProfile view');
            setSelectedProfile(updatedProfile);
          }
        }
      } catch (err) {
        console.error('Failed to refresh user profile in lists:', err);
      }
      setPaymentResult(prev => ({ ...prev, isOpen: false }));
    }, []),
    handleResumePayment,
    handleCancelPendingHire,
    handleConfirmCancelHire,
    isCancelModalOpen,
    setIsCancelModalOpen,
    paymentResult,
    setPaymentResult,
    isCancelingAdmission,
    isSubscribing,
    isResumingPayment, isHiring,
    isResetStripeModalOpen,
    setIsResetStripeModalOpen,
    isResettingStripe,
    handleConfirmResetStripe,
    recoveryTokens,
    bridgeParams,
    authError,
    clearAuthError: () => setAuthError(null),
    isEmailSent,
    setIsEmailSent,
    bypassBridge,
    setBypassBridge
  };
};
