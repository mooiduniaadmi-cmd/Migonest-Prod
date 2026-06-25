import React from 'react';
import { Icons } from '../components/Icons';

export const PrivacyView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  return (
    <div className="fixed inset-0 z-[2000] bg-gray-50 dark:bg-slate-900 flex flex-col items-center py-12 md:py-20 px-4 overflow-y-auto overscroll-contain">
      <div className="max-w-3xl w-full animate-fade-in-up pb-24">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-brand-600 text-white rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl shadow-brand-500/20 rotate-3 transition-transform hover:rotate-0 duration-500">
            <i className="fas fa-user-shield"></i>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Privacy Policy</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-4">Last updated: March 2026</p>
          
          {onBack && (
            <button 
              onClick={onBack}
              className="mt-8 text-xs font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest flex items-center gap-2 mx-auto hover:gap-3 transition-all"
            >
              <i className="fas fa-arrow-left"></i> Back to Sanctuary
            </button>
          )}
        </div>

        {/* Content Card */}
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-gray-100 dark:border-slate-700 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full -mr-32 -mt-32 blur-3xl shadow-brand-500/10"></div>
          
          <div className="space-y-10 text-left text-base text-slate-600 dark:text-slate-400 leading-relaxed relative">
            <section>
              <h2 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">1. Overview</h2>
              <p>MigoSky LLC ("we," "our," or "us") operates Migonest. We respect your privacy and are committed to protecting your personal data. This policy explains how we handle your information when you use our platform.</p>
              <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700">
                <p className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1">Business Entity</p>
                <p className="text-sm font-medium">MigoSky LLC</p>
                <p className="text-sm">30 N GOULD ST STE 5342, SHERIDAN WY 82801, USA</p>
              </div>
            </section>

            <section>
              <h2 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">2. Information We Collect</h2>
              <p>To provide our services, we collect necessary personal data:</p>
              <ul className="list-disc pl-6 space-y-3 mt-4">
                <li><strong className="text-slate-900 dark:text-white">Profile Data:</strong> Name, email, university details, country, and professional experience.</li>
                <li><strong className="text-slate-900 dark:text-white">Payment Data:</strong> Handled securely by Stripe. We do not store your full card details or CVV.</li>
                <li><strong className="text-slate-900 dark:text-white">Communication:</strong> Chat history between students and experts is maintained to ensure service quality and safety.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">3. How We Use Data</h2>
              <p>We use your data strictly to facilitate university matching, process secure transactions through Stripe, and maintain a protected environment for study abroad counseling.</p>
            </section>

            <section>
              <h2 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">4. Data Sharing & Security</h2>
              <p>We do not sell your personal data. Information is shared with trusted partners like <span className="font-bold text-brand-600">Supabase</span> (database) and <span className="font-bold text-brand-600">Stripe</span> (payments) only to the extent required for the platform to function.</p>
            </section>

            <section>
              <h2 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">5. Your Rights</h2>
              <p>You maintain full control over your data. You have the right to access, correct, or request the deletion of your personal information at any time. For any privacy concerns, contact our team at <a href="mailto:team@migonest.com" className="text-brand-600 font-bold hover:underline">team@migonest.com</a>.</p>
            </section>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
              &copy; 2026 Migonest. A MigoSky LLC product. All rights reserved.
            </p>
        </div>
      </div>
    </div>
  );
};
