
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { api, supabase } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSwitchToSignup?: () => void;
  externalError?: string | null;
}

export const LoginModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, onSwitchToSignup, externalError }) => {
  const [isForgotView, setIsForgotView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (externalError && isOpen) {
      setError(externalError);
    }
  }, [externalError, isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else {
      document.body.style.overflow = 'unset';
      setIsForgotView(false);
      setError('');
      setSuccessMsg('');
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

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
    setLoading(true);
    setError('');

    try {
      await api.signIn(email, password);
      onSuccess();
    } catch (err: any) {
      const errorMsg = err.message || '';
      if (err.status === 429 || errorMsg.toLowerCase().includes('rate limit') || errorMsg.toLowerCase().includes('locked out')) {
        setError('Your account has been temporarily locked for 24 hours due to too many (10) failed login attempts. Please try again tomorrow.');
      } else {
        setError(errorMsg || 'Invalid credentials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const provider = await api.getProfileProvider(email);
      if (provider === 'google') {
        setError('This email is associated with a Google SSO account. Please sign in with Google directly.');
        setLoading(false);
        return;
      }
      await api.resetPasswordForEmail(email);
      setSuccessMsg('A password reset link has been sent to your email address.');
    } catch (err: any) {
      console.error('Reset password error:', err);
      // For security, don't reveal if email exists, unless it's a rate limit error
      if (err.status === 429) {
        setError('Too many requests. Please wait 60 seconds.');
      } else {
        // Generic success message even on failure to prevent email enumeration, 
        // OR generic error if you prefer debugging ease.
        // Given "User don't get link", we'll show success but log error.
        // Actually, let's show success to user regardless for security, but console log the error.
        // Wait, if it fails due to config, user needs to know.
        // Let's show the error for now as we are in dev/fixing mode.
        setError(err.message || 'Failed to send reset link.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto bg-black/60 backdrop-blur-md transition-all duration-300 flex justify-center items-start pt-4 sm:pt-10 pb-10 px-2 sm:px-4">
      <div 
        className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-md w-full p-8 md:p-10 relative shadow-2xl animate-fade-in-up my-auto flex flex-col h-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition z-10"
        >
          <i className="fas fa-times text-xl"></i>
        </button>

        {!isForgotView ? (
          <>
            <div className="mb-6 md:mb-10 text-center">
              <img
                src="/assets/Migonest_ Logo_Icon.png?v=5"
                alt="Migonest Logo"
                onClick={onClose}
                className="h-14 md:h-16 w-auto object-contain mx-auto mb-4 md:mb-6 cursor-pointer hover:scale-105 transition-transform dark:bg-slate-100 dark:rounded-2xl dark:p-2 sm:hidden"
              />
              <img
                src="/assets/Migonest-Primary-Logo.png"
                alt="Migonest Logo"
                onClick={onClose}
                className="h-14 md:h-16 w-auto object-contain mx-auto mb-4 md:mb-6 cursor-pointer hover:scale-105 transition-transform hidden sm:block"
              />
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">Welcome Back</h2>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-2">Sign in to your Migonest sanctuary</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-150 dark:border-slate-700"></div>
                <span className="flex-shrink mx-4 text-slate-450 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">Or login with email</span>
                <div className="flex-grow border-t border-gray-150 dark:border-slate-700"></div>
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
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                </div>
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
                <div className="flex justify-end px-1">
                  <button
                    type="button"
                    onClick={() => { setIsForgotView(true); setError(''); }}
                    className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline mt-1"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white font-black text-sm uppercase tracking-[0.1em] rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition flex items-center justify-center gap-3"
              >
                {loading ? (
                  <><i className="fas fa-circle-notch fa-spin"></i> Signing in...</>
                ) : (
                  <>Sign In <i className="fas fa-arrow-right"></i></>
                )}
              </button>

              <div className="text-center pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Don't have an account? {' '}
                  <button
                    type="button"
                    onClick={onSwitchToSignup}
                    className="text-brand-600 hover:underline"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
              <div className="h-32 md:h-0" />
            </form>
          </>
        ) : (
          <>
            <div className="mb-10 text-center">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6 shadow-sm">
                <i className="fas fa-key"></i>
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">Reset Password</h2>
              <p className="text-sm text-slate-500 font-medium mt-2">Enter your email to receive a recovery link</p>
            </div>

            {successMsg ? (
              <div className="space-y-8 text-center animate-fade-in-up">
                <div className="p-6 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-bold rounded-2xl border border-green-100 dark:border-green-900/30">
                  {successMsg}
                </div>
                <button
                  onClick={() => { setIsForgotView(false); setSuccessMsg(''); }}
                  className="text-brand-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-6">
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

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                    <i className="fas fa-exclamation-circle"></i>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white font-black text-sm uppercase tracking-[0.1em] rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <><i className="fas fa-circle-notch fa-spin"></i> Sending...</>
                  ) : (
                    <>Send Reset Link <i className="fas fa-paper-plane"></i></>
                  )}
                </button>

                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={() => setIsForgotView(false)}
                    className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-brand-600 transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
                <div className="h-32 md:h-0" />
              </form>
            )}
          </>
        )}

        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-12">
          Secured by Migonest Cloud Auth
        </p>
      </div>
    </div>
  );
};
