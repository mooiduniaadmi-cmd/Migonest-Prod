
import React from 'react';
import { Capacitor } from '@capacitor/core';
import { LandingPage } from '../pages/LandingPage';
import { LoginModal } from './LoginModal';
import { SignupModal } from './SignupModal';
import { OnboardingView } from '../pages/OnboardingView';
import { PaymentResultModal } from './PaymentResultModal';
import { PrivacyModal } from './PrivacyModal';
import { TermsModal } from './TermsModal';
import { AboutUsModal } from './AboutUsModal';
import { HelpCenterModal } from './HelpCenterModal';
import { ExpertGuidelinesModal } from './ExpertGuidelinesModal';
import { RefundGuaranteeModal } from './RefundGuaranteeModal';
import { SharedContentAuthGate } from './SharedContentAuthGate';
import { supabase } from '../services/api';

export const AuthShell: React.FC<any> = (props) => {
  const { 
    view, 
    currentUser, 
    handleOnboardingComplete, 
    isDark, 
    toggleTheme, 
    setIsLoginModalOpen, 
    setIsSignupModalOpen, 
    isLoginModalOpen, 
    handleLoginSuccess, 
    isSignupModalOpen, 
    navigateTo, 
    isLoading,
    isEmailSent,
    setIsEmailSent,
    bridgeParams,
    bypassBridge,
    setBypassBridge,
    isPrivacyOpen, setIsPrivacyOpen, isTermsOpen, setIsTermsOpen,
    isAboutUsOpen, setIsAboutUsOpen, isHelpCenterOpen, setIsHelpCenterOpen, isExpertGuidelinesOpen, setIsExpertGuidelinesOpen, isRefundGuaranteeOpen, setIsRefundGuaranteeOpen
  } = props;

  // 1. Shared Scoped Variables
  // 1. Shared Scoped Variables
  const isNative = Capacitor.isNativePlatform();
  const isMobileDevice = typeof navigator !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (window.innerWidth <= 800 && window.innerHeight <= 1000)
  );
  const isOnboardingPath = window.location.pathname.toLowerCase().includes('/onboarding');
  const hasAuthError = !!props.authError;
  const showSuccess = !hasAuthError;

  // 2. Helper to build app URL with prioritizing bridgeParams (Memory)
  const getAppUrl = React.useCallback(() => {
    let url = 'migonest://onboarding';
    if (bridgeParams) {
      const params = [];
      if (bridgeParams.access_token) params.push(`access_token=${encodeURIComponent(bridgeParams.access_token)}`);
      if (bridgeParams.refresh_token) params.push(`refresh_token=${encodeURIComponent(bridgeParams.refresh_token)}`);
      if (bridgeParams.code) params.push(`code=${encodeURIComponent(bridgeParams.code)}`);
      if (params.length > 0) {
        url += (url.includes('?') ? '&' : '?') + params.join('&');
      }
    } else {
      const extra = window.location.hash || window.location.search;
      if (extra) url += (extra.startsWith('#') || extra.startsWith('?') ? '' : '?') + extra;
    }
    return url;
  }, [bridgeParams]);

  const appUrl = getAppUrl();
  const isMobileOnboarding = !isNative && isMobileDevice && !bypassBridge && (view === 'ONBOARDING_BRIDGE' || (view === 'ONBOARDING' && !props.isAuthenticated) || isOnboardingPath || hasAuthError);

  // 3. Effects
  // AUTOMATIC REDIRECTION: Trigger the app hand-off automatically after a short delay
  React.useEffect(() => {
    if ((view === 'ONBOARDING_BRIDGE') && showSuccess && !bypassBridge) {
      console.log('[Auth] Mobile Bridge: Success state detected. Preparing transition...');
      const timer = setTimeout(() => {
        if (isNative) {
          console.log('[Auth] Native Bridge: Auto-transitioning to ONBOARDING');
          if (props.navigateTo) props.navigateTo('ONBOARDING');
        } else {
          console.log('[Auth] Web Bridge: Auto-opening native app...', appUrl);
          // Only auto-redirect on Android, Safari blocks programmatic deep links and shows an error alert
          if (/Android/i.test(navigator.userAgent)) {
             window.location.href = appUrl;
          }
        }
      }, 500); // reduced timeout to be closer to user gesture
      return () => clearTimeout(timer);
    }
  }, [view, appUrl, showSuccess, isNative, props.navigateTo, bypassBridge]);

  // ONBOARDING FAIL-SAFE
  React.useEffect(() => {
    if (view === 'ONBOARDING') {
      setIsLoginModalOpen(false);
      setIsSignupModalOpen(false);
      setIsEmailSent(false);
    }
  }, [view, setIsLoginModalOpen, setIsSignupModalOpen, setIsEmailSent]);

  const isProtectedPath = window.location.pathname.startsWith('/in/') || window.location.pathname.startsWith('/m/') || window.location.pathname.startsWith('/post/');

  // 4. Render Handlers
  const handleExitBridge = async () => {
    console.log('[AuthShell] Exiting bridge: Performing deep session purge.');
    await supabase.auth.signOut();
    localStorage.removeItem('migonest_token');
    if (props.clearAuthError) props.clearAuthError();
    window.location.href = '/';
  };

  // 5. Early Return: Core Loading
  if (isLoading) {
    return (
      <div className="min-h-full bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <img src="/assets/Migonest-Primary-Logo.png?v=5" alt="Migonest Logo" className="w-48 h-48 object-contain drop-shadow-2xl" />
            <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest text-slate-400">Waking up Migonest...</p>
          </div>
        </div>
      </div>
    );
  }

  // 6. Early Return: Mobile Verification Bridge
  if ((view === 'ONBOARDING_BRIDGE' || isMobileOnboarding) && !bypassBridge) {
    return (
      <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-6 bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070")' }}>
        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/80 backdrop-blur-3xl"></div>
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-2xl max-w-sm w-full text-center space-y-8 border border-white/20 dark:border-slate-700/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-400 via-brand-600 to-brand-500 opacity-80"></div>
          
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner ${showSuccess ? 'bg-green-50 dark:bg-green-900/30 text-green-500' : 'bg-red-50 dark:bg-red-900/30 text-red-500'}`}>
             <i className={showSuccess ? 'fas fa-circle-check' : 'fas fa-link-slash'}></i>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {showSuccess ? 'Account Verified!' : 'Link Expired'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium px-2">
              {showSuccess 
                ? 'Your email has been confirmed. Tap below to complete your setup in the Migonest App.'
                : 'This confirmation link is no longer valid. Please return to the app or try signing up again.'}
            </p>
          </div>

          <div className="pt-6 space-y-4">
            {showSuccess ? (
              <>
                {!isNative ? (
                  <div className="space-y-4">
                    <a 
                      href={appUrl}
                      className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-5 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-slate-900/20 hover:shadow-brand-500/10 flex items-center justify-center group"
                    >
                      Open Migonest App
                      <i className="fas fa-arrow-right ml-3 text-[10px] group-hover:translate-x-1 transition-transform"></i>
                    </a>
                    <button 
                      onClick={() => {
                        console.log('[Auth] Continue in browser clicked');
                        setBypassBridge(true);
                        if (props.handleContinueInBrowser) {
                          props.handleContinueInBrowser();
                        } else {
                          console.warn('[Auth] handleContinueInBrowser missing in props');
                          if (props.navigateTo) props.navigateTo('ONBOARDING');
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-600 font-bold py-4 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 flex items-center justify-center shadow-sm"
                    >
                      Or continue in browser
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => props.navigateTo && props.navigateTo('ONBOARDING')}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-5 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-slate-900/20 hover:shadow-brand-500/10 flex items-center justify-center group"
                  >
                    Continue
                    <i className="fas fa-arrow-right ml-3 text-[10px] group-hover:translate-x-1 transition-transform"></i>
                  </button>
                )}
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                  {isNative ? 'Starting setup...' : 'App not installed? Use browser link'}
                </p>
              </>
            ) : (
              <button 
                onClick={handleExitBridge}
                className="w-full bg-brand-600 text-white font-black py-5 rounded-2xl text-sm uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-brand-600/20 flex items-center justify-center"
              >
                Go to Migonest.com
                <i className="fas fa-home ml-3 text-[10px]"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 7. Early Return: Internal Views (Onboarding, Privacy, Terms)
  if ((view === 'ONBOARDING' || (isOnboardingPath && !isMobileDevice)) && (currentUser || props.isAuthenticated)) {
    // If we are authenticated but the profile is still loading, 
    // create a temporary guest profile to allow the OnboardingView to mount.
    const activeUser = currentUser || {
      id: props.isAuthenticated && !currentUser ? 'pending' : (currentUser?.id || 'new-user'),
      email: currentUser?.email || '',
      fullName: currentUser?.fullName || 'User',
      role: currentUser?.role || 'STUDENT',
      isOnboarded: false
    } as any;
    
    return (
      <OnboardingView 
        user={activeUser} 
        onSave={props.handleSaveOnboarding} 
        onComplete={handleOnboardingComplete} 
      />
    );
  }

  // 8. Handle Stripe Success Redirection
  if (window.location.pathname.toLowerCase().includes('/stripe-success')) {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const rid = params.get('rid');
    const isHire = type === 'hire';
    const redirectUrl = isHire ? `migonest://admission?success=true&rid=${rid}` : 'migonest://onboarding';

    return (
      <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6 border border-gray-100 dark:border-slate-700">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto text-3xl">
            <i className="fas fa-check-circle"></i>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{isHire ? 'Payment Success!' : 'Setup Complete!'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {isHire ? 'Payment successful. You can start your admission journey.' : 'Stripe account linked successfully.'}
            </p>
          </div>
          <div className="pt-4">
            <a href={redirectUrl} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-transform flex items-center justify-center">Return to Migonest</a>
          </div>
        </div>
      </div>
    );
  }

  // 9. Early Return: Authenticated Loading Guard (Native experience)
  // Ensure we show the "Waking up..." loader if we're in a special auth view but the user isn't loaded yet.
  const isSpecialView = view === 'ONBOARDING' || view === 'RESET_PASSWORD';
  const needsProfile = props.isAuthenticated || isSpecialView;

  // HARDENED: If we are on the mobile bridge (waiting for user choice), do NOT overlay the loader.
  // This prevents the "Waking up" pulse from blocking the "Continue in browser" button.
  if (needsProfile && !currentUser && view !== 'ONBOARDING_BRIDGE' && !isMobileOnboarding) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-900 flex items-center justify-center z-[5000]">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <img src="/assets/Migonest-Primary-Logo.png?v=5" alt="Migonest Logo" className="w-48 h-48 object-contain drop-shadow-2xl" />
            <div className="text-slate-900 dark:text-white font-black text-xl tracking-tight uppercase">Waking up Migonest...</div>
            <p className="text-slate-400 dark:text-slate-500 text-sm">
              Connecting to Migonest services...
            </p>
          </div>
          
          {/* Emergency Recovery: If stuck here, allow user to sign out and retry */}
          <button 
            onClick={() => {
              supabase.auth.signOut();
              window.location.href = '/';
            }}
            className="mt-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs underline"
          >
            Stuck? Sign out and retry
          </button>
        </div>
      </div>
    );
  }

  // 10. Default: Landing Page with Modals
  return (
    <div className="relative w-full min-h-full bg-white dark:bg-slate-900 transition-colors duration-200 overflow-x-hidden">
      {isProtectedPath ? (
        <SharedContentAuthGate
          onLogin={() => setIsLoginModalOpen(true)}
          onSignup={() => setIsSignupModalOpen(true)}
          isDark={isDark}
          toggleTheme={toggleTheme}
        />
      ) : (
        <LandingPage
          onLogin={() => setIsLoginModalOpen(true)}
          onSignup={() => setIsSignupModalOpen(true)}
          isDark={isDark}
          toggleTheme={toggleTheme}
          guestMessage={null}
          error={props.authError}
          isIOSNative={props.isIOSNative}
          onShowPrivacy={() => setIsPrivacyOpen(true)}
          onShowTerms={() => setIsTermsOpen(true)}
          onShowAboutUs={() => setIsAboutUsOpen(true)}
          onShowHelpCenter={() => setIsHelpCenterOpen(true)}
          onShowExpertGuidelines={() => setIsExpertGuidelinesOpen(true)}
          onShowRefundGuarantee={() => setIsRefundGuaranteeOpen(true)}
        />
      )}
      {view !== 'ONBOARDING' && (
        <>
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => { setIsLoginModalOpen(false); props.clearAuthError(); }}
            onSuccess={handleLoginSuccess}
            externalError={props.authError}
            onSwitchToSignup={() => { setIsLoginModalOpen(false); setIsSignupModalOpen(true); }}
          />
          <SignupModal
            isOpen={isSignupModalOpen}
            onClose={() => { setIsSignupModalOpen(false); props.clearAuthError(); }}
            onSuccess={() => navigateTo('ONBOARDING')}
            externalError={props.authError}
            currentUser={currentUser}
            isEmailSent={isEmailSent}
            setIsEmailSent={setIsEmailSent}
            onSwitchToLogin={() => { setIsSignupModalOpen(false); setIsLoginModalOpen(true); }}
          />
        </>
      )}
       <PaymentResultModal
        isOpen={props.paymentResult?.isOpen}
        onClose={() => props.setPaymentResult({ ...props.paymentResult, isOpen: false })}
        type={props.paymentResult?.type}
        title={props.paymentResult?.title}
        message={props.paymentResult?.message}
      />

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <AboutUsModal isOpen={isAboutUsOpen} onClose={() => setIsAboutUsOpen(false)} />
      <HelpCenterModal isOpen={isHelpCenterOpen} onClose={() => setIsHelpCenterOpen(false)} />
      <ExpertGuidelinesModal isOpen={isExpertGuidelinesOpen} onClose={() => setIsExpertGuidelinesOpen(false)} />
      <RefundGuaranteeModal isOpen={isRefundGuaranteeOpen} onClose={() => setIsRefundGuaranteeOpen(false)} />
    </div>
  );
};
