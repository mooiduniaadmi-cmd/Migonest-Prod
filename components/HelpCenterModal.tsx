import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpCenterModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 w-full max-w-md max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center text-brand-600">
              <i className="fas fa-headset text-xl"></i>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Help Center</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">We're here to help</p>
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
          <div className="space-y-8 text-center text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            <div className="bg-brand-50 dark:bg-brand-900/20 p-6 rounded-3xl border border-brand-100 dark:border-brand-800/30">
                <i className="fas fa-envelope text-3xl text-brand-600 mb-4"></i>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Email Support</h3>
                <p className="mb-4">Have questions about your journey, expert matching, or payments? Our team is ready to assist you.</p>
                <a 
                    href="mailto:contact@migonest.com" 
                    className="inline-block px-6 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition-colors"
                >
                    contact@migonest.com
                </a>
            </div>

            <div className="space-y-4">
                <h4 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-widest">Typical Response Times</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">General Inquiry</p>
                        <p className="font-bold text-slate-900 dark:text-white">24-48 Hours</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Payment Issues</p>
                        <p className="font-bold text-brand-600">Priority (6-12h)</p>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl shadow-xl transition-all active:scale-[0.98]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
