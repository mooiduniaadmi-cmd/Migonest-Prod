
import React, { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 md:p-12 shadow-2xl animate-fade-in-up scrollbar-hide relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition">
          <i className="fas fa-times text-xl"></i>
        </button>

        <div className="mb-10 text-left">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Terms & Conditions</h2>
          <p className="text-sm text-brand-600 font-bold uppercase tracking-widest mt-2">Migonest is a product of MigoSky LLC.</p>
        </div>

        <div className="space-y-8 text-left text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          <section>
            <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">1. Service & Ownership</h3>
            <p>Migonest (the "Platform") is owned and operated by MigoSky LLC, located at 30 N GOULD ST STE 5342, SHERIDAN WY 82801, USA. By using this service, you enter into a binding agreement with MigoSky LLC. The platform serves as a bridge connecting Students with verified Uni Experts.</p>
          </section>

          <section>
            <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">2. Payment & Escrow Policy</h3>
            <p>All service payments ($299.00 for Full Assistance) are processed through the Platform's Stripe Connect infrastructure. The fee distribution is as follows:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><b>20% Platform Fee:</b> Retained by Migonest (MigoSky LLC) for operational and matching services.</li>
              <li><b>40% Initial Release:</b> Paid to the Expert immediately upon the Student's successful transaction to initiate the roadmap.</li>
              <li><b>40% Milestone Escrow:</b> Held securely by the platform and released to the Expert only upon successful admission or visa approval.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">3. Protection & Refund Guarantee</h3>
            <p>In the event of a documented Visa Denial, the Student is entitled to a <b>20% automatic refund</b> of the total service fee. This refund is issued to the Student's wallet upon approval of the official denial letter by the Expert or Admin.</p>
          </section>

          <section>
            <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">4. Student Responsibilities</h3>
            <p>Students must provide accurate, non-fraudulent academic records and personal identification. Migonest does not guarantee university admission or visa success, as these decisions are made exclusively by third-party institutions and governmental authorities.</p>
          </section>

          <section>
            <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">5. Admin Authority</h3>
            <p>The Migonest Admin team reserves the right to review all expert applications, audit admission roadmaps, and moderate community posts. Accounts found violating professional guidelines or engaging in fraudulent activity will be terminated without notice.</p>
          </section>

          <div className="pt-6">
            <button 
              onClick={onClose}
              className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition"
            >
              I understand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
