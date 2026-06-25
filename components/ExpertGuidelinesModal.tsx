import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpertGuidelinesModal: React.FC<Props> = ({ isOpen, onClose }) => {
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
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600">
              <i className="fas fa-gavel text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Expert Guidelines</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Integrity & Excellence</p>
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
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">1. Verification Process</h3>
              <p>Every Uni Expert must maintain a verified profile. This includes:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Submission of valid Government-issued ID.</li>
                <li>Submission of Academic Transcripts or Enrollment Verification from your university abroad.</li>
                <li>A professional profile photo.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">2. Service Standards</h3>
              <p>Experts are expected to provide accurate, timely, and empathetic guidance. This includes:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Responding to student messages within 24-48 hours.</li>
                <li>Following the 8-stage roadmap diligently.</li>
                <li>Providing honest feedback on documents (SOP, CV, LOR).</li>
                <li>Never promising "Guaranteed Admission" as this is outside of platform control.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">3. Earnings & Payouts</h3>
              <p>Migonest operates on a success-based model:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>80/20 Split:</strong> Experts keep 80% of the service fee; Migonest takes a 20% platform fee for escrow, insurance, and marketing.</li>
                <li><strong>Milestone Payouts:</strong> 40% is released to your Migonest Wallet upon student payment, and the remaining 40% (totaling 80%) is released after the visa is granted.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">4. Zero Tolerance for Fraud</h3>
              <p>Sharing personal contact info (Phone, Email, WhatsApp) to bypass the platform's escrow system is strictly prohibited and will result in permanent account suspension and forfeiture of pending earnings.</p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-[0.98]"
          >
            I Agree to Guidelines
          </button>
        </div>
      </div>
    </div>
  );
};
