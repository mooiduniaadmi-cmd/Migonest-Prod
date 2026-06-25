import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutUsModal: React.FC<Props> = ({ isOpen, onClose }) => {
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
              <i className="fas fa-info-circle text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">About Us</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bridging Dreams & Reality</p>
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
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">Our Mission</h3>
              <p>Migonest is built with a singular mission: to democratize international student mobility. We believe that every student, regardless of their background, deserves access to high-quality, verified guidance when pursuing education abroad.</p>
            </section>

            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">The Problem We Solve</h3>
              <p>The study abroad industry is often plagued by misinformation, high hidden costs, and lack of transparency. Students often feel lost in the process, while experienced mentors have no secure way to share their knowledge.</p>
            </section>

            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">The Migonest Solution</h3>
              <p>We provide a secure, escrow-backed platform where "Uni Experts"—students and graduates who have already successfully navigated the path—can mentor prospective students. Our 8-stage roadmap and verified milestone system ensure that progress is tracked and payments are secure for everyone involved.</p>
            </section>

            <section>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest mb-3 border-b border-gray-100 dark:border-slate-700 pb-2">Our Values</h3>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Transparency:</strong> No hidden fees. Direct communication.</li>
                <li><strong>Verification:</strong> Every expert is vetted with ID and academic credentials.</li>
                <li><strong>Security:</strong> Escrow-based payments protected by Stripe.</li>
                <li><strong>Success-Oriented:</strong> We only win when you secure your admission and visa.</li>
              </ul>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-xl shadow-brand-500/20 transition-all active:scale-[0.98]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
