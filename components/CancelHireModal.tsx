
import React, { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const CancelHireModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, isLoading }) => {
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
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm border border-red-100 dark:border-red-900/20">
          <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-exclamation-triangle'}`}></i>
        </div>
        
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
          {isLoading ? 'Cancelling...' : 'Cancel Admission Journey?'}
        </h3>
        
        <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 mb-6">
          <p className="text-red-600 dark:text-red-400 text-sm font-semibold leading-relaxed">
            {isLoading 
              ? 'Please wait while we cancel this journey...' 
              : 'Are you sure you want to cancel this admission journey?'}
          </p>
          {!isLoading && (
            <p className="text-red-500/80 dark:text-red-400/80 text-xs mt-2 font-medium">
              This will permanently remove this pending request. You will need to start a new hire process from scratch if you change your mind.
            </p>
          )}
        </div>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : null}
            {isLoading ? 'Cancelling...' : 'Yes, Cancel It'}
          </button>
          
          <button 
            onClick={onClose}
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-gray-50 dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all active:scale-95 border border-gray-100 dark:border-slate-700 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            No, Keep It
          </button>
        </div>
      </div>
    </div>
  );
};
