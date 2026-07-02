import React from 'react';

export const TermsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  return (
    <div className="fixed inset-0 z-[2000] bg-gray-50 dark:bg-slate-900 flex flex-col items-center py-12 md:py-20 px-4 overflow-y-auto overscroll-contain">
      <div className="max-w-3xl w-full animate-fade-in-up pb-24">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-brand-600 text-white rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl shadow-brand-500/20 rotate-3 transition-transform hover:rotate-0 duration-500">
            <i className="fas fa-file-contract"></i>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">Terms & Conditions</h1>
          <p className="text-sm font-bold text-brand-600 uppercase tracking-widest mt-4">Migonest is a product of MigoSky LLC.</p>
          
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
              <h2 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">1. Service & Ownership</h2>
              <p>Migonest (the "Platform") is owned and operated by MigoSky LLC, located at 30 N GOULD ST STE 5342, SHERIDAN WY 82801, USA. By using this service, you enter into a binding agreement with MigoSky LLC. The platform serves as a bridge connecting Students with verified Uni Experts.</p>
            </section>

            <section>
              <h2 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">2. Payment & Escrow Policy</h2>
              <p>All service payments ($399.00 for Full Assistance) are processed through the Platform's Stripe Connect infrastructure. The fee distribution is as follows:</p>
              <ul className="list-disc pl-6 space-y-3 mt-4">
                <li><strong className="text-slate-900 dark:text-white">20% Platform Fee:</strong> Retained by Migonest (MigoSky LLC) for operational and matching services.</li>
                <li><strong className="text-slate-900 dark:text-white">40% Initial Release:</strong> Paid to the Expert immediately upon the Student's successful transaction to initiate the roadmap.</li>
                <li><strong className="text-slate-900 dark:text-white">40% Milestone Escrow:</strong> Held securely by the platform and released to the Expert only upon successful admission or visa approval.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">3. Protection & Refund Guarantee</h2>
              <p>In the event of a documented Visa Denial, the Student is entitled to a <strong className="text-slate-900 dark:text-white">20% automatic refund</strong> of the total service fee. This refund is issued to the Student's wallet upon approval of the official denial letter by the Expert or Admin.</p>
            </section>

            <section>
              <h2 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">4. Student Responsibilities</h2>
              <p>Students must provide accurate, non-fraudulent academic records and personal identification. Migonest does not guarantee university admission or visa success, as these decisions are made exclusively by third-party institutions and governmental authorities.</p>
            </section>

            <section>
              <h2 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest mb-4 border-b border-gray-100 dark:border-slate-700 pb-2">5. Admin Authority</h2>
              <p>The Migonest Admin team reserves the right to review all expert applications, audit admission roadmaps, and moderate community posts. Accounts found violating professional guidelines or engaging in fraudulent activity will be terminated without notice.</p>
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
