
import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { api } from '../services/api';
import { Profile, WalletEntry } from '../types';
import { Icons } from '../components/Icons';
import { SERVICE_FEE } from '../constants';
import { WithdrawalModal } from '../components/WithdrawalModal';
import { PayoutSetupModal } from '../components/PayoutSetupModal';
import { openExternalUrl } from '../utils/openExternalUrl';
import { PaymentResultModal } from '../components/PaymentResultModal';

interface Props {
  user: Profile;
  onRefreshProfile: () => void;
  onBack: () => void;
  onNavigate: (view: string) => void;
  onViewProfile: (p: Profile | string) => void;
  paymentResult?: {
    isOpen: boolean;
    type: 'success' | 'cancel' | 'error';
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  setPaymentResult?: (res: any) => void;
  setIsResetStripeModalOpen: (isOpen: boolean) => void;
  isIOSNative?: boolean;
}

export const WalletView: React.FC<Props> = ({ 
  user, 
  onRefreshProfile, 
  onBack, 
  onNavigate, 
  onViewProfile, 
  paymentResult, 
  setPaymentResult,
  setIsResetStripeModalOpen,
  isIOSNative
}) => {
  if (isIOSNative) return null;
  const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [isSetupModalOpen, setSetupModalOpen] = useState(false);
  const isPollingConnect = React.useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localStripeId, setLocalStripeId] = useState<string | null>(user.stripeConnectId || null);
  const [localPayoutsEnabled, setLocalPayoutsEnabled] = useState(user.payoutsEnabled);
  const [activities, setActivities] = useState<WalletEntry[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const isExpertOrAdmin = user.role === 'EXPERT' || user.role === 'ADMIN';

  React.useEffect(() => {
    const fetchActivities = async () => {
      setIsLoadingActivities(true);
      try {
        const { transactions } = await api.getWalletTransactionsPaginated(user.id, '', 'All Years', 0, 20);
        setActivities(transactions);
      } catch (err) {
        console.error('Failed to fetch wallet activities:', err);
      } finally {
        setIsLoadingActivities(false);
      }
    };
    fetchActivities();
  }, [user.id]);

  React.useEffect(() => {
    setLocalStripeId(user.stripeConnectId || null);
    setLocalPayoutsEnabled(user.payoutsEnabled);
  }, [user.stripeConnectId, user.payoutsEnabled]);

  // Fixed Calculations based on $299.00
  const totalServiceFee = SERVICE_FEE; // $299.00
  const migonestFee = totalServiceFee * 0.20; // $59.80 (Stays in Migonest Stripe)
  const expertInitialPayout = totalServiceFee * 0.40; // $239.60 (Immediate to Expert Wallet)
  const lockedEscrowBalance = totalServiceFee * 0.40; // $239.60 (Held in Escrow)

  // Scenario outcomes
  const visaApprovedExpertBonus = lockedEscrowBalance; // +$239.60 (Total 80% for Expert)
  const visaDeniedExpertBonus = totalServiceFee * 0.20; // +$59.80 (Total 60% for Expert)
  const visaDeniedStudentRefund = totalServiceFee * 0.20; // $59.80 (Refund to Student)

  const checkPayoutStatus = React.useCallback(async (attempts = 0) => {
    if (user.payoutsEnabled) {
      setIsProcessing(false);
      isPollingConnect.current = false;
      return;
    }

    try {
      setIsProcessing(true);
      const status = await api.getConnectAccountStatus(user.id);
      
      if (status.payouts_enabled) {
        onRefreshProfile();
        setIsProcessing(false);
        isPollingConnect.current = false;
        return true; 
      } else if (!status.stripe_connect_id) {
        // Account was deleted/never fully created
        console.log('[Stripe Connect] No account ID found, refreshing profile to reset UI...');
        onRefreshProfile();
        setIsProcessing(false);
        isPollingConnect.current = false;
        return false;
      } else if (attempts < 5) {
        // Poll every 3 seconds if not enabled yet
        console.log(`[Stripe Connect] Payouts not enabled yet, polling (attempt ${attempts + 1}/5)...`);
        setTimeout(() => checkPayoutStatus(attempts + 1), 3000);
        return false;
      } else {
        // Final attempt failed or too many attempts
        console.log('[Stripe Connect] Polling finished, still pending.');
        setIsProcessing(false);
        isPollingConnect.current = false;
        return false;
      }
    } catch (err) {
      console.error('Failed to check payout status:', err);
      setIsProcessing(false);
      isPollingConnect.current = false;
      return false;
    }
  }, [user.id, user.payoutsEnabled, onRefreshProfile]);

  React.useEffect(() => {
    // Check on mount if we're coming back from Stripe
    const params = new URLSearchParams(window.location.search);
    const hasConnectFlag = params.get('connect') === 'success';
    const hasRefreshFlag = !!params.get('refresh');

    if ((hasConnectFlag || hasRefreshFlag) && !isPollingConnect.current) {
      // Clean URL params IMMEDIATELY to prevent re-triggering on state updates
      window.history.replaceState({}, document.title, window.location.pathname);
      
      isPollingConnect.current = true;
      if (hasConnectFlag) {
        checkPayoutStatus(0); // Start polling flow
      } else {
        checkPayoutStatus(5); // Just a one-shot check for refresh=true
      }
    }
  }, [checkPayoutStatus]);

  const handleSetupPayouts = async () => {
    if (isIOSNative) {
      if (setPaymentResult) {
        setPaymentResult({
          isOpen: true,
          type: 'info',
          title: 'Action Required',
          message: 'Payout management must be completed on our website.',
          actionLabel: 'Open Website',
          onAction: () => {
            openExternalUrl('https://migonest.com/wallet/');
          }
        });
      }
      return;
    }
    setSetupModalOpen(true);
  };

  const handleConfirmSetup = async (email: string, country: string) => {
    setIsProcessing(true);
    setSetupModalOpen(false);
    try {
      const isNative = Capacitor.isNativePlatform();
      const { url } = await api.createConnectAccountLink(user.id, email, country, isNative ? 'native' : undefined);
      await openExternalUrl(url, () => {
        // Browser closed; check status and reset UI
        console.log('[Wallet] Stripe Connect browser finished, refreshing status...');
        setIsProcessing(false);
        // On native, URL params isn't set, so we manually trigger the polling check
        if (isNative) {
          checkPayoutStatus(0);
        }
        onRefreshProfile();
      });
    } catch (err: any) {
      console.error('Failed to create account link:', err);
      alert(`Failed to start onboarding: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const handleResetSetup = () => {
    setIsResetStripeModalOpen(true);
  };

  const handleOpenStripeDashboard = async () => {
    if (isIOSNative) {
      if (setPaymentResult) {
        setPaymentResult({
          isOpen: true,
          type: 'info',
          title: 'Action Required',
          message: 'Payout management must be completed on our website.',
          actionLabel: 'Open Website',
          onAction: () => {
            openExternalUrl('https://migonest.com/wallet/');
          }
        });
      }
      return;
    }
    setIsProcessing(true);
    try {
      const { url } = await api.createConnectLoginLink(user.id);
      if (url) {
        await openExternalUrl(url);
      }
    } catch (err: any) {
      console.error('Failed to create login link:', err);
      if (err.message && (err.message.includes('no longer exists') || err.message.includes('revoked'))) {
        setLocalStripeId(null);
        setLocalPayoutsEnabled(false);
        onRefreshProfile();
        return;
      }
      alert(`Could not open dashboard: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (amount: number) => {
    if (!user.payoutsEnabled) {
      alert('Please set up your payout method first.');
      return;
    }
    setIsProcessing(true);
    try {
      const response = await api.requestWithdrawal(user.id, amount);
      if (setPaymentResult) {
        setPaymentResult({
          isOpen: true,
          type: 'success',
          title: 'Withdrawal Initiated!',
          message: response.message || `Withdrawal of $${amount} initiated via Migonest Stripe account.`
        });
      }
      onRefreshProfile(); // Refresh balance from server
      setWithdrawModalOpen(false);
    } catch (err: any) {
      console.error('Withdrawal failed:', err);
      if (setPaymentResult) {
        setPaymentResult({
          isOpen: true,
          type: 'error',
          title: 'Withdrawal Failed',
          message: err.message || 'Withdrawal failed. Please try again.'
        });
      } else {
        alert(`${err.message || 'Withdrawal failed. Please try again.'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="pb-24 relative">
      {isProcessing && !isPollingConnect.current && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-brand-600 font-bold animate-pulse">Processing...</p>
          </div>
        </div>
      )}

      {paymentResult && setPaymentResult && (
        <PaymentResultModal
          isOpen={paymentResult.isOpen}
          onClose={() => setPaymentResult({ ...paymentResult, isOpen: false })}
          type={paymentResult.type}
          title={paymentResult.title}
          message={paymentResult.message}
          actionLabel={paymentResult.actionLabel}
          onAction={paymentResult.onAction}
        />
      )}

      {isProcessing && isPollingConnect.current && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[5000] flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fab fa-stripe text-3xl text-blue-400"></i>
            </div>
          </div>
          <p className="mt-6 text-lg font-bold">Processing</p>
          <p className="text-slate-400 text-sm mt-2">Loading takes a moment, please do not close...</p>
        </div>
      )}

      <button
        onClick={onBack}
        className="flex items-center gap-3 mb-6 p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-2xl transition-all group active:scale-95"
      >
        <div className="text-slate-500 group-hover:text-brand-600 transition-colors">
          <i className="fas fa-arrow-left text-lg"></i>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">Financial Center</h2>
      </button>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 shadow-2xl mb-8 border border-white/10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
              {isExpertOrAdmin ? 'Total Wallet Balance' : 'Refundable Balance'}
            </p>
            <h1 className="text-5xl font-bold">${(user.walletBalance || 0).toFixed(2)}</h1>
          </div>
          {localPayoutsEnabled ? (
            <button
              onClick={() => setWithdrawModalOpen(true)}
              disabled={isProcessing}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 rounded-2xl text-sm font-bold shadow-xl shadow-brand-900/50 transition transform active:scale-95"
            >
              Withdraw
            </button>
          ) : (
            <button
              onClick={handleSetupPayouts}
              disabled={isProcessing}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-2xl text-sm font-bold shadow-xl shadow-blue-900/50 transition transform active:scale-95 flex items-center gap-2"
            >
              {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fab fa-stripe"></i>}
              Setup Payouts
            </button>
          )}
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-white/10">
          <div className="text-xs">
            <span className="text-slate-400 block mb-1">Payout Method</span>
            <span className={`font-bold flex items-center gap-1 ${localPayoutsEnabled ? 'text-green-400' : 'text-amber-400'}`}>
              <i className="fab fa-stripe text-lg"></i> 
              {localPayoutsEnabled ? 'Stripe Connect Linked' : 'Not Setup'}
              {!localPayoutsEnabled && localStripeId && (
                <button 
                  onClick={handleResetSetup}
                  disabled={isProcessing}
                  className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-lg hover:bg-amber-200 transition-colors uppercase tracking-widest"
                >
                  {isProcessing ? 'Resetting...' : 'Reset Setup'}
                </button>
              )}
            </span>
          </div>
          {isExpertOrAdmin && (
            <div className="text-xs text-right">
              <span className="text-slate-400 block mb-1">Lifetime Payouts</span>
              <span className="font-bold text-white text-lg">${(user.earnings || 0).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {localPayoutsEnabled && (
        <div className="mb-8 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-widest mb-2">
                <Icons.Shield /> Secured by Stripe
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Manage Your Payout Account</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Access your secure Stripe Express Dashboard to update bank details, edit personal info, or manage your accounts.
              </p>
            </div>
            <button
              onClick={handleOpenStripeDashboard}
              className="w-full sm:w-auto px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <i className="fab fa-stripe text-lg"></i> Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Logic Boxes */}
      {isExpertOrAdmin ? (
        <div className="space-y-6 mb-8">
          <h3 className="font-bold text-lg flex items-center gap-2"><Icons.Clock /> Expert Payout Structure (${totalServiceFee})</h3>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-6">
            <div className="flex justify-between mb-4 pb-4 border-b border-amber-200/30">
              <span className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">Initial Release:</span>
              <span className="text-sm font-black text-amber-600">${(totalServiceFee * 0.40).toFixed(2)} (40%)</span>
            </div>
            <div className="flex justify-between mb-6 pb-4 border-b border-amber-200/30">
              <span className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">Platform Retention:</span>
              <span className="text-sm font-black text-slate-500">${(totalServiceFee * 0.20).toFixed(2)} (20%)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-green-100 dark:border-green-900/30">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">On Visa Success</div>
                <div className="text-green-600 text-lg font-bold">+${visaApprovedExpertBonus.toFixed(2)}</div>
                <p className="text-[10px] text-slate-500 mt-1">Total ${(totalServiceFee * 0.80).toFixed(2)} (80%) Payout</p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">On Visa Rejection</div>
                <div className="text-slate-700 dark:text-slate-300 text-lg font-bold">+${visaDeniedExpertBonus.toFixed(2)}</div>
                <p className="text-[10px] text-slate-500 mt-1">Total ${(totalServiceFee * 0.60).toFixed(2)} (60%) Payout</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 mb-8">
          <h3 className="font-bold text-lg flex items-center gap-2"><Icons.Unlock /> Student Protection (${totalServiceFee})</h3>
          <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/50 rounded-2xl p-6">
            <div className="flex justify-between mb-4 pb-4 border-b border-brand-200/30">
              <span className="text-sm font-bold text-brand-900 dark:text-brand-200 uppercase tracking-wider">Immediate Distribution:</span>
              <span className="text-sm font-black text-brand-600">${(totalServiceFee * 0.60).toFixed(2)} (60%)</span>
            </div>
            <p className="text-[10px] text-slate-500 mb-4 italic">
              *20% to Migonest, 40% released to Expert instantly upon your payment.
            </p>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex gap-3">
                <div className="mt-1 text-brand-600"><Icons.Check /></div>
                <span>Remaining 40% (${(totalServiceFee * 0.40).toFixed(2)}) is held in <b>Migonest Escrow</b>.</span>
              </li>
              <li className="flex gap-3">
                <div className="mt-1 text-red-500 font-bold">!</div>
                <span className="font-bold text-slate-900 dark:text-white">Visa Rejection Policy: You receive a ${(totalServiceFee * 0.20).toFixed(2)} (20%) refund automatically to this wallet if your visa is denied.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Activity */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Wallet Activity</h3>
        {(activities || []).length > 2 && (
          <button
            onClick={() => onNavigate('TRANSACTIONS')}
            className="text-xs font-black text-brand-600 uppercase tracking-widest hover:underline"
          >
            View All Transactions
          </button>
        )}
      </div>
      <div className="space-y-3">
        {isLoadingActivities ? (
          <div className="flex justify-center py-12">
            <i className="fas fa-spinner fa-spin text-brand-600 text-2xl"></i>
          </div>
        ) : (!activities || activities.length === 0) ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-dashed border-gray-200 dark:border-slate-700">
            <div className="text-slate-300 text-4xl mb-4"><Icons.Money /></div>
            <p className="text-slate-400 text-sm">No activity recorded yet.</p>
          </div>
        ) : (
          activities.slice(0, 5).map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-50 dark:border-slate-700 hover:border-brand-100 transition-all">
              <div className="flex items-center gap-4">
                {item.counterpartyId ? (
                  <button 
                    onClick={() => item.counterpartyId && onViewProfile(item.counterpartyId)}
                    className="relative group focus:outline-none"
                  >
                    {item.counterpartyAvatarUrl ? (
                      <img 
                        src={item.counterpartyAvatarUrl} 
                        alt={item.counterpartyName || ''} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700 group-hover:border-brand-500 transition-colors"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:border-brand-500 border-2 border-transparent transition-all">
                        <i className="fas fa-user text-slate-400"></i>
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm">
                      {item.type === 'WITHDRAWAL' 
                        ? <i className="fas fa-arrow-up text-[10px] text-red-500 rotate-45"></i> 
                        : <i className="fas fa-arrow-down text-[10px] text-green-500"></i>
                      }
                    </div>
                  </button>
                ) : (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${item.type === 'WITHDRAWAL'
                    ? 'bg-red-50 text-red-500 dark:bg-red-900/20'
                    : item.type === 'PAYMENT'
                      ? 'bg-slate-50 text-slate-500 dark:bg-slate-700'
                      : 'bg-green-50 text-green-500 dark:bg-green-900/20'
                    }`}>
                    {item.type === 'WITHDRAWAL' ? <i className="fas fa-arrow-up transform rotate-45"></i> : <i className="fas fa-arrow-down"></i>}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold flex flex-wrap items-center gap-x-1 gap-y-0.5">
                    {(() => {
                      const desc = item.description;
                      const name = item.counterpartyName;
                      
                      if (name && desc.includes(name)) {
                        const parts = desc.split(name);
                        return (
                          <>
                            {parts[0]}
                            <button 
                              onClick={() => item.counterpartyId && onViewProfile(item.counterpartyId)}
                              className="text-brand-600 hover:text-brand-700 hover:underline transition-colors"
                            >
                              {name}
                            </button>
                            {parts[1]}
                          </>
                        );
                      }

                      return (
                        <>
                          {desc}
                          {name && (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">with</span>
                              <button 
                                onClick={() => item.counterpartyId && onViewProfile(item.counterpartyId)}
                                className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded font-black hover:text-brand-600 transition-colors truncate"
                              >
                                {name}
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    {new Date(item.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    {item.status !== 'COMPLETED' && ` • ${item.status}`}
                  </p>
                </div>
              </div>
              <span className={`font-bold text-lg whitespace-nowrap ${item.amount > 0 ? 'text-green-500' : 'text-slate-900 dark:text-white'}`}>
                {item.amount > 0 ? '+' : ''}${Math.abs(item.amount).toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>

      <WithdrawalModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        balance={user.walletBalance || 0}
        onWithdraw={handleWithdraw}
      />

      <PayoutSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        initialEmail={user.email}
        onConfirm={handleConfirmSetup}
        isProcessing={isProcessing}
      />
    </div>
  );
};
