
import React, { useEffect } from 'react';
import { Icons } from './Icons';
import { SUBSCRIPTION_FEE } from '../constants';
import { openExternalUrl } from '../utils/openExternalUrl';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: (referrerId?: string) => void;
  role: string;
  isLoading?: boolean;
  referrerId?: string | null;
  isIOSNative?: boolean;
}

export const SubscriptionModal: React.FC<Props> = ({ 
  isOpen, onClose, onSubscribe, role, isLoading, referrerId, isIOSNative 
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 relative animate-fade-in-up shadow-2xl scrollbar-hide">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition z-10">
          <i className="fas fa-times text-xl"></i>
        </button>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
            <i className="fas fa-crown"></i>
          </div>
          <h3 className="text-2xl font-bold mb-2">Unlock Unlimited Chat</h3>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            {role === 'STUDENT'
              ? "Subscribe to chat with any Uni Expert for full guidance on your higher studies abroad."
              : "Subscribe to connect and chat directly with aspiring international students."}
          </p>
        </div>

        <div className="bg-brand-50 dark:bg-slate-700/50 p-4 rounded-xl mb-6 flex justify-between items-center border border-brand-100 dark:border-slate-600">
          <div>
            <p className="font-bold text-brand-900 dark:text-white">Monthly Plan</p>
            <p className="text-xs text-brand-700 dark:text-brand-300">Cancel anytime</p>
          </div>
          <div className="text-xl font-bold text-brand-600 dark:text-brand-400">
            ${SUBSCRIPTION_FEE}
          </div>
        </div>

        <button
          onClick={() => onSubscribe(referrerId || undefined)}
          disabled={isLoading}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Processing...</span>
            </>
          ) : (
            isIOSNative ? "Subscribe with Apple ID" : "Subscribe Now"
          )}
        </button>
        <p className="text-xs text-center text-slate-400 mt-4 flex items-center justify-center gap-1">
          <Icons.Lock /> Secure Payment via {isIOSNative ? 'Apple App Store' : 'Stripe'}
        </p>

        {/* Apple Auto-Renewable Subscription Details and EULA/Privacy Links */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 text-left">
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Subscription Information</p>
          <div className="space-y-1.5 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            <p><span className="font-bold text-slate-700 dark:text-slate-300">Title:</span> Migonest Premium Access</p>
            <p><span className="font-bold text-slate-700 dark:text-slate-300">Length:</span> Monthly (1 Month auto-renewable)</p>
            <p><span className="font-bold text-slate-700 dark:text-slate-300">Price:</span> ${SUBSCRIPTION_FEE} per month</p>
            <p>
              Payment will be charged to your iTunes Account/Apple ID at confirmation of purchase. The subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.
            </p>
            <p>
              Your account will be charged for renewal within 24 hours prior to the end of the current period at the cost of ${SUBSCRIPTION_FEE}. You can manage your subscription and turn off auto-renewal by going to your App Store Account Settings after purchase.
            </p>
          </div>
          <div className="mt-4 flex justify-between gap-4 text-[10px] font-bold text-brand-600 dark:text-brand-400 border-t border-slate-50 dark:border-slate-800 pt-3">
            <button 
              onClick={() => openExternalUrl('https://www.migonest.com/privacy')}
              className="hover:underline flex items-center gap-1"
            >
              <i className="fas fa-user-shield"></i> Privacy Policy
            </button>
            <button 
              onClick={() => openExternalUrl('https://www.migonest.com/terms')}
              className="hover:underline flex items-center gap-1"
            >
              <i className="fas fa-file-contract"></i> Terms of Use (EULA)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
