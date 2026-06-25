
import React, { useState, useEffect } from 'react';
import { WalletEntry } from '../types';
import { Icons } from '../components/Icons';
import { api } from '../services/api';

interface Props {
    setView: (v: string) => void;
    isIOSNative?: boolean;
}

export const AdminWithdrawalView: React.FC<Props> = ({ admin, setView, isIOSNative }) => {
    if (isIOSNative) return null;
    const [pendingWithdrawals, setPendingWithdrawals] = useState<WalletEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isApproving, setIsApproving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPendingWithdrawals();
    }, []);

    const fetchPendingWithdrawals = async () => {
        setIsLoading(true);
        try {
            const data = await api.getPendingWithdrawals();
            setPendingWithdrawals(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch withdrawals');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        setIsApproving(id);
        setError(null);
        try {
            await api.approveWithdrawal(id);
            setPendingWithdrawals(prev => prev.filter(w => w.id !== id));
        } catch (err: any) {
            setError(err.message || 'Approval failed');
        } finally {
            setIsApproving(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Admin Approval</h2>
                    <p className="text-sm text-slate-500 font-medium">Manage pending withdrawal requests from users.</p>
                </div>
                <button 
                    onClick={() => setView('HOME')}
                    className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm text-slate-500 hover:text-brand-600 transition-colors"
                >
                    <Icons.Home />
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
                    <Icons.Exclamation /> {error}
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin"></div>
                    <p className="text-[10px] text-brand-600 font-black uppercase tracking-widest animate-pulse">Loading Requests...</p>
                </div>
            ) : pendingWithdrawals.length === 0 ? (
                <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                        <Icons.Check />
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Queue Clear</h4>
                    <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed font-medium">No pending withdrawal requests found at this time.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingWithdrawals.map((withdrawal) => (
                        <div key={withdrawal.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center text-xl">
                                    <Icons.Money />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">Withdrawal: ${Math.abs(withdrawal.amount).toFixed(2)}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Target: {withdrawal.counterpartyName}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[200px]">{withdrawal.id}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleApprove(withdrawal.id)}
                                    disabled={isApproving === withdrawal.id}
                                    className="flex-1 md:flex-none px-6 py-3 bg-brand-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-brand-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isApproving === withdrawal.id ? (
                                        <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Icons.Check />
                                    )}
                                    Approve & Transfer
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
