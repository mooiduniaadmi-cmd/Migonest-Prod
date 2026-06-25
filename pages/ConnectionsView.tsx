
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Profile } from '../types';
import { Icons } from '../components/Icons';
import { DEFAULT_AVATAR } from '../services/api';
import { getRecommendedProfiles } from '../utils/recommendations';

interface Props {
  user: Profile;
  experts: Profile[];
  students: Profile[];
  recommended: Profile[];
  connectedProfiles: Profile[];
  totalCount: number;
  hasMoreConnections: boolean;
  isFetchingMoreConnections: boolean;
  onLoadMoreConnections: () => void;
  onChat: (p: Profile) => void;
  onToggleConnect: (id: string) => void;
  onViewProfile: (p: Profile | string) => void;
  setView: (v: string) => void;
}

export const ConnectionsView: React.FC<Props> = ({ user, experts, students, recommended, connectedProfiles, totalCount, hasMoreConnections, isFetchingMoreConnections, onLoadMoreConnections, onChat, onToggleConnect, onViewProfile, setView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [visibleSuggestionsCount, setVisibleSuggestionsCount] = useState(10);
  const [profileToRemove, setProfileToRemove] = useState<Profile | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer for the full-screen overlay
  useEffect(() => {
    if (!showAllConnections) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreConnections && !isFetchingMoreConnections) {
        onLoadMoreConnections();
      }
    }, {
      root: null, // relative to viewport
      threshold: 0.1
    });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMoreConnections, isFetchingMoreConnections, onLoadMoreConnections, showAllConnections]);

  const isExpertOrAdmin = user.role === 'EXPERT' || user.role === 'ADMIN';

  const filteredConnectedProfiles = useMemo(() => {
    if (!searchTerm.trim()) return connectedProfiles;
    const term = searchTerm.toLowerCase();
    return connectedProfiles.filter(p =>
      p.fullName.toLowerCase().includes(term) ||
      p.role.toLowerCase().includes(term)
    );
  }, [connectedProfiles, searchTerm]);

  const suggestions = recommended;
  const totalConnections = totalCount;

  // Preview mode: Show only first 3
  const previewProfiles = connectedProfiles.slice(0, 3);

  const displayedSuggestions = suggestions.slice(0, visibleSuggestionsCount);
  const hasMoreSuggestions = suggestions.length > visibleSuggestionsCount;

  const handleConfirmRemoval = () => {
    if (profileToRemove) {
      onToggleConnect(profileToRemove.id);
      setProfileToRemove(null);
    }
  };

  const handleSeeAll = () => {
    setSearchTerm('');
    setShowAllConnections(true);
  };

  return (
    <>
      {showAllConnections ? (
        <div className="flex flex-col h-full animate-fade-in-up">
          {/* Header (Back Button) */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setShowAllConnections(false)}
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition shadow-sm active:scale-90 border border-gray-100 dark:border-slate-700"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">All Connections</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{totalConnections} members</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search connections..."
              className="w-full bg-white dark:bg-slate-800 pl-11 pr-4 py-4 rounded-2xl border border-gray-100 dark:border-slate-700 text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* List Content */}
          {filteredConnectedProfiles.length === 0 ? (
            <div className="py-24 text-center">
              <i className="fas fa-search text-4xl text-slate-200 mb-4"></i>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No results found.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredConnectedProfiles.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-slate-700 shadow-sm animate-fade-in-up">
                  <div className="flex items-center gap-5 min-w-0">
                    <img
                      src={p.avatarUrl || DEFAULT_AVATAR}
                      className="w-14 h-14 rounded-2xl object-cover border border-gray-50 dark:border-slate-700 cursor-pointer"
                      alt=""
                      onClick={() => onViewProfile(p)}
                    />
                    <div className="min-w-0">
                      <h4
                        className="font-bold text-sm truncate cursor-pointer hover:text-brand-600 transition-colors"
                        onClick={() => onViewProfile(p)}
                      >
                        {p.fullName}
                      </h4>
                      <div className="flex flex-col gap-1 mt-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-brand-600 text-white">
                            {p.role}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                            <Icons.MapMarker /> {p.currentLocation}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px]">
                          <Icons.GradCap />
                          <span className="truncate">{p.currentStudies?.[0] || 'Educational Institution'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onChat(p)} className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center hover:bg-brand-100 shadow-sm transition">
                      <Icons.Chat />
                    </button>
                    <button onClick={() => setProfileToRemove(p)} className="w-11 h-11 rounded-xl bg-gray-50 text-slate-400 flex items-center justify-center hover:text-red-500 shadow-sm transition">
                      <i className="fas fa-user-minus"></i>
                    </button>
                  </div>
                </div>
              ))}

              <div ref={loaderRef} className="py-8 flex flex-col items-center gap-4">
                {hasMoreConnections ? (
                  isFetchingMoreConnections ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest animate-pulse">Loading...</p>
                    </div>
                  ) : (
                    <button
                      onClick={onLoadMoreConnections}
                      className="px-8 py-3 bg-brand-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition"
                    >
                      Load More
                    </button>
                  )
                ) : (
                  <div className="flex flex-col items-center gap-2 opacity-40">
                    <div className="h-px w-24 bg-slate-400"></div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">End of list</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="pb-24 space-y-10 min-h-screen w-full overflow-hidden">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-bold">Network</h2>
            <span className="text-xs font-bold text-slate-400 uppercase bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full">
              {totalConnections} Connected
            </span>
          </div>

          {/* Preview Section */}
          <section className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">My Connections</h3>
              <button
                onClick={handleSeeAll}
                className="flex items-center gap-1 text-[10px] font-bold text-brand-600 uppercase tracking-widest hover:text-brand-700 transition-colors"
              >
                See All <i className="fas fa-chevron-right text-[8px]"></i>
              </button>
            </div>

            {connectedProfiles.length === 0 ? (
              <div className="py-12 text-center bg-gray-50/50 dark:bg-slate-900/40 rounded-[2rem] border border-dashed border-gray-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4 text-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                  <i className="fas fa-user-plus opacity-50"></i>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No connections yet</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {previewProfiles.map(p => (
                  <div key={p.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-slate-700 shadow-sm animate-fade-in-up">
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={p.avatarUrl || DEFAULT_AVATAR}
                        className="w-12 h-12 rounded-xl object-cover border border-gray-100 dark:border-slate-700 cursor-pointer"
                        alt=""
                        onClick={() => onViewProfile(p)}
                      />
                      <div className="min-w-0">
                        <h4
                          className="font-bold text-sm truncate cursor-pointer hover:text-brand-600 transition-colors"
                          onClick={() => onViewProfile(p)}
                        >
                          {p.fullName}
                        </h4>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-brand-600 text-white">
                              {p.role}
                            </span>
                            <span className="text-[9px] text-slate-400 flex items-center gap-1 font-medium">
                              <Icons.MapMarker /> {p.currentLocation}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px]">
                            <Icons.GradCap />
                            <span className="truncate">{p.currentStudies?.[0] || 'Educational Institution'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onChat(p)} className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center hover:bg-brand-100 transition shadow-sm">
                        <Icons.Chat />
                      </button>
                      <button onClick={() => setProfileToRemove(p)} className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-900 text-slate-400 flex items-center justify-center hover:text-red-500 transition shadow-sm">
                        <i className="fas fa-user-minus text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))}
                {totalConnections > 3 && (
                  <button
                    onClick={handleSeeAll}
                    className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-2xl border border-dashed border-brand-200 dark:border-slate-700 transition"
                  >
                    View all {totalConnections} connections
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Discovery Section (Always Visible on Main Screen) */}
          <section className="space-y-6 pt-4 border-t border-gray-100 dark:border-slate-800">
            <div className="px-2 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                  Discover {isExpertOrAdmin ? 'Students' : 'Uni Experts'}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Recommended for your journey</p>
              </div>
              <button
                onClick={() => setView(isExpertOrAdmin ? 'FIND_STUDENTS' : 'FIND')}
                className="flex items-center gap-1 text-[10px] font-bold text-brand-600 uppercase tracking-widest hover:text-brand-700 transition-colors"
              >
                More <i className="fas fa-chevron-right text-[8px]"></i>
              </button>
            </div>

            <div className="grid gap-3">
              {displayedSuggestions.map(p => {
                const isCurrentlyConnected = (user.connections || []).includes(p.id);
                return (
                  <div key={p.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-slate-700 shadow-sm animate-fade-in-up w-full max-w-full overflow-hidden">
                    <div className="flex items-center gap-4 min-w-0 pr-2">
                      <div className="relative flex-shrink-0">
                        <img
                          src={p.avatarUrl || DEFAULT_AVATAR}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-100 dark:border-slate-700 cursor-pointer"
                          alt=""
                          onClick={() => onViewProfile(p)}
                        />
                        {p.isSubscribed && <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 border-2 border-white dark:border-slate-800 rounded-full"></div>}
                      </div>
                      <div className="min-w-0">
                        <h4
                          className="font-bold text-sm truncate cursor-pointer hover:text-brand-600 transition-colors"
                          onClick={() => onViewProfile(p)}
                        >
                          {p.fullName}
                        </h4>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-brand-600 text-white flex-shrink-0">
                              {p.role}
                            </span>
                            <span className="text-[9px] text-slate-400 flex items-center gap-1 font-medium truncate">
                              <Icons.MapMarker /> {p.currentLocation}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] min-w-0">
                            <Icons.GradCap />
                            <span className="truncate">{p.currentStudies?.[0] || 'Educational Institution'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onToggleConnect(p.id)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-md ${isCurrentlyConnected ? 'bg-brand-50 text-brand-600' : 'bg-brand-600 text-white shadow-brand-500/20'}`}
                      >
                        {isCurrentlyConnected ? 'CONNECTED' : '+ Connect'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {hasMoreSuggestions && (
                <button onClick={() => setVisibleSuggestionsCount(prev => prev + 10)} className="w-full py-4 bg-white dark:bg-slate-800 text-brand-600 border border-brand-100 dark:border-slate-700 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-brand-50 transition">
                  Load More Suggestions
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Confirmation Popup - Centralized positioning regardless of screen state */}
      {profileToRemove && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md overscroll-none touch-none">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl animate-fade-in-up border border-gray-100 dark:border-slate-800 flex flex-col items-center gap-6 max-w-sm text-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-[2rem] flex items-center justify-center text-red-500 text-4xl">
              <i className="fas fa-user-minus"></i>
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-2xl uppercase">Disconnect?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Remove {profileToRemove.fullName} from your professional network?</p>
            </div>
            <div className="flex gap-3 w-full capitalize">
              <button
                onClick={() => setProfileToRemove(null)}
                className="flex-1 py-4 bg-gray-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoval}
                className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};




