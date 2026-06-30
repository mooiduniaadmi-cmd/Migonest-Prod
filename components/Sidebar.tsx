
import React from 'react';
import { Icons } from './Icons';
import { Profile } from '../types';
import { DEFAULT_AVATAR } from '../services/api';

interface SidebarProps {
  currentView: string;
  setView: (v: string) => void;
  user: Profile;
  hasActiveAdmission: boolean;
  isIOSNative?: boolean;
}

const NavItem = ({ icon, label, view, active, onClick }: { icon: React.ReactNode, label: string, view: string, active: boolean, onClick: (v: string) => void }) => (
  <button
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Sidebar Click:', view);
      onClick(view);
    }}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
      ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
      : 'text-slate-500 dark:text-slate-400 hover:bg-brand-50 dark:hover:bg-slate-800 hover:text-brand-600'
      }`}
  >
    <span className="text-lg w-5 flex justify-center">{icon}</span>
    <span className="font-bold text-sm tracking-tight">{label}</span>
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, user, hasActiveAdmission, isIOSNative }) => {
  const isExpert = user.role === 'EXPERT';
  const isAdmin = user.role === 'ADMIN';

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 h-full z-20 overflow-hidden">
      {/* Locked Top Logo */}
      <div className="flex-none p-6 pb-2">
        <div 
          className="flex items-center gap-3 cursor-pointer active:scale-95 transition-transform" 
          onClick={() => {
            if (currentView === 'HOME') {
              const main = document.getElementById('main-scroll-container');
              if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setView('HOME');
            }
          }}
        >
          <img src="/assets/Migonest-Primary-Logo.png" alt="Migonest" className="h-9 w-auto object-contain dark:brightness-110" />
        </div>
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4 space-y-1 min-h-0">
        <NavItem icon={<Icons.Home />} label="Home" view="HOME" active={currentView === 'HOME'} onClick={setView} />
        <NavItem icon={<Icons.Admission />} label="Admission" view="ADMISSION" active={currentView === 'ADMISSION'} onClick={setView} />

        <NavItem
          icon={<Icons.Search />}
          label="Discover"
          view={(isExpert || isAdmin) ? 'FIND_STUDENTS' : 'FIND'}
          active={currentView === ((isExpert || isAdmin) ? 'FIND_STUDENTS' : 'FIND')}
          onClick={setView}
        />

        <NavItem icon={<Icons.User />} label="Connects" view="CONNECTIONS" active={currentView === 'CONNECTIONS'} onClick={setView} />

        {isIOSNative === false && (
          <NavItem icon={<Icons.Money />} label="Wallet" view="WALLET" active={currentView === 'WALLET'} onClick={setView} />
        )}

        {isAdmin && (
          <>
            <NavItem
              icon={<i className="fas fa-user-check"></i>}
              label="Expert Reviews"
              view="EXPERT_REVIEWS"
              active={currentView === 'EXPERT_REVIEWS'}
              onClick={setView}
            />
            <NavItem
              icon={<Icons.Money />}
              label="Withdrawals"
              view="ADMIN_WITHDRAWALS"
              active={currentView === 'ADMIN_WITHDRAWALS'}
              onClick={setView}
            />
            <NavItem
              icon={<i className="fas fa-chart-line"></i>}
              label="Analytics"
              view="ADMIN_ANALYTICS"
              active={currentView === 'ADMIN_ANALYTICS'}
              onClick={setView}
            />
          </>
        )}
      </nav>

      {/* Locked Bottom Profile */}
      <div className="flex-none mt-auto p-6 pt-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
        <button
          onClick={() => setView('PROFILE')}
          className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${currentView === 'PROFILE' ? 'bg-brand-50 dark:bg-slate-800' : ''
            }`}
        >
          <img src={user.avatarUrl || DEFAULT_AVATAR} className="w-10 h-10 rounded-xl object-cover shadow-sm border border-gray-100 dark:border-slate-700" alt="" />
          <div className="flex-1 text-left overflow-hidden">
            <p className="text-xs font-bold truncate text-slate-900 dark:text-white">{user.fullName}</p>
            <p className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">{user.role}</p>
          </div>
        </button>
      </div>
    </aside>
  );
};
