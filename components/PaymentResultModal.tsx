import React from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    type: 'success' | 'cancel' | 'error' | 'info';
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    isIOSNative?: boolean;
}

export const PaymentResultModal: React.FC<Props> = ({ isOpen, onClose, type, title, message, actionLabel, onAction, isIOSNative }) => {
    if (!isOpen || isIOSNative) return null;

    const isSuccess = type === 'success';
    const isCancel = type === 'cancel';
    const isError = type === 'error';
    const isInfo = type === 'info';

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div 
                className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-bounce-in text-center relative border border-white/20"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
                    <i className="fas fa-times text-xl"></i>
                </button>

                {/* Icon */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                    isSuccess ? 'bg-green-100 text-green-500' : 
                    isCancel ? 'bg-amber-100 text-amber-500' : 
                    isInfo ? 'bg-brand-100 text-brand-600' :
                    'bg-red-100 text-red-500'
                }`}>
                    <i className={`fas ${
                        isSuccess ? 'fa-check-circle' : 
                        isCancel ? 'fa-info-circle' : 
                        isInfo ? 'fa-info-circle' :
                        'fa-exclamation-triangle'
                    } text-4xl`}></i>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed">
                    {message}
                </p>

                {/* Action Buttons */}
                <div className="space-y-3">
                    {onAction && actionLabel && (
                        <button
                            onClick={() => {
                                onAction();
                                onClose();
                            }}
                            className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all active:scale-95"
                        >
                            {actionLabel}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className={`w-full py-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg ${
                            isSuccess ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30' : 
                            isCancel ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/30' : 
                            isInfo ? 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-gray-100 dark:border-slate-600 hover:bg-gray-50' :
                            'bg-slate-700 hover:bg-slate-800 text-white'
                        }`}
                    >
                        {isSuccess ? 'Great, thanks!' : isCancel ? 'Back to App' : isInfo ? 'Close' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};
