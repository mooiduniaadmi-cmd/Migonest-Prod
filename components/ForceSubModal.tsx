
import React, { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const ForceSubModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, isLoading }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-sm w-full p-8 text-center shadow-2xl animate-scale-up border border-gray-100 dark:border-slate-700 relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/10 text-brand-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm border border-brand-100 dark:border-brand-900/20">
          <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
        </div>
        
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
          Troubleshooting?
        </h3>
        
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 mb-8">
          <p className="text-slate-600 dark:text-slate-400 text-sm font-semibold leading-relaxed">
            You are currently marked as a Premium member in our database.
          </p>
          <p className="text-slate-500 dark:text-slate-500 text-xs mt-3 font-medium">
            If your features haven't unlocked yet, we can force a fresh Stripe session to re-sync your account status.
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-brand-600 hover:bg-brand-700 text-white transition-all shadow-lg shadow-brand-500/20 active:scale-95 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : null}
            {isLoading ? 'Re-Syncing...' : 'Re-Sync with Stripe'}
          </button>
          
          <button 
            onClick={onClose}
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gray-50 dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all active:scale-95 border border-gray-100 dark:border-slate-700 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
