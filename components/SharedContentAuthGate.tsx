import React from 'react';

interface Props {
  onLogin: () => void;
  onSignup: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export const SharedContentAuthGate: React.FC<Props> = ({ onLogin, onSignup, isDark, toggleTheme }) => {
  const isPost = window.location.pathname.startsWith('/post/');
  const contentType = isPost ? 'post' : 'profile';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-200">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-400/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="z-10 w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl p-8 md:p-12 text-center border border-white/40 dark:border-slate-700/50 backdrop-blur-xl">
        <div 
          className="mb-8 relative cursor-pointer group" 
          onClick={() => window.location.href = '/'}
          title="Return to Landing Page"
        >
          <div className="w-24 h-24 bg-brand-50 dark:bg-slate-100 rounded-full flex items-center justify-center mx-auto shadow-inner group-hover:scale-105 transition-transform">
            <img src="/assets/Migonest_%20Logo_Icon.png" alt="Migonest" className="w-12 h-12 object-contain" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg">
            <i className="fas fa-lock text-slate-400 dark:text-slate-500 text-sm"></i>
          </div>
        </div>

        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
          Unlock Shared Content
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
          You've been invited to view a shared profile or post. Please log in or create an account to view it!
        </p>

        <div className="space-y-4 flex flex-col items-center w-full">
          <button
            onClick={onLogin}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-brand-600/30 flex items-center justify-center group"
          >
            Log In
            <i className="fas fa-arrow-right ml-3 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all"></i>
          </button>

          <div className="text-slate-400 dark:text-slate-500 font-medium text-sm uppercase tracking-wider py-1">
            or
          </div>

          <button
            onClick={onSignup}
            className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold py-4 rounded-2xl text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center"
          >
            Create Account
          </button>
        </div>
      </div>



      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-20 w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:scale-110 transition-transform z-20 border border-slate-100 dark:border-slate-700"
      >
        <i className={`fas ${isDark ? 'fa-sun text-amber-400' : 'fa-moon text-indigo-500'}`}></i>
      </button>

      {/* Close Button */}
      <button 
        onClick={() => window.location.href = '/'}
        className="absolute top-6 right-6 w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:scale-110 transition-transform z-20 border border-slate-100 dark:border-slate-700"
      >
        <i className="fas fa-times text-lg"></i>
      </button>

      {/* Footer Branding */}
      <div className="absolute bottom-8 left-0 right-0 text-center z-10">
        <img src="/assets/Migonest-Primary-Logo.png" alt="Migonest" className="h-6 w-auto object-contain mx-auto opacity-50 grayscale" />
      </div>
    </div>
  );
};
