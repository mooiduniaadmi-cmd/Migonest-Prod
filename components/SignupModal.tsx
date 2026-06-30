import React, { useState, useEffect } from 'react';
import { trackEvent } from '../services/analytics';
import { TermsModal } from './TermsModal';
import { PrivacyModal } from './PrivacyModal';
import { api, supabase } from '../services/api';
import { validatePassword } from '../utils/passwordValidation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { fullName: string; email: string }) => void;
  onSwitchToLogin?: () => void;
  externalError?: string | null;
  currentUser?: any;
  isEmailSent: boolean;
  setIsEmailSent: (val: boolean) => void;
}

export const SignupModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, onSwitchToLogin, externalError, currentUser, isEmailSent, setIsEmailSent }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  useEffect(() => {
    if (externalError && isOpen) {
      setError(externalError);
    }
  }, [externalError, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setIsEmailSent(false);
      setResendMsg('');
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (currentUser && isOpen) {
        console.log('[Signup] User authenticated while modal open. Triggering self-dismissal.');
        onClose();
    }
  }, [currentUser, isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (!validatePassword(password).isValid) {
      setError('Password does not meet all requirements.');
      return;
    }
    if (!agreedToTerms) {
      setError('You must agree to the Terms & Conditions.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Pre-signup check for duplicate email
      const emailExists = await api.checkEmailExists(email);
      if (emailExists) {
        setError('This email is already registered. Please log in instead.');
        setLoading(false);
        return;
      }

      await api.signUp(email, password, {
        full_name: fullName
      });
      trackEvent('SIGNUP_COMPLETE');
      setIsEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendMsg('');
    try {
      await api.resendVerificationEmail(email);
      setResendMsg('Email resent successfully!');
    } catch (err: any) {
      console.error('Resend error:', err);
      // Supabase error messages are usually descriptive (e.g. "Email rate limit exceeded")
      // If it's a rate limit, the message often contains "rate limit" or "seconds"
      if (err?.message?.toLowerCase().includes('limit') || err?.status === 429) {
        setResendMsg('Too many requests. Please wait 60 seconds.');
      } else {
        setResendMsg(err?.message || 'Failed to resend. Please try again.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-md w-full p-10 shadow-2xl animate-fade-in-up text-center space-y-6">
          <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-2">
            <i className="fas fa-envelope-open-text animate-bounce"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Verify your Email</h2>
          <p className="text-slate-500 font-medium">
            A confirmation link was sent to <span className="text-brand-600 font-bold">{email}</span>. Please click the link to activate your account and start your onboarding.
          </p>
          <div className="space-y-3">
            <button
              onClick={onClose}
              className="w-full py-4 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl transition active:scale-95"
            >
              Got it, thanks!
            </button>
            <div className="pt-2">
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="text-brand-600 font-bold text-xs hover:underline disabled:opacity-50"
              >
                {resendLoading ? 'Resending...' : "Didn't receive it? Resend Email"}
              </button>
              {resendMsg && (
                <p className={`text-[10px] font-bold mt-2 ${resendMsg.includes('Failed') || resendMsg.includes('Too many requests') || resendMsg.includes('60 seconds') ? 'text-red-500' : 'text-green-500'}`}>
                  {resendMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[1000] overflow-y-auto bg-black/60 backdrop-blur-md transition-all duration-300 flex justify-center items-start pt-4 sm:pt-10 pb-10 px-2 sm:px-4">
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-md w-full p-8 md:p-10 relative shadow-2xl animate-fade-in-up my-auto flex flex-col h-auto">
          <button
            onClick={onClose}
            className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition z-10"
          >
            <i className="fas fa-times text-xl"></i>
          </button>

          <div className="mb-10 text-center">
            <img
              src="/assets/Migonest_ Logo_Icon.png?v=5"
              alt="Migonest Logo"
              onClick={onClose}
              className="h-16 w-auto object-contain mx-auto mb-6 cursor-pointer hover:scale-105 transition-transform dark:bg-slate-100 dark:rounded-2xl dark:p-2 sm:hidden"
            />
            <img
              src="/assets/Migonest-Primary-Logo.png"
              alt="Migonest Logo"
              onClick={onClose}
              className="h-16 w-auto object-contain mx-auto mb-6 cursor-pointer hover:scale-105 transition-transform hidden sm:block"
            />
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Create Account</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Google SSO Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-2xl shadow-sm transition flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-150 dark:border-slate-700"></div>
              <span className="flex-shrink mx-4 text-slate-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">Or signup with email</span>
              <div className="flex-grow border-t border-gray-150 dark:border-slate-700"></div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative">
                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 dark:hover:text-slate-100 transition-colors focus:outline-none"
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>

              {/* Password Requirements */}
              {password.length > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 px-1">
                  {validatePassword(password).requirements.map((req, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] transition-colors ${req.met ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                        {req.met && <i className="fas fa-check"></i>}
                      </div>
                      <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${req.met ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 px-1">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 border-2 border-gray-200 dark:border-slate-700 rounded-md peer-checked:bg-brand-600 peer-checked:border-brand-600 transition-all flex items-center justify-center text-white text-[10px]">
                    {agreedToTerms && <i className="fas fa-check"></i>}
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight">
                  I agree to the <button type="button" onClick={() => setShowTerms(true)} className="text-brand-600 font-black hover:underline">Terms & Conditions</button> and <button type="button" onClick={() => setShowPrivacy(true)} className="text-brand-600 font-black hover:underline">Privacy Policy</button> of Migonest, a product of MigoSky LLC.
                </span>
              </label>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !agreedToTerms || !fullName || !email || !password || !validatePassword(password).isValid}
              className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white font-black text-sm uppercase tracking-[0.1em] rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><i className="fas fa-circle-notch fa-spin"></i> Creating...</>
              ) : (
                <>Sign Up <i className="fas fa-arrow-right"></i></>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Already have an account? {' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-brand-600 hover:underline"
                >
                  Log In
                </button>
              </p>
            </div>
          </form>

          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-12">
            Secured by Migonest Cloud Auth
          </p>
        </div>
      </div>
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </>
  );
};