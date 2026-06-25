
import React, { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-6 text-center shadow-2xl animate-fade-in-up scrollbar-hide">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
          <i className="fas fa-sign-out-alt"></i>
        </div>
        <h3 className="text-xl font-bold mb-2">Logout</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Are you sure you want to log out? You'll need to sign back in to access your dashboard.
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 transition hover:bg-gray-200"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white transition hover:bg-red-600 shadow-lg shadow-red-500/20"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
