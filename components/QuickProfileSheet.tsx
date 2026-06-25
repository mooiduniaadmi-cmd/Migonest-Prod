
import React, { useEffect, useMemo, useState } from 'react';
import { Profile, Post } from '../types';
import { DEFAULT_AVATAR } from '../services/api';
import { Icons } from './Icons';
import { ShareProfileModal } from './ShareProfileModal';

interface Props {
  user: Profile;
  posts: Post[];
  isOpen: boolean;
  onClose: () => void;
  setView: (v: string) => void;
  onToggleConnect: (id: string) => void;
  onViewProfile: (p: Profile | string) => void;
  experts: Profile[];
  students: Profile[];
  recommended: Profile[];
}

export const QuickProfileSheet: React.FC<Props> = ({ user, posts, isOpen, onClose, setView, onToggleConnect, onViewProfile, experts, students, recommended }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const isExpertOrAdmin = user.role === 'EXPERT' || user.role === 'ADMIN';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dynamic suggestions based on user role, excluding already connected and admins.
  const dynamicSuggestions = useMemo(() => {
    return recommended.slice(0, 2).map(p => ({
      id: p.id,
      name: p.fullName,
      role: p.role === 'EXPERT' ? 'Expert' : 'Student',
      country: p.currentLocation || 'N/A',
      avatar: p.avatarUrl,
      fullProfile: p
    }));
  }, [recommended, isMobile]);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (mainElement) mainElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      if (mainElement) mainElement.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'unset';
      if (mainElement) mainElement.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSuggestionClick = (suggestion: any) => {
    onClose();
    if (suggestion.fullProfile) {
      onViewProfile(suggestion.fullProfile);
      return;
    }

    const authorId = suggestion.id;
    if (authorId === user.id) {
      setView('PROFILE');
      return;
    }

    const all = [...experts, ...students];
    const found = all.find(p => p.id === authorId);
    if (found) {
      onViewProfile(found);
    }
  };

  const handleMainProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(); // Ensure side menu vanishes first
    setView('PROFILE');
  };

  const handleDiscoverNavigation = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetView = isExpertOrAdmin ? 'FIND_STUDENTS' : 'FIND';
    onClose();
    setView(targetView);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 h-[calc(100dvh-1rem)] m-2 rounded-[3.5rem] shadow-2xl animate-slide-in-right flex flex-col overflow-hidden">
        {/* Header */}
        <div className="pt-safe border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 sticky top-0 z-10">
          <div className="px-6 h-24 flex justify-between items-center pt-6">
            <h3 className="text-xl font-black">Quick Profile</h3>
            <div className="flex gap-2">
              <button onClick={() => setIsShareModalOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 transition active:scale-95" aria-label="Share">
                <i className="fas fa-share-alt"></i>
              </button>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-700 text-slate-400 hover:bg-gray-100 transition active:scale-95">
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="p-6 space-y-6 animate-fade-in-up">
            {/* User Info Card */}
            <div className="p-5 bg-brand-50 dark:bg-brand-900/10 rounded-[2.5rem] border border-brand-100 dark:border-brand-900/30 space-y-5">
              <div className="flex items-center gap-4">
                <img
                  src={user.avatarUrl || DEFAULT_AVATAR}
                  className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-white dark:border-slate-700 cursor-pointer"
                  alt=""
                  onClick={handleMainProfileClick}
                />
                <div className="flex-1 overflow-hidden text-left">
                  <h4
                    className="font-black text-slate-900 dark:text-white truncate cursor-pointer hover:text-brand-600 transition-colors"
                    onClick={handleMainProfileClick}
                  >
                    {user.fullName}
                  </h4>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-black bg-brand-600 text-white px-2 py-0.5 rounded uppercase tracking-widest leading-none w-fit mt-0.5">{user.role}</span>
                    <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 font-bold">
                      <Icons.MapMarker /> {user.currentLocation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 pt-4 border-t border-brand-100 dark:border-brand-900/40">
                <StatItem icon={<i className="fas fa-home"></i>} label="Nationality" value={user.homeCountries?.[0] || 'N/A'} />
                <StatItem icon={<Icons.GradCap />} label="Qualification" value={user.highestQualifications?.[0] || 'N/A'} />
                <StatItem icon={<Icons.Globe />} label={user.role === 'STUDENT' ? "Target" : "Expertise"} value={user.targetCountries?.[0] || 'N/A'} />
                <StatItem icon={<i className="fas fa-scroll"></i>} label="Degree" value={user.targetDegree?.[0] || 'N/A'} />
                <StatItem icon={<i className="fas fa-language"></i>} label="Language" value={user.languages?.[0] || 'N/A'} />
              </div>

              <button
                onClick={handleMainProfileClick}
                className="w-full py-2.5 bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-brand-100 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
              >
                View Full Profile
              </button>
            </div>

            {/* Suggestions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-lg">Recommended</h4>
                <button
                  onClick={handleDiscoverNavigation}
                  className="text-[10px] font-bold text-brand-600 uppercase tracking-widest"
                >
                  See All
                </button>
              </div>
              <div className="space-y-3">
                {dynamicSuggestions.map((suggestion, i) => {
                  const isConnected = (user.connections || []).includes(suggestion.id);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition-all"
                    >
                      <img
                        src={suggestion.avatar || DEFAULT_AVATAR}
                        className="w-10 h-10 rounded-xl object-cover cursor-pointer border border-gray-100 dark:border-slate-700 shadow-sm"
                        alt=""
                        onClick={() => handleSuggestionClick(suggestion)}
                      />
                      <div className="flex-1 overflow-hidden text-left">
                        <span
                          className="text-sm font-bold text-slate-700 dark:text-slate-300 block truncate cursor-pointer hover:text-brand-600 transition-colors"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black bg-brand-600 text-white px-2 py-0.5 rounded uppercase tracking-widest leading-none inline-block">{suggestion.role}</span>
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-[10px] text-slate-400 truncate font-medium">{suggestion.country}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleConnect(suggestion.id); }}
                        className={`text-[9px] font-bold px-3 py-1.5 rounded-full border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 transition active:scale-95 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 ${isConnected ? 'text-brand-600 border-brand-200' : ''}`}
                      >
                        {isConnected ? 'Connected' : '+ Connect'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTA Banner */}
            <div className="bg-gradient-to-br from-brand-600 to-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-brand-500/20 relative overflow-hidden text-left">
              <div className="relative z-10">
                <h4 className="font-bold text-lg mb-2 leading-tight">
                  {isExpertOrAdmin ? 'Build your Student Pipeline' : 'Direct Expert Mentorship'}
                </h4>
                <p className="text-xs text-indigo-50 mb-6 leading-relaxed">
                  {isExpertOrAdmin ? 'Connect with students looking for guidance.' : 'Vetted experts who have lived in your target countries.'}
                </p>
                <button
                  onClick={handleDiscoverNavigation}
                  className="w-full py-3 bg-white text-brand-600 font-bold rounded-xl text-sm hover:bg-indigo-50 transition active:scale-95 shadow-lg"
                >
                  {isExpertOrAdmin ? 'Discover Students' : 'Find Your Expert'}
                </button>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-40 -mt-40 blur-2xl"></div>
            </div>
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-gray-100 dark:border-slate-700">
          <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest opacity-60">Migonest v1.0.4 • Professional Network</p>
        </div>
      </div>
      <ShareProfileModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} user={user} />
    </div>
  );
};

const StatItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="text-left">
    <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
      <span className="text-[10px]">{icon}</span>
      <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate leading-tight">{value}</p>
  </div>
);
