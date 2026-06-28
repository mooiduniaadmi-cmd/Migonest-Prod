
import React, { useEffect } from 'react';
import { WalletEntry } from '../types';
import { Icons } from '../components/Icons';

interface Props {
    userId: string;
    transactions: WalletEntry[];
    isLoading: boolean;
    isFetchingMore: boolean;
    hasMore: boolean;
    query: string;
    year: string;
    onSearch: (q: string) => void;
    onYearChange: (y: string) => void;
    onLoadMore: () => void;
    onProfileClick: (profileId: string) => void;
    onBack: () => void;
    isIOSNative?: boolean;
}

export const TransactionHistoryView: React.FC<Props> = ({
    userId,
    transactions,
    isLoading,
    isFetchingMore,
    hasMore,
    query,
    year,
    onSearch,
    onYearChange,
    onLoadMore,
    onProfileClick,
    onBack,
    isIOSNative
}) => {
    if (isIOSNative) return null;

    // Initial fetch if empty
    useEffect(() => {
        if (transactions.length === 0 && !isLoading) {
            onSearch(query);
        }
    }, []);

    const years = ['All Years', '2025', '2024', '2023'];

    return (
        <div className="pb-24 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-slate-500 hover:text-brand-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                    <i className="fas fa-arrow-left text-lg"></i>
                </button>
                <div>
                    <h2 className="text-2xl font-bold">Transaction History</h2>
                    <p className="text-sm text-slate-500">Detailed record of all wallet activity</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="flex-1 relative">
                    <i className="fas fa-search absolute left-4 top-3.5 text-slate-400"></i>
                    <input
                        type="text"
                        placeholder="Search by name, university, country, or role..."
                        className="w-full bg-white dark:bg-slate-800 pl-11 pr-4 py-3 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium"
                        value={query}
                        onChange={(e) => onSearch(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-48">
                    <select
                        value={year}
                        onChange={(e) => onYearChange(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium appearance-none"
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {isLoading && transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-500 font-medium">Loading transactions...</p>
                </div>
            ) : transactions.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-16 text-center border border-dashed border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fas fa-wallet text-slate-300 text-4xl"></i>
                    </div>
                    <h3 className="text-xl font-bold mb-2">No transactions found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">Try adjusting your filters or search term to find what you're looking for.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {transactions.map(item => (
                        <div key={item.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl flex justify-between items-center shadow-sm border border-gray-100 dark:border-slate-700 group hover:border-brand-200 dark:hover:border-brand-900 transition-all">
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-transform group-hover:scale-110 ${item.type === 'WITHDRAWAL'
                                    ? 'bg-red-50 text-red-500 dark:bg-red-900/20'
                                    : item.type === 'PAYMENT'
                                        ? 'bg-brand-50 text-brand-500 dark:bg-brand-900/20'
                                        : 'bg-green-50 text-green-500 dark:bg-green-900/20'
                                    }`}>
                                    {item.type === 'WITHDRAWAL' ? <i className="fas fa-arrow-up transform rotate-45"></i> : <i className="fas fa-arrow-down"></i>}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white mb-1">
                                        {(() => {
                                            const desc = item.description;
                                            const name = item.counterpartyName;
                                            if (name && desc.includes(name)) {
                                                const parts = desc.split(name);
                                                return (
                                                    <>
                                                        {parts[0]}
                                                        <button 
                                                            onClick={() => item.counterpartyId && onProfileClick(item.counterpartyId)}
                                                            className="text-brand-600 hover:text-brand-700 hover:underline transition-colors"
                                                        >
                                                            {name}
                                                        </button>
                                                        {parts[1]}
                                                    </>
                                                );
                                            }
                                            return desc;
                                        })()}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                            {new Date(item.date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${item.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            }`}>
                                            {item.status}
                                        </span>
                                        {(item.university || item.country) && (
                                            <>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                                                <span className="text-[10px] text-slate-500 font-bold">
                                                    {[item.university, item.country].filter(Boolean).join(' • ')}
                                                </span>
                                            </>
                                        )}
                                        {item.counterpartyName && !item.description.includes(item.counterpartyName) && (
                                            <>
                                                <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                                                <button
                                                    onClick={() => item.counterpartyId && onProfileClick(item.counterpartyId)}
                                                    className="flex items-center gap-1.5 hover:text-brand-600 transition-colors bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-gray-100 dark:border-slate-700"
                                                >
                                                    {item.counterpartyAvatarUrl && (
                                                        <img
                                                            src={item.counterpartyAvatarUrl}
                                                            alt=""
                                                            className="w-4 h-4 rounded-full object-cover border border-gray-100"
                                                        />
                                                    )}
                                                    <span className="text-[10px] font-black uppercase">
                                                        {item.counterpartyRole}: {item.counterpartyName}
                                                    </span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-xl font-black ${item.amount > 0 ? 'text-green-600' : 'text-slate-900 dark:text-white'}`}>
                                    {item.amount > 0 ? '+' : '-'}${Math.abs(item.amount).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {hasMore && (
                <div className="mt-12 flex justify-center">
                    <button
                        onClick={onLoadMore}
                        disabled={isFetchingMore}
                        className="group relative px-10 py-4 bg-brand-600 text-white font-black text-xs uppercase tracking-widest rounded-3xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 hover:shadow-brand-500/40 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                    >
                        {isFetchingMore ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Loading More...
                            </>
                        ) : (
                            <>
                                Load More Transactions
                                <i className="fas fa-chevron-down group-hover:translate-y-1 transition-transform"></i>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
