
import React from 'react';
import { Icons } from './Icons';

interface BottomNavProps {
  setView: (v: string) => void;
  currentView: string;
  role: string;
  hasActiveAdmission?: boolean;
}

const NavBtn = ({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all relative ${active ? 'text-brand-600 scale-110' : 'text-slate-400 hover:text-slate-600'
      }`}
  >
    <span className="text-xl">{icon}</span>
    <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
    {badge ? (
      <span className="absolute top-0 right-2 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 animate-pulse">
        {badge}
      </span>
    ) : null}
  </button>
);

export const BottomNav: React.FC<BottomNavProps> = ({ setView, currentView, role, hasActiveAdmission }) => {
  const isExpert = role === 'EXPERT';
  const isAdmin = role === 'ADMIN';
  const discoverView = (isExpert || isAdmin) ? 'FIND_STUDENTS' : 'FIND';

  return (
    <>
      {/* Physical Spacer to prevent content being hidden under nav */}
      <div className="lg:hidden h-[calc(4rem+env(safe-area-inset-bottom,20px))]" />

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        {/* The visible bar */}
        <div className="relative bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 pb-safe shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)]">
          <div className="flex justify-around items-center h-16 max-w-3xl mx-auto px-2">
            <NavBtn
              icon={<Icons.Home />}
              label="Home"
              active={currentView === 'HOME'}
              onClick={() => setView('HOME')}
            />

            <NavBtn
              icon={<Icons.Admission />}
              label="Admission"
              active={currentView === 'ADMISSION'}
              onClick={() => setView('ADMISSION')}
            />

            <NavBtn
              icon={<Icons.Globe />}
              label="Discover"
              active={currentView === discoverView}
              onClick={() => setView(discoverView)}
            />

            <NavBtn
              icon={<Icons.Users />}
              label="Connect"
              active={currentView === 'CONNECTIONS'}
              onClick={() => setView('CONNECTIONS')}
            />

            <NavBtn
              icon={<Icons.User />}
              label="Profile"
              active={currentView === 'PROFILE'}
              onClick={() => setView('PROFILE')}
            />
          </div>

          {/* The "Nuclear" Background Extension - extra layer to cover any gaps below bottom-0 */}
          <div className="absolute top-full left-0 right-0 h-[200px] bg-white dark:bg-slate-800" />
        </div>
      </div>
    </>
  );
};
