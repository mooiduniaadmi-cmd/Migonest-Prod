import React from 'react';

interface SecurityWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SecurityWarningModal: React.FC<SecurityWarningModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up border border-red-100 dark:border-red-900/30"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
                        <i className="fas fa-gavel"></i>
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tight">Security Restriction</h3>
                    
                    <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-100 dark:border-red-900/20 mb-6">
                        <p className="text-sm font-bold text-red-700 dark:text-red-400 leading-relaxed">
                            You will be banned and we will take legal action if you share your contact info or use this platform and take payment privately outside of Migonest platform.
                        </p>
                    </div>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 font-medium px-2">
                        To protect our community and ensure secure transactions, sharing websites, emails, or phone numbers in posts is strictly prohibited.
                    </p>
                    
                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] transition active:scale-95"
                    >
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    );
};
