import React, { useState } from 'react';
import { Profile, AppNotification, Post } from '../types';
import { DEFAULT_AVATAR } from '../services/api';
import { Icons } from './Icons';
import { NotificationSheet } from './NotificationSheet';
import { QuickProfileSheet } from './QuickProfileSheet';

interface Props {
  toggleTheme: () => void;
  isDark: boolean;
  currentUser: Profile;
  setView: (v: string) => void;
  notifications: AppNotification[];
  posts: Post[];
  onMarkAllRead: () => void;
  onNotificationClick: (notif: AppNotification) => void;
  onToggleConnect: (id: string) => void;
  onViewProfile: (p: Profile | string) => void;
  isNotifOpen?: boolean;
  setIsNotifOpen?: (val: boolean) => void;
  experts: Profile[];
  students: Profile[];
  onSearch: (query: string) => void;
  searchQuery: string;
  unreadMessageCount: number;
  onMarkNotificationsAsRead: () => void;
  currentView?: string;
}

export const Header: React.FC<Props & { isProfileSheetOpen?: boolean; setIsProfileSheetOpen?: (v: boolean) => void }> = ({
  toggleTheme, isDark, currentUser, setView, notifications, posts, onMarkAllRead, onNotificationClick, onToggleConnect, onViewProfile,
  isNotifOpen: propIsNotifOpen, setIsNotifOpen: propSetIsNotifOpen, experts, students, onSearch, searchQuery, unreadMessageCount, onMarkNotificationsAsRead,
  isProfileSheetOpen, setIsProfileSheetOpen, currentView
}) => {
  const [internalNotifOpen, setInternalNotifOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const isNotifOpen = propIsNotifOpen !== undefined ? propIsNotifOpen : internalNotifOpen;
  const setIsNotifOpen = propSetIsNotifOpen !== undefined ? propSetIsNotifOpen : setInternalNotifOpen;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <header className="sticky top-0 flex-none bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-slate-800 h-header-safe pt-safe px-safe z-50 transition-all duration-300 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div 
            className={`flex items-center gap-3 cursor-pointer group flex-shrink-0 lg:hidden active:scale-95 transition-all duration-300 ${isSearchFocused ? 'w-0 opacity-0 pointer-events-none overflow-hidden mr-0' : 'w-auto opacity-100 mr-2'}`} 
            onClick={() => {
              if (currentView === 'HOME') {
                const main = document.getElementById('main-scroll-container');
                if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                setView('HOME');
              }
            }}
          >
            <div className="flex items-center gap-2">
              <img src="/assets/Migonest_ Logo_Icon.png?v=5" alt="Migonest" className="h-7 w-auto object-contain dark:bg-slate-100 dark:rounded-lg dark:p-1 sm:hidden" />
              <img src="/assets/Migonest-Primary-Logo.png" alt="Migonest" className="h-7 w-auto object-contain dark:brightness-110 hidden sm:block" />
            </div>
          </div>

          <div className={`flex-1 relative transition-all duration-300 ${isSearchFocused ? 'max-w-xl' : 'max-w-md'}`}>
            {isSearchFocused ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setIsSearchFocused(false);
                  const inputEl = document.getElementById('navbar-search-input');
                  if (inputEl) {
                    (inputEl as HTMLInputElement).blur();
                  }
                  onSearch('');
                }}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-600 dark:text-brand-400 hover:text-brand-500 transition-all duration-300 z-10 flex items-center justify-center p-1 rounded-full hover:bg-gray-200/50 dark:hover:bg-slate-700/50 active:scale-90"
                aria-label="Back"
              >
                <i className="fas fa-arrow-left text-sm"></i>
              </button>
            ) : (
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            )}
            <input
              type="text"
              id="navbar-search-input"
              placeholder="Search people, countries, unis..."
              className="w-full bg-gray-100/50 dark:bg-slate-900/50 pl-11 pr-10 py-2.5 rounded-2xl border-none outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />
            {searchQuery && (
              <button
                onClick={() => onSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <i className="fas fa-times-circle"></i>
              </button>
            )}
          </div>
          <div className="flex items-center gap-0.5 sm:gap-2">
            <button
              onClick={() => {
                setIsNotifOpen(true);
                onMarkNotificationsAsRead();
              }}
              className="group relative p-2 rounded-xl text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-700 transition-all"
              aria-label="Notifications"
            >
              <div className={`${unreadCount > 0 ? 'animate-wiggle' : ''}`}>
                <Icons.Bell />
              </div>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setView('MESSAGES')}
              className="group relative p-2 rounded-xl text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-700 transition-all"
              aria-label="Messages"
            >
              <div className={`${unreadMessageCount > 0 ? 'animate-wiggle' : ''}`}>
                <Icons.Chat />
              </div>
              {unreadMessageCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              )}
            </button>
            <div className="hidden sm:block h-6 w-[1px] bg-gray-100 dark:bg-slate-700 mx-1"></div>
            <button onClick={toggleTheme} className="p-2 rounded-xl text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-700 transition-all">{isDark ? <Icons.Sun /> : <Icons.Moon />}</button>
            <button onClick={() => setIsProfileSheetOpen?.(true)} className="w-9 h-9 rounded-xl overflow-hidden border-2 border-brand-100 dark:border-slate-700 shadow-sm active:scale-90 transition-transform ml-1">
              <img src={currentUser.avatarUrl || DEFAULT_AVATAR} className="w-full h-full object-cover" alt="Profile" />
            </button>
          </div>
        </div>
      </header>
      <NotificationSheet isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} notifications={notifications} onClear={onMarkAllRead} onNotificationClick={onNotificationClick} />
    </>
  );
};