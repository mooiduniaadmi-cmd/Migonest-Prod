
import React, { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const ResetStripeModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, isLoading }) => {
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
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl animate-scale-up border border-gray-100 dark:border-slate-700">
        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/10 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm border border-amber-100 dark:border-amber-900/20">
          <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-redo-alt'}`}></i>
        </div>
        
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
          {isLoading ? 'Resetting...' : 'Reset Stripe Setup?'}
        </h3>
        
        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-4 mb-6">
          <p className="text-amber-700 dark:text-amber-400 text-sm font-semibold leading-relaxed">
            {isLoading 
              ? 'Please wait while we reset your connection...' 
              : 'Are you sure you want to reset your Stripe setup?'}
          </p>
          {!isLoading && (
            <p className="text-amber-600/80 dark:text-amber-400/80 text-xs mt-2 font-medium">
              This will clear your current progress and let you start fresh. You will need to re-link your bank account to receive payouts.
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : null}
            {isLoading ? 'Resetting...' : 'Yes, Start Fresh'}
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
