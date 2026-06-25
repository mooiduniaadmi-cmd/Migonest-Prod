
import React, { useEffect, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deletionStatus: 'IDLE' | 'DELETING' | 'SUCCESS' | 'ERROR';
  errorMessage?: string;
  walletBalance: number;
  activeJourneysCount: number;
  isSubscribed: boolean;
}

export const DeleteAccountModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, deletionStatus, errorMessage, walletBalance, activeJourneysCount, isSubscribed }) => {
  const [confirmationText, setConfirmationText] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setConfirmationText('');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = confirmationText.toLowerCase() === 'delete';
  const isBlocked = walletBalance > 0 || activeJourneysCount > 0;
  const isDeleting = deletionStatus === 'DELETING';
  const isSuccess = deletionStatus === 'SUCCESS';
  const isError = deletionStatus === 'ERROR';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-md w-full p-8 md:p-10 text-center shadow-2xl animate-fade-in-up scrollbar-hide relative min-h-[400px] flex flex-col justify-center">
        {isSuccess ? (
          <div className="animate-fade-in-up space-y-6">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-xl shadow-green-500/10">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Account Deleted</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Everything has been removed. Redirecting you to the landing page...</p>
            </div>
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        ) : (
          <>
            <div className={`w-20 h-20 ${isError ? 'bg-red-100 text-red-600' : 'bg-red-50 dark:bg-red-900/10 text-red-400'} rounded-full flex items-center justify-center text-3xl mx-auto mb-6`}>
              <i className={isError ? 'fas fa-exclamation-circle' : 'fas fa-exclamation-triangle'}></i>
            </div>
            
            <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">
              {isError ? 'Deletion Failed' : 'Delete Account?'}
            </h3>
            
            <div className="space-y-4 mb-8">
              {isError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl text-left">
                  <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Error Message</p>
                  <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed font-medium">{errorMessage}</p>
                </div>
              )}

              {isBlocked ? (
            <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-[2rem] text-left space-y-4">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                <i className="fas fa-hand-paper"></i> Deletion Blocked
              </p>
              <div className="space-y-3">
                {activeJourneysCount > 0 && (
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px] text-amber-800 dark:text-amber-200 shrink-0 mt-0.5">
                      <i className="fas fa-route"></i>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                      You have <strong>{activeJourneysCount} active admission journey(s)</strong>. You must first cancel your journey or contact support to settle the escrow.
                    </p>
                  </div>
                )}
                {walletBalance > 0 && (
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px] text-amber-800 dark:text-amber-200 shrink-0 mt-0.5">
                      <i className="fas fa-wallet"></i>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                      You have <strong>${walletBalance.toFixed(2)}</strong> remaining in your wallet. Please withdraw your funds first.
                    </p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium italic">
                Need help? Contact us at <a href="mailto:contact@migonest.com" className="underline font-bold">contact@migonest.com</a>
              </p>
            </div>
          ) : (
            <>
              {isSubscribed && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-[1.5rem] text-left flex gap-3 mb-4">
                  <div className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-[10px] text-amber-800 dark:text-amber-200 shrink-0 mt-0.5">
                    <i className="fas fa-gem"></i>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    You have an <strong>active Premium Subscription</strong>. Deleting your account will not automatically cancel it. Please ensure you have canceled your subscription in your Apple ID or Play Store settings to avoid future charges.
                  </p>
                </div>
              )}
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                This action is <span className="text-red-600 font-bold uppercase underline">permanent</span>. You will lose access to your profile, admission journeys, connected experts, and all transaction history.
              </p>
              
              <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl">
                <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest text-center">
                  Type "DELETE" below to confirm
                </p>
                <input 
                  type="text" 
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type here..."
                  autoFocus
                  className="w-full mt-3 px-4 py-3 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/30 rounded-xl text-center text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all uppercase"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-4 rounded-2xl font-bold bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 transition hover:bg-gray-200 active:scale-95 disabled:opacity-50"
          >
            {isError ? 'Try Again' : 'Cancel'}
          </button>
          {!isBlocked && (
            <button 
              onClick={onConfirm}
              disabled={(!isConfirmed && !isError) || isDeleting}
              className={`flex-1 py-4 rounded-2xl font-bold text-white transition shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                (isConfirmed || isError) && !isDeleting
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20 cursor-pointer'
                : 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              {isDeleting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Deleting...</span>
                </>
              ) : isError ? (
                <>
                  <i className="fas fa-redo"></i>
                  <span>Retry Deletion</span>
                </>
              ) : (
                <>
                  <i className="fas fa-trash-alt"></i>
                  <span>Delete Forever</span>
                </>
              )}
            </button>
          )}
        </div>
      </>
    )}
      </div>
    </div>
  );
};
