
import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { Icons } from '../components/Icons';
import { LogoutModal } from '../components/LogoutModal';
import { TermsModal } from '../components/TermsModal';
import { PrivacyModal } from '../components/PrivacyModal';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import { validatePassword } from '../utils/passwordValidation';
import { api } from '../services/api';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

interface Props {
  user: Profile;
  setView: (v: string) => void;
  onLogout: () => void;
  onBack: () => void;
}

export const SettingsView: React.FC<Props> = ({ user, setView, onLogout, onBack }) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<'IDLE' | 'DELETING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [activeJourneysCount, setActiveJourneysCount] = useState<number | null>(null);
  const [appInfo, setAppInfo] = useState<{ version: string; build: string }>({ version: '1.0.2', build: '1' });


  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Form State (Inside Modal)
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Visibility States
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Status State
  const [status, setStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');

  // Editable Profile States
  const [dob, setDob] = useState(user.dob || '');
  const [gender, setGender] = useState(user.gender || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Lock body scroll when modals are open
  useEffect(() => {
    if (showResetModal || showLogoutModal || showTermsModal || showPrivacyModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showResetModal, showLogoutModal, showTermsModal, showPrivacyModal]);

  // Fetch active journeys count on mount to check if deletion is allowed
  useEffect(() => {
    const fetchActiveJourneys = async () => {
      try {
        const requests = await api.getServiceRequests(user.id);
        const active = requests.filter(r => r.status !== 'COMPLETED' && r.status !== 'REJECTED');
        setActiveJourneysCount(active.length);
      } catch (err) {
        console.error('Failed to fetch journeys for deletion check:', err);
        setActiveJourneysCount(0); // Fallback to 0 to not block user if API fails
      }
    };
    fetchActiveJourneys();

    const fetchAppInfo = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const info = await App.getInfo();
          setAppInfo({ version: info.version, build: info.build });
        }
      } catch (err) {
        console.error('Failed to fetch app info:', err);
      }
    };
    fetchAppInfo();
  }, [user.id]);

  // Validation Logic
  const isFormValid = oldPassword.length > 0 &&
    validatePassword(newPassword).isValid &&
    newPassword === confirmPassword;

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'SAVING' || !isFormValid) return;

    setStatus('SAVING');
    setErrorMessage('');

    try {
      await api.updatePassword(newPassword);

      setStatus('SUCCESS');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowOldPass(false);
      setShowNewPass(false);
      setShowConfirmPass(false);

      // Close modal and reset status after success
      setTimeout(() => {
        setShowResetModal(false);
        setStatus('IDLE');
      }, 2000);
    } catch (err: any) {
      console.error('Password update failed:', err);
      setStatus('ERROR');
      setErrorMessage(err.message || 'Failed to update password');
    }
  };
  
  const handleDeleteAccount = async () => {
    if (deletionStatus === 'DELETING') return;
    setDeletionStatus('DELETING');
    setErrorMessage('');

    try {
      const response = await api.deleteAccount();
      if (response.success) {
        setDeletionStatus('SUCCESS');
        
        // Short pause to show success state before redirecting
        setTimeout(() => {
          setShowDeleteModal(false);
          onLogout();
        }, 2000);
      } else {
        throw new Error(response.message || 'Deletion failed');
      }
    } catch (err: any) {
      console.error('Account deletion failed:', err);
      setErrorMessage(err.message || 'Failed to delete account. Please contact support.');
      setDeletionStatus('ERROR');
      // DO NOT close modal on error, let the user see why it failed
    }
  };

  const handleSaveProfileDetails = async () => {
    setSavingProfile(true);
    setProfileSuccess(false);
    try {
      await api.updateProfile(user.id, {
        dob: dob || null,
        gender: gender || null,
        isDobPrivate: true,
        isGenderPrivate: true
      });
      // Update parent state / local state if needed (since user is passed from props, the parent will usually trigger updates)
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to update settings profile:", err);
      alert("Failed to save personal details.");
    } finally {
      setSavingProfile(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="pb-24 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-slate-500 hover:text-brand-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <i className="fas fa-arrow-left text-lg"></i>
        </button>
        <h2 className="text-2xl font-bold">Settings</h2>
      </div>

      {/* Personal Information Section */}
      <section className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-slate-700 animate-fade-in-up">
        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
          <i className="fas fa-id-card text-brand-600"></i> Personal Information
        </h3>
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Verified Email</label>
            <div className="relative group">
              <input
                type="text"
                value={user.email || 'N/A'}
                readOnly
                disabled
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm text-slate-500 cursor-not-allowed"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                <Icons.Lock />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white cursor-default"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium flex items-center gap-1.5"><i className="fas fa-lock text-slate-400"></i> Date of Birth is always private and never shared.</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
              <div className="relative">
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full px-4 pr-10 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white appearance-none"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
                <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-350 pointer-events-none text-xs"></i>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium flex items-center gap-1.5"><i className="fas fa-lock text-slate-400"></i> Gender is always private and never shared.</p>
          </div>

          {profileSuccess && (
            <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-2xl flex items-center gap-3 text-green-600 dark:text-green-400 animate-fade-in-up">
              <i className="fas fa-check-circle"></i>
              <p className="text-xs font-bold font-black uppercase tracking-widest">Personal details saved successfully!</p>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleSaveProfileDetails}
              disabled={savingProfile}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-xl shadow-brand-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  <span>Save Personal Details</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Security Section with Trigger for Popup */}
      <section className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
          <Icons.Lock /> Security
        </h3>
        <p className="text-sm text-slate-500 mb-6">Manage your account security and authentication settings.</p>

        {user.authProvider === 'google' ? (
          <div className="p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-brand-600 shadow-sm">
              <i className="fab fa-google"></i>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">Authenticated via Google</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Password management is handled by Google SSO</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowResetModal(true)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl hover:border-brand-300 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-brand-600 shadow-sm">
                <Icons.Key />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold">Change Password</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Update your login credentials</p>
              </div>
            </div>
            <i className="fas fa-chevron-right text-slate-300 group-hover:text-brand-600 transition-colors"></i>
          </button>
        )}
      </section>

      {/* Legal Section */}
      <section className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-slate-700 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
          <i className="fas fa-shield-halved text-brand-600"></i> Legal & Policies
        </h3>
        <button
          onClick={() => setShowTermsModal(true)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl hover:border-brand-300 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-brand-600 shadow-sm">
              <i className="fas fa-file-contract"></i>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">Terms & Conditions</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Review our service agreement</p>
            </div>
          </div>
          <i className="fas fa-chevron-right text-slate-300 group-hover:text-brand-600 transition-colors"></i>
        </button>

        <button
          onClick={() => setShowPrivacyModal(true)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl hover:border-brand-300 transition-all group mt-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-brand-600 shadow-sm">
              <i className="fas fa-user-shield"></i>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">Privacy Policy</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">How we protect your data</p>
            </div>
          </div>
          <i className="fas fa-chevron-right text-slate-300 group-hover:text-brand-600 transition-colors"></i>
        </button>
      </section>

      {/* Reset Password Modal (Popup) */}
      {showResetModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowResetModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl max-w-md w-full animate-fade-in-up scrollbar-hide relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition"
            >
              <i className="fas fa-times text-xl"></i>
            </button>

            <h3 className="font-bold text-2xl mb-2 flex items-center gap-3">
              <Icons.Key /> Change Password
            </h3>
            <p className="text-sm text-slate-500 mb-8">Use 13+ characters with uppercase, lowercase, digit & symbol.</p>

            <form onSubmit={handleSavePassword} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Old Password</label>
                <div className="relative">
                  <input
                    type={showOldPass ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors"
                  >
                    <i className={`fas ${showOldPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all pr-12"
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
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 px-1">
                      {validatePassword(newPassword).requirements.map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full flex items-center justify-center text-[6px] transition-colors ${req.met ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                            {req.met && <i className="fas fa-check"></i>}
                          </div>
                          <span className={`text-[8px] font-bold uppercase tracking-wider transition-colors ${req.met ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-900 border rounded-2xl text-sm outline-none transition-all pr-12 ${confirmPassword && newPassword !== confirmPassword
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
                    <p className="text-[9px] text-red-500 font-bold uppercase tracking-wider mt-1 ml-1">Passwords do not match</p>
                  )}
                </div>
              </div>

              {status === 'ERROR' && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-fade-in-up">
                  <i className="fas fa-exclamation-circle"></i>
                  <p className="text-xs font-bold">{errorMessage}</p>
                </div>
              )}

              {status === 'SUCCESS' && (
                <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-2xl flex items-center gap-3 text-green-600 dark:text-green-400 animate-fade-in-up">
                  <i className="fas fa-check-circle"></i>
                  <p className="text-xs font-bold">Password updated successfully!</p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status === 'SAVING' || !isFormValid}
                  className={`w-full py-4 font-bold rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isFormValid
                    ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20 cursor-pointer'
                    : 'bg-gray-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                >
                  {status === 'SAVING' ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      <span>Save Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Support / Help */}
      <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700" style={{ animationDelay: '0.2s' }}>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <i className="fas fa-headset"></i> Support
        </h3>
        <a
          href="mailto:contact@migonest.com"
          className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-slate-900 rounded-xl transition flex justify-between items-center text-sm font-medium"
        >
          Contact Help Center <i className="fas fa-external-link-alt text-[10px] text-slate-400"></i>
        </a>
      </section>

      {/* Danger Zone */}
      <section className="bg-red-50/30 dark:bg-red-900/5 rounded-3xl p-6 border border-red-100/50 dark:border-red-900/20" style={{ animationDelay: '0.25s' }}>
        <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-red-600 dark:text-red-500">
           <i className="fas fa-biohazard"></i> Danger Zone
        </h3>
        <p className="text-xs text-slate-500 mb-6">Once you delete your account, there is no going back. Please be certain.</p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full text-left p-4 bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/30 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all flex justify-between items-center text-sm font-bold text-red-600 shadow-sm"
        >
          Delete Account Permanently <i className="fas fa-trash-alt text-[10px]"></i>
        </button>
      </section>

      {/* Logout */}
      <div className="pt-4" style={{ animationDelay: '0.3s' }}>
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full py-4 text-red-500 font-bold text-sm bg-red-50/50 dark:bg-red-900/10 rounded-2xl hover:bg-red-50 transition border border-transparent hover:border-red-100"
        >
          Log Out Account
        </button>
      </div>

      <div className="pt-12 pb-8 text-center space-y-1 opacity-50">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">© {currentYear} MigoSky LLC</p>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Migonest is a product of MigoSky LLC.</p>
        <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest">30 N GOULD ST STE 5342, SHERIDAN WY 82801, USA</p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="text-[8px] font-bold text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-widest">Version {appInfo.version}</span>
          <span className="text-[8px] font-bold text-slate-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-widest">Build {appInfo.build}</span>
        </div>
      </div>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={onLogout}
      />

      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (deletionStatus !== 'DELETING' && deletionStatus !== 'SUCCESS') {
            setShowDeleteModal(false);
            setDeletionStatus('IDLE');
          }
        }}
        onConfirm={handleDeleteAccount}
        deletionStatus={deletionStatus}
        errorMessage={errorMessage}
        walletBalance={user.walletBalance}
        activeJourneysCount={activeJourneysCount ?? 0}
        isSubscribed={!!user.isSubscribed}
      />
    </div>
  );
};
