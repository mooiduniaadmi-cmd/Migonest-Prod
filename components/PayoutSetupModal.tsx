import React, { useState } from 'react';
import { Icons } from './Icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialEmail: string;
  onConfirm: (email: string, country: string) => void;
  isProcessing?: boolean;
  isIOSNative?: boolean;
}

const STRIPE_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'NO', name: 'Norway' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NZ', name: 'New Zealand' },
].sort((a, b) => a.name.localeCompare(b.name));

export const PayoutSetupModal: React.FC<Props> = ({ isOpen, onClose, initialEmail, onConfirm, isProcessing, isIOSNative }) => {
  if (isIOSNative) return null;
  const [email, setEmail] = useState(initialEmail);
  const [country, setCountry] = useState('US');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!country) {
      setError('Please select your country.');
      return;
    }
    onConfirm(email, country);
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-8 relative shadow-2xl animate-scale-up border border-slate-100 dark:border-slate-800">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          disabled={isProcessing}
        >
          <i className="fas fa-times text-xl"></i>
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 shadow-inner">
            <i className="fab fa-stripe text-3xl"></i>
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Set up Payouts</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Configure your Stripe Express account to start receiving earnings from Migonest.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
              Select Your Country
            </label>
            <div className="relative">
              <select
                value={country}
                onChange={(e) => { setCountry(e.target.value); setError(''); }}
                className="w-full pl-4 pr-10 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-indigo-500/50 focus:bg-white dark:focus:bg-slate-800 transition-all appearance-none text-slate-900 dark:text-white font-bold shadow-sm"
                disabled={isProcessing}
              >
                {STRIPE_COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <i className="fas fa-chevron-down"></i>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
              Confirm Your Email
            </label>
            <div className="relative group">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-transparent focus:border-indigo-500/50 focus:bg-white dark:focus:bg-slate-800 transition-all text-slate-900 dark:text-white font-bold shadow-sm"
                placeholder="your@email.com"
                disabled={isProcessing}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                <i className="fas fa-envelope"></i>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 ml-1 italic">
              * This email will be used for your Stripe Dashboard login.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold animate-shake">
              <i className="fas fa-exclamation-circle text-lg"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="pt-4 flex flex-col gap-4">
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-3 group"
            >
              {isProcessing ? (
                <i className="fas fa-spinner fa-spin text-xl"></i>
              ) : (
                <>
                  <span>Start Onboarding</span>
                  <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                </>
              )}
            </button>
            
            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
              <i className="fas fa-lock text-slate-300"></i>
              Securely Powered by Stripe Connect
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
