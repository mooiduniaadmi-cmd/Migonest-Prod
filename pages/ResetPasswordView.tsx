import React, { useState } from 'react';
import { api, supabase } from '../services/api';
import { Icons } from '../components/Icons';
import { validatePassword } from '../utils/passwordValidation';
import { Capacitor } from '@capacitor/core';

interface Props {
    onSuccess: () => void;
    onCancel: () => void;
    authError?: string;
    isLoading?: boolean;
    recoveryTokens?: { access_token: string, refresh_token: string } | null;
    setAuthError?: (error: string | null) => void;
    clearAuthError?: () => void;
}

export const ResetPasswordView: React.FC<Props> = ({ onSuccess, onCancel, authError, isLoading, recoveryTokens, setAuthError, clearAuthError }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [status, setStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [errorMessage, setErrorMessage] = useState('');
    const [hasActiveSession, setHasActiveSession] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    const isNative = Capacitor.isNativePlatform();
    const isMobileBrowser = !isNative && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // HYBRID BRIDGE: Skip bridge if a valid session already exists on web
    const isBridgeMode = isMobileBrowser && status !== 'SUCCESS' && !hasActiveSession;

    // SESSION HARDENING: Extract tokens from URL on mount
    React.useEffect(() => {
        const initSession = async () => {
            setIsCheckingSession(true);
            try {
                // 1. Check current session
                const { data: { session: existingSession } } = await supabase.auth.getSession();
                if (existingSession) {
                    console.log('[Reset] Active session already exists.');
                    setHasActiveSession(true);
                    setIsCheckingSession(false);
                    return;
                }

                // 2. Try to extract tokens from URL (Standard Supabase Recovery Pattern)
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash || window.location.search);
                const access_token = params.get('access_token');
                const refresh_token = params.get('refresh_token');

                if (access_token) {
                    console.log('[Reset] Found recovery tokens in URL, setting session...');
                    const { data: restored, error } = await supabase.auth.setSession({
                        access_token,
                        refresh_token: refresh_token || ''
                    });
                    
                    if (!error && restored.session) {
                        setHasActiveSession(true);
                        localStorage.setItem('migonest_token', restored.session.access_token);
                    } else if (error) {
                        console.error('[Reset] Manual session setup failed:', error.message);
                    }
                }
            } catch (err) {
                console.error('[Reset] Session initialization error:', err);
            } finally {
                setIsCheckingSession(false);
            }
        };

        initSession();
    }, []);

    React.useEffect(() => {
        if (authError) {
            setStatus('ERROR');
            setErrorMessage(authError);
        }
    }, [authError]);

    // AUTO-REDIRECT: If in bridge mode, automatically trigger the app redirect after 2.5s
    // SECURITY: Only redirect if status is NOT ERROR (i.e. session init succeeded or is pending)
    React.useEffect(() => {
        if (isBridgeMode && status === 'IDLE' && !isLoading && !isCheckingSession) {
            const timer = setTimeout(() => {
                const currentUrl = window.location.href;
                const baseUrl = currentUrl.split(/[?#]/)[0];
                let queryOrHash = currentUrl.substring(baseUrl.length);
                
                if (!queryOrHash.includes('type=recovery')) {
                    const separator = queryOrHash.includes('?') || queryOrHash.includes('#') ? '&' : '?';
                    queryOrHash += `${separator}type=recovery`;
                }

                const appUrl = `migonest://reset-password${queryOrHash}`;
                console.log('[Bridge] Auto-redirecting to native app:', appUrl);
                window.location.href = appUrl;
            }, 2500);
            return () => clearTimeout(timer);
        } else if (status === 'ERROR') {
            console.log('[Bridge] Session error detected. Blocking auto-redirect.');
        }
    }, [isBridgeMode, status, isLoading, isCheckingSession]);

    const isFormValid = validatePassword(newPassword).isValid && newPassword === confirmPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status === 'SAVING' || !isFormValid) return;

        setStatus('SAVING');
        setErrorMessage('');

        try {
            // SESSION FAIL-SAFE: Double check if session exists before update
            let { data: { session } } = await supabase.auth.getSession();
            
            // DOUBLE-LOCK: If session is missing but we have recoveryTokens prop, FORCE re-auth now!
            if (!session && recoveryTokens) {
                console.log('[Reset] Native Flow: Session missing, forcing re-auth via props...');
                const { data: restored, error: healError } = await supabase.auth.setSession({ 
                    access_token: recoveryTokens.access_token,
                    refresh_token: recoveryTokens.refresh_token
                });
                if (!healError && restored.session) {
                    console.log('[Reset] Native Flow: Session successfully re-established.');
                    session = restored.session;
                } else {
                    console.error('[Reset] Native Flow: Re-auth failed:', healError?.message);
                }
            } else if (!session) {
                console.warn('[Reset] Session missing in view, attempting restoration from localStorage...');
                const storedToken = localStorage.getItem('migonest_token');
                if (storedToken) {
                    const { data: restored, error: healError } = await supabase.auth.setSession({ 
                        access_token: storedToken,
                        refresh_token: '' 
                    });
                    if (!healError && restored.session) session = restored.session;
                }
            }

            if (!session) {
               console.error('[Reset] CRITICAL: No session found even after healing attempts.');
            }

            console.log('[Reset] Attempting password update with session:', session?.user?.id);
            await api.updatePassword(newPassword);
            setStatus('SUCCESS');
            
            // If on desktop (not mobile browser and not native), auto-navigate after delay
            if (!isNative && !isMobileBrowser) {
                setTimeout(() => {
                    onSuccess();
                }, 3000);
            }
        } catch (err: any) {
            console.error('Password reset failed:', err);
            setStatus('ERROR');
            if (err.message?.includes('session missing') || err.message?.includes('expired')) {
                setErrorMessage('Authentication session expired. This usually happens if the link is old or you clicked too fast. Please try requesting a new reset link from the login page.');
            } else {
                setErrorMessage(err.message || 'Failed to reset password. The link might be expired.');
            }
        }
    };

    return (
        <div className="fixed inset-0 w-full h-full bg-gray-50 dark:bg-slate-900 overflow-y-auto overscroll-contain flex flex-col items-center justify-start md:justify-center py-4 md:py-20 px-2 sm:px-4">
            <div className="max-w-md w-full animate-fade-in-up py-8">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-gray-100 dark:border-slate-700 relative">
                    {/* Decorative background element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 blur-3xl shadow-brand-500/10"></div>

                    <div className="text-center mb-10 relative">
                        <div className="w-20 h-20 bg-brand-600 text-white rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl shadow-brand-500/20 rotate-3 hover:rotate-0 transition-transform duration-500">
                            {(isLoading || isCheckingSession) ? <i className="fas fa-circle-notch fa-spin"></i> : <Icons.Key />}
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {(isLoading || isCheckingSession) ? 'Verifying Link...' : isBridgeMode ? 'Reset on Migonest App' : 'Set New Password'}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium mt-3">
                            {(isLoading || isCheckingSession) 
                                ? 'One moment while we secure your sanctuary' 
                                : isBridgeMode 
                                    ? 'For your security, please perform your password reset inside the Migonest application.'
                                    : 'Use 13+ characters with uppercase, lowercase, digit & symbol'}
                        </p>
                    </div>

                    {(isLoading || isCheckingSession) ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-600 rounded-full animate-spin"></div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Establishing secure session...</p>
                        </div>
                    ) : status === 'SUCCESS' ? (
                        <div className="text-center space-y-8 py-4 animate-scale-in">
                            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-[2rem] flex items-center justify-center text-3xl mx-auto shadow-sm border border-green-100 dark:border-green-900/30">
                                <i className="fas fa-check"></i>
                            </div>
                            <div className="space-y-3">
                                <p className="font-black text-slate-900 dark:text-white text-2xl tracking-tight">Success! Sanctuary Secured</p>
                                <p className="text-sm text-slate-500 font-medium">Your password has been updated. You're ready to continue your journey.</p>
                            </div>

                            {/* Success Action: In App vs Web */}
                            {isNative ? (
                                <button
                                    onClick={onSuccess}
                                    className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white font-black text-sm uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-brand-500/25 transition-all active:scale-[0.97]"
                                >
                                    Continue to App <i className="fas fa-arrow-right ml-1"></i>
                                </button>
                            ) : isMobileBrowser ? (
                                <div className="pt-4 space-y-4">
                                    <button
                                        onClick={async () => {
                                            const { data: { session } } = await supabase.auth.getSession();
                                            if (session) {
                                                const appUrl = `migonest://login?access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
                                                window.location.href = appUrl;
                                            } else {
                                                window.location.href = '/';
                                            }
                                        }}
                                        className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white font-black text-sm uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-brand-500/25 transform transition-all active:scale-[0.97]"
                                    >
                                        Jump back to App & Login <i className="fas fa-external-link ml-1"></i>
                                    </button>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                        This will automatically log you into your Migonest application.
                                    </p>
                                </div>
                            ) : (
                                <div className="pt-4">
                                    <button
                                        onClick={onSuccess}
                                        className="w-full py-4 text-brand-600 font-bold uppercase tracking-widest hover:bg-brand-50 rounded-2xl transition-colors"
                                    >
                                        Go to Login Page
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : isBridgeMode ? (
                        /* Mobile Bridge UI: Forced app reset */
                        <div className="space-y-8 animate-fade-in">
                            {status === 'ERROR' ? (
                                <div className="p-10 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-[2.5rem] text-center space-y-6">
                                    <div className="w-20 h-20 bg-white dark:bg-slate-900 shadow-xl rounded-3xl flex items-center justify-center text-red-500 mx-auto border border-red-100 dark:border-red-800 animate-bounce">
                                        <i className="fas fa-link-slash text-3xl"></i>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Link Expired</h3>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                                            This link is no longer valid. For your security, recovery links can only be used once.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            window.location.href = '/?login=true';
                                        }}
                                        className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95"
                                    >
                                        <i className="fas fa-redo mr-2"></i> Request New link
                                    </button>
                                </div>
                            ) : (
                                <div className="p-6 bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/20 rounded-3xl text-center">
                                    <div className="w-14 h-14 bg-white dark:bg-slate-900 shadow-md rounded-2xl flex items-center justify-center text-brand-600 mx-auto mb-4 border border-brand-100 dark:border-brand-800">
                                        <i className="fas fa-shield-halved text-2xl"></i>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-6">
                                        Clicking below will open this secure link directly in your Migonest app.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const currentUrl = window.location.href;
                                            const baseUrl = currentUrl.split(/[?#]/)[0];
                                            let queryOrHash = currentUrl.substring(baseUrl.length);
                                            
                                            // Ensure the recovery flag is present for the app listener
                                            if (!queryOrHash.includes('type=recovery')) {
                                                const separator = queryOrHash.includes('?') || queryOrHash.includes('#') ? '&' : '?';
                                                queryOrHash += `${separator}type=recovery`;
                                            }

                                            // Explicit path 'reset-password' ensures the app routes correctly
                                            const appUrl = `migonest://reset-password${queryOrHash}`;
                                            window.location.href = appUrl;
                                        }}
                                        className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-brand-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            Reset Password on Migonest App
                                            <i className="fas fa-external-link opacity-90 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0"></i>
                                        </span>
                                    </button>
                                </div>
                            )}
                            
                            <div className="pt-2 text-center">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-600 transition-colors"
                                >
                                    Cancel and Return
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Form Mode: Only for Desktop or Native App */
                        <div className="space-y-6">
                            <form onSubmit={handleSubmit} className="space-y-6 relative">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                                        <div className="relative">
                                            <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                                            <input
                                                type={showNewPass ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="••••••••"
                                                required
                                                className="w-full pl-11 pr-12 py-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPass(!showNewPass)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors"
                                            >
                                                <i className={`fas ${showNewPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>

                                        {/* Password Requirements */}
                                        {newPassword.length > 0 && (
                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 px-1">
                                                {validatePassword(newPassword).requirements.map((req, idx) => (
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

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                                        <div className="relative">
                                            <i className="fas fa-circle-check absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                                            <input
                                                type={showConfirmPass ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                required
                                                className={`w-full pl-11 pr-12 py-4 bg-gray-50 dark:bg-slate-900 border rounded-2xl text-sm outline-none transition-all font-medium text-slate-900 dark:text-white ${confirmPassword && newPassword !== confirmPassword
                                                    ? 'border-red-300 focus:ring-red-500'
                                                    : 'border-gray-100 dark:border-slate-700 focus:ring-brand-500'
                                                    }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPass(!showConfirmPass)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors"
                                            >
                                                <i className={`fas ${showConfirmPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>
                                        {confirmPassword && newPassword !== confirmPassword && (
                                            <p className="text-[9px] text-red-500 font-bold uppercase tracking-wider mt-1 ml-1 animate-pulse">Passwords do not match</p>
                                        )}
                                    </div>
                                </div>

                                {status === 'ERROR' && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-shake">
                                            <i className="fas fa-exclamation-circle shrink-0"></i>
                                            <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
                                        </div>
                                        
                                        {errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('invalid') ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    window.location.href = '/?login=true';
                                                }}
                                                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                            >
                                                <i className="fas fa-redo"></i> Request New Reset Link
                                            </button>
                                        ) : null}
                                    </div>
                                )}

                                <div className="space-y-4 pt-2">
                                    <button
                                        type="submit"
                                        disabled={status === 'SAVING' || !isFormValid}
                                        className={`w-full py-5 font-black text-sm uppercase tracking-[0.15em] rounded-2xl shadow-xl transition-all active:scale-[0.97] flex items-center justify-center gap-3 ${isFormValid
                                            ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                                            }`}
                                    >
                                        {status === 'SAVING' ? (
                                            <><i className="fas fa-spinner fa-spin"></i> Updating sanctuary...</>
                                        ) : (
                                            <>Update Password <i className="fas fa-arrow-right"></i></>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-600 transition-colors"
                                    >
                                        Cancel and Return
                                    </button>
                                    
                                    {/* Mobile safety spacer */}
                                    <div className="h-4 sm:h-0"></div>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
                
                {/* Visual spacer for better scroll feeling */}
                <div className="h-10"></div>
            </div>

            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest my-10 shrink-0">
                Powered by Migonest Security Engine
            </p>
            
            {/* Final bottom buffer for software keyboards */}
            <div className="h-20 shrink-0"></div>
        </div>
    );
};
