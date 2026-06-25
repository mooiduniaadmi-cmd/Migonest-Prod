
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Profile } from '../types';
import { Icons } from '../components/Icons';
import { DEFAULT_AVATAR } from '../services/api';
import { calculateRelevanceScore } from '../utils/recommendations';
import { matchesSearchQuery } from '../utils/search';

interface Props {
  students: Profile[];
  recommended: Profile[];
  user: Profile;
  onChat: (student: Profile) => void;
  onToggleConnect: (id: string) => void;
  onViewProfile: (p: Profile | string) => void;
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
}

export const SearchStudentsView: React.FC<Props> = ({ students, recommended, user, onChat, onToggleConnect, onViewProfile, hasMore, isFetchingMore, onLoadMore }) => {
  const [filter, setFilter] = useState('');

  // Sort by relevance score
  const sorted = useMemo(() => {
    return [...students]
      .filter(s => s.role !== 'ADMIN' && s.id !== user.id)
      .sort((a, b) => calculateRelevanceScore(user, b) - calculateRelevanceScore(user, a));
  }, [students, user]);

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

  const filtered = sorted.filter(s => {
    return matchesSearchQuery(s, filter);
  });

  const displayedStudents = filtered;

  return (
    <div className="pb-24 space-y-6 w-full overflow-x-hidden">
      <div className="px-2">
        <h2 className="text-2xl font-bold">Discover Students</h2>
      </div>

      <div className="py-2 px-2">
        <div className="relative">
          <i className="fas fa-search absolute left-4 top-3.5 text-slate-400"></i>
          <input
            type="text"
            placeholder="Search by target country or name..."
            className="w-full bg-white dark:bg-slate-800 pl-10 pr-4 py-3 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
            }}
          />
        </div>
      </div>


      <div className="grid gap-6 w-full overflow-x-hidden">
        {displayedStudents.map(student => {
          const isConnected = user.connections?.includes(student.id) || false;
          return (
            <div key={student.id} className="w-full max-w-full overflow-hidden bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-4">
              <div className="flex gap-4">
                <img
                  src={student.avatarUrl || DEFAULT_AVATAR}
                  className="w-16 h-16 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity shadow-sm border border-gray-100 dark:border-slate-700"
                  alt={student.fullName}
                  onClick={() => onViewProfile(student)}
                />
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3
                        className="font-bold text-lg cursor-pointer hover:text-brand-600 transition-colors truncate"
                        onClick={() => onViewProfile(student)}
                      >
                        {student.fullName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-black bg-brand-600 text-white px-2 py-0.5 rounded uppercase tracking-widest">Student</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium truncate">
                          <Icons.MapMarker /> {student.currentLocation || 'Location N/A'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleConnect(student.id)}
                      className={`flex-shrink-0 text-[10px] font-black px-4 py-1.5 rounded-full border transition active:scale-95 ${isConnected
                        ? 'bg-brand-50 border-brand-200 text-brand-600'
                        : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-500 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200'
                        }`}
                    >
                      {isConnected ? 'CONNECTED' : '+ Connect'}
                    </button>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <Icons.GradCap />
                      <span className="font-bold truncate">{student.currentStudies?.[0] || 'Educational Institution'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-brand-50 dark:bg-brand-900/20 p-3 rounded-xl border border-brand-100 dark:border-brand-900/30">
                <p className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-2">Countries to Apply:</p>
                <div className="flex flex-wrap gap-1.5">
                  {student.targetCountries?.map(tag => (
                    <span key={tag} className="text-[10px] font-bold px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-brand-100 dark:border-brand-800 shadow-sm">{tag}</span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => onChat(student)}
                  className="px-6 py-2.5 bg-brand-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition active:scale-95 flex items-center gap-2"
                >
                  <Icons.Chat /> Message Student
                </button>
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
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Loading students...</p>
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
                Showing {students.length} results
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
