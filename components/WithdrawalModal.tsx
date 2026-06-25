import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onWithdraw: (amount: number) => void;
  isIOSNative?: boolean;
}

export const WithdrawalModal: React.FC<Props> = ({ isOpen, onClose, balance, onWithdraw, isIOSNative }) => {
  if (isIOSNative) return null;
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const val = parseFloat(amount);
    if (isNaN(val)) {
      setError('Please enter a valid amount.');
      return;
    }
    if (val < 50) {
      setError('Minimum withdrawal amount is $50.');
      return;
    }
    if (val > 150) {
      setError('Maximum withdrawal amount is $150 per day.');
      return;
    }
    if (val > balance) {
      setError('Insufficient funds.');
      return;
    }
    onWithdraw(val);
    onClose();
    setAmount('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-6 relative animate-fade-in-up shadow-2xl scrollbar-hide">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10">
          <i className="fas fa-times"></i>
        </button>
        <h3 className="text-xl font-bold mb-4">Withdraw Funds</h3>
        <p className="text-sm text-slate-500 mb-6">
          Available: <span className="font-bold text-slate-900 dark:text-white">${balance.toFixed(2)}</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Amount to withdraw</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError(''); }}
                className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
              <Icons.Exclamation /> {error}
            </div>
          )}

          <div className="text-[10px] text-slate-400 space-y-1 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-xl">
            <p className="flex items-center gap-1"><Icons.Check /> Minimum: $50.00</p>
            <p className="flex items-center gap-1"><Icons.Check /> Maximum: $150.00 / day</p>
            <p className="flex items-center gap-1"><Icons.Check /> Processing time: 1-3 business days</p>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-indigo-600 font-bold justify-center pt-2">
            <i className="fab fa-stripe text-xl"></i>
            <span>Stripe Connect Secured</span>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all transform active:scale-95"
          >
            Confirm Withdrawal
          </button>
        </div>
      </div>
    </div>
  );
};