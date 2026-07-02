import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const RefundGuaranteeModal: React.FC<Props> = ({ isOpen, onClose }) => {
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
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center text-green-600">
              <i className="fas fa-shield-heart text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Refund Guarantee</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Success, Insured</p>
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
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-3xl border border-green-100 dark:border-green-800/30">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">20% Visa Denial Protection</h3>
                <p>Pursuing education abroad is an investment. While our experts do everything possible to ensure your success, visa decisions remain at the discretion of embassies. To mitigate your risk, Migonest provides a 20% Refund Guarantee.</p>
            </div>

            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">1. How It Works</h3>
              <p>If you have hired an expert for the "Full Assistance" service ($399) and your visa application is denied by the embassy:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>You notify Migonest within 7 days of receiving the denial.</li>
                <li>You upload the official rejection letter from the embassy.</li>
                <li>We automatically refund 20% of the total service fee back to your Migonest Wallet.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">2. Eligibility</h3>
              <p>To be eligible for the refund:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>You must have completed all stages of the roadmap as instructed by the expert.</li>
                <li>The denial must not be due to "Fraudulent Documents" or "Misrepresentation of Facts" by the student.</li>
                <li>The claim must be made through the "Report Visa Rejection" tool within the app.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">3. Platform Fees</h3>
              <p>Please note that subscription fees (Premium $19.99/mo) are non-refundable as they provide ongoing access to platform tools and community features.</p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-[0.98]"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
