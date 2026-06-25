
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Profile } from '../types';
import { Icons } from '../components/Icons';
import { DEFAULT_AVATAR } from '../services/api';
import { SERVICE_FEE } from '../constants';
import { calculateRelevanceScore } from '../utils/recommendations';
import { matchesSearchQuery } from '../utils/search';
import { openExternalUrl } from '../utils/openExternalUrl';

interface Props {
  experts: Profile[];
  recommended: Profile[];
  user: Profile;
  onHire: (expert: Profile) => void;
  onChat: (expert: Profile) => void;
  onToggleConnect: (id: string) => void;
  onViewProfile: (p: Profile | string) => void;
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
  isIOSNative?: boolean;
}

export const FindExpertView: React.FC<Props> = ({ experts, recommended, user, onHire, onChat, onToggleConnect, onViewProfile, hasMore, isFetchingMore, onLoadMore, isIOSNative }) => {
  const [filter, setFilter] = useState('');
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  // Sort by relevance score
  const sorted = useMemo(() => {
    return [...experts]
      .filter(e => e.role !== 'ADMIN' && e.id !== user.id)
      .sort((a, b) => calculateRelevanceScore(user, b) - calculateRelevanceScore(user, a));
  }, [experts, user]);

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
          onLoadMore();
        }
      },
      { 
        threshold: 0.1, 
        root: document.getElementById('main-scroll-container') 
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, onLoadMore]);

  const filtered = sorted.filter(e => {
    return matchesSearchQuery(e, filter);
  });

  const displayedExperts = filtered;

  return (
    <div className="pb-24 space-y-6 w-full overflow-x-hidden">
      <div className="px-2">
        <h2 className="text-2xl font-bold">Discover Uni Experts</h2>
      </div>

      <div className="py-2 px-2">
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-3.5 text-slate-400"></i>
          <input
            type="text"
            placeholder="Search by country or name..."
            className="w-full bg-white dark:bg-slate-800 pl-10 pr-4 py-3 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
            }}
          />
        </div>
      </div>


      <div className="grid gap-6 w-full overflow-x-hidden">
        {displayedExperts.map(expert => {
          const isConnected = user.connections?.includes(expert.id) || false;
          return (
            <div key={expert.id} className="w-full max-w-full overflow-hidden bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-4">
              <div className="flex gap-4">
                <img
                  src={expert.avatarUrl || DEFAULT_AVATAR}
                  alt={expert.fullName}
                  className="w-16 h-16 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity shadow-sm border border-gray-100 dark:border-slate-700"
                  onClick={() => onViewProfile(expert)}
                />
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3
                        className="font-bold text-lg cursor-pointer hover:text-brand-600 transition-colors truncate"
                        onClick={() => onViewProfile(expert)}
                      >
                        {expert.fullName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-black bg-brand-600 text-white px-2 py-0.5 rounded uppercase tracking-widest">Expert</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium truncate">
                          <Icons.MapMarker /> {expert.currentLocation}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleConnect(expert.id)}
                      className={`flex-shrink-0 text-[10px] font-black px-4 py-1.5 rounded-full border transition active:scale-95 ${isConnected
                        ? 'bg-brand-50 border-brand-200 text-brand-600'
                        : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-500 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200'
                        }`}
                    >
                      {isConnected ? 'CONNECTED' : '+ Connect'}
                    </button>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      <Icons.GradCap />
                      <span className="font-bold truncate">{expert.currentStudies?.[0] || 'Educational Institution'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-brand-50 dark:bg-brand-900/20 p-3 rounded-xl border border-brand-100 dark:border-brand-900/30">
                <p className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-2">Expertise Countries:</p>
                <div className="flex flex-wrap gap-1.5">
                  {expert.targetCountries?.map(tag => (
                    <span key={tag} className="text-[10px] font-bold px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-brand-100 dark:border-brand-800 shadow-sm">{tag}</span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-slate-700">
                <div className="text-sm">
                  {isIOSNative === false && (
                    <>
                      <span className="font-black text-slate-900 dark:text-white text-lg">${SERVICE_FEE}</span>
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block leading-none">Full Assistance</span>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={() => onChat(expert)}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-gray-200 transition flex items-center gap-2"
                  >
                    <Icons.Chat /> Chat
                  </button>
                    {isIOSNative === false && (
                      <button
                        onClick={() => {
                          setIsActionLoading(expert.id);
                          onHire(expert);
                          // Clear after transition or a short delay if transition is local
                          setTimeout(() => setIsActionLoading(null), 1000);
                        }}
                        disabled={isActionLoading === expert.id}
                        className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition active:scale-95 disabled:opacity-80 flex items-center justify-center gap-2"
                      >
                        {isActionLoading === expert.id ? (
                          <><i className="fas fa-circle-notch fa-spin"></i> Hiring...</>
                        ) : (
                          'Hire Expert'
                        )}
                      </button>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div ref={observerTarget} className="pt-8 flex flex-col items-center gap-3">
          {isFetchingMore ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Loading experts...</p>
            </div>
          ) : (
            <>
              <button
                onClick={onLoadMore}
                className="px-10 py-4 bg-brand-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95"
              >
                Load More
              </button>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Showing {experts.length} results
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
