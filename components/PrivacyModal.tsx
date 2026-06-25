import React from 'react';
import { Icons } from './Icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center text-brand-600">
              <i className="fas fa-user-shield text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Privacy Policy</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last updated: March 2026</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-slate-400"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <div className="space-y-8 text-left text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">1. Overview</h3>
              <p>MigoSky LLC ("we," "our," or "us") operates Migonest. We respect your privacy and are committed to protecting your personal data. This policy explains how we handle your information when you use our platform.</p>
              <p className="mt-2">Business Entity: MigoSky LLC</p>
              <p>Address: 30 N GOULD ST STE 5342, SHERIDAN WY 82801, USA</p>
            </section>

            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">2. Information We Collect</h3>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Profile Data:</strong> Name, email, university, country, and professional experience.</li>
                <li><strong>Payment Data:</strong> Handled securely by Stripe. We do not store your full card details.</li>
                <li><strong>Communication:</strong> Chat history between students and experts to ensure service quality.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">3. How We Use Data</h3>
              <p>We use your data to facilitate matches, process transactions through Stripe, and provide a secure environment for study abroad counseling.</p>
            </section>

            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">4. Data Sharing & Security</h3>
              <p>We do not sell your personal data. We share information with service providers like Supabase (database) and Stripe (payments) only to the extent necessary for platform operation.</p>
            </section>

            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">5. Your Rights</h3>
              <p>You have the right to access, correct, or delete your personal information. Contact us at team@migonest.com for any privacy-related requests.</p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-xl shadow-brand-500/20 transition-all active:scale-[0.98]"
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
};
