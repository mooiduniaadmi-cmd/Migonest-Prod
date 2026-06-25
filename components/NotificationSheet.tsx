
import React, { useState, useEffect } from 'react';
import { AppNotification } from '../types';
import { Icons } from './Icons';

interface Props {
  notifications: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  onNotificationClick: (notif: AppNotification) => void;
}

export const NotificationSheet: React.FC<Props> = ({
  notifications,
  isOpen,
  onClose,
  onClear,
  onNotificationClick
}) => {
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Reset visible count when sheet opens/closes to maintain clean state
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setVisibleCount(10), 300); // Wait for animation
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const displayNotifications = notifications.slice(0, visibleCount);
  const hasMore = notifications.length > visibleCount;

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'WALLET': return <Icons.Money />;
      case 'ADMISSION': return <Icons.Admission />;
      case 'CHAT': return <Icons.Chat />;
      default: return <Icons.Bell />;
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 h-full shadow-2xl animate-slide-in-right flex flex-col">
        <div className="px-6 pb-6 pt-[calc(env(safe-area-inset-top,1rem)+1.5rem)] border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Notifications</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {notifications.filter(n => !n.read).length} Unread
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-700 text-slate-400">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-2xl mb-4">
                <Icons.Bell />
              </div>
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs">No new notifications for you right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-slate-700">
              {displayNotifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => onNotificationClick(notif)}
                  className={`p-5 flex gap-4 transition-all cursor-pointer group active:bg-gray-100 dark:active:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 ${notif.read ? 'opacity-70' : 'bg-brand-50/20 dark:bg-brand-900/5 border-l-4 border-brand-500'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110 ${notif.type === 'WALLET' ? 'bg-amber-50 text-amber-500' :
                    notif.type === 'ADMISSION' ? 'bg-brand-50 text-brand-600' :
                      'bg-gray-100 text-slate-500'
                    }`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-bold leading-tight truncate group-hover:text-brand-600 transition-colors">{notif.title}</h4>
                      <span className="text-[9px] text-slate-400 whitespace-nowrap ml-2">{formatTime(notif.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{notif.message.replace(/##RID:[a-zA-Z0-9-]+##/, '')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sticky Actions Container */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border-t border-gray-100 dark:border-slate-700 space-y-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          {hasMore && (
            <div className="space-y-2 animate-fade-in-up">
              <button
                onClick={() => setVisibleCount(prev => prev + 10)}
                className="w-full py-3 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition active:scale-95 shadow-lg shadow-brand-500/20"
              >
                Load More Notifications
              </button>
              <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest">
                Showing {displayNotifications.length} of {notifications.length}
              </p>
            </div>
          )}

          {notifications.length > 0 && (
            <button
              onClick={onClear}
              className="w-full text-xs font-black text-slate-400 hover:text-brand-600 uppercase tracking-widest transition py-2"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
