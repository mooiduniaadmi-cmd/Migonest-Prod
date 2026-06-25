import React from 'react';
import { openExternalUrl } from '../utils/openExternalUrl';

interface SupportViewProps {
  onBack?: () => void;
  isIOSNative?: boolean;
}

export const SupportView: React.FC<SupportViewProps> = ({ onBack, isIOSNative }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-fade-in-up">
      <div className="w-24 h-24 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center text-4xl mb-8 shadow-inner border border-brand-100 dark:border-brand-800">
        <i className="fas fa-headset"></i>
      </div>
      
      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">How can we help?</h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-lg mb-8 leading-relaxed font-medium">
        Whether you have questions about your admission journey, need technical assistance, or want to report an issue, our support team is here for you.
      </p>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-md relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-50 dark:bg-brand-900/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col items-center">
          <i className="fas fa-envelope-open-text text-3xl text-brand-500 mb-4"></i>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Email Support</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center">
            Send us an email and we'll get back to you within 24 hours.
          </p>
          <a 
            href="mailto:contact@migonest.com"
            className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
          >
            <i className="fas fa-paper-plane"></i> Contact Support
          </a>
          <p className="mt-4 text-xs font-bold text-slate-400 tracking-widest uppercase">contact@migonest.com</p>
        </div>
      </div>

      {onBack && (
        <button 
          onClick={onBack}
          className="mt-8 text-sm font-bold text-slate-500 hover:text-brand-600 transition flex items-center gap-2"
        >
          <i className="fas fa-arrow-left"></i> Return
        </button>
      )}
    </div>
  );
};
