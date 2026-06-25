import React, { useState } from 'react';
import { Profile, ServiceRequest } from '../types';
import { DEFAULT_AVATAR } from '../services/api';

interface Props {
  user: Profile;
  requests: ServiceRequest[];
  onBack: () => void;
  onViewFullRoadmap: (requestId: string) => void;
  onViewProfile: (p: Profile | string) => void;
  experts: Profile[];
  students: Profile[];
}

export const JourneyHistoryView: React.FC<Props> = ({ user, requests, onBack, onViewFullRoadmap, onViewProfile, experts, students }) => {
  const [visibleCount, setVisibleCount] = useState(12);
  const isExpert = user.role === 'EXPERT' || user.role === 'ADMIN';

  const displayedHistory = requests.slice(0, visibleCount);
  const hasMore = requests.length > visibleCount;

  return (
    <div className="pb-24 space-y-8 animate-fade-in-up">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            onBack();
          }}
          className="p-2 -ml-2 text-slate-500 hover:text-brand-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <i className="fas fa-arrow-left text-lg"></i>
        </button>
        <div>
          <h2 className="text-2xl font-bold">Journey History</h2>
          <p className="text-xs text-slate-500 font-medium">All completed and successful admissions</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No completed journeys found.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayedHistory.map(req => {
              const allUsers = [...experts, ...students];
              const partnerProfile = allUsers.find(p => p.id === (isExpert ? req.studentId : req.expertId));

              return (
                <div key={req.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all animate-fade-in-up">
                  <div className="flex items-center gap-4 mb-6">
                    <img
                      src={(isExpert ? req.studentAvatarUrl : req.expertAvatarUrl) || DEFAULT_AVATAR}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-brand-50 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                      alt=""
                      onClick={() => onViewProfile(partnerProfile || (isExpert ? req.studentId : req.expertId))}
                    />
                    <div className="min-w-0 flex-1">
                      <h4
                        className="font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-brand-600 transition-colors hover:underline"
                        onClick={() => onViewProfile(partnerProfile || (isExpert ? req.studentId : req.expertId))}
                      >
                        {isExpert ? req.studentFullName : req.expertFullName}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Completed {req.date}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${req.visaStatus === 'DENIED' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                      <i className={`fas ${req.visaStatus === 'DENIED' ? 'fa-circle-xmark' : 'fa-check-circle'}`}></i>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-widest">Outcome</span>
                      <span className={`font-black uppercase tracking-wider ${req.visaStatus === 'DENIED' ? 'text-red-600' : 'text-green-600'}`}>
                        {req.visaStatus === 'DENIED' ? 'Visa Denied' : 'Admitted'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-widest">Fee</span>
                      <span className="text-slate-700 dark:text-slate-300 font-black">${req.fee}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      onViewFullRoadmap(req.id);
                    }}
                    className="w-full py-4 bg-brand-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-brand-500/20 active:scale-95 transition"
                  >
                    View Full Roadmap
                  </button>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="pt-8 flex flex-col items-center gap-3">
              <button
                onClick={() => setVisibleCount(prev => prev + 12)}
                className="px-10 py-4 bg-brand-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95"
              >
                Load More History
              </button>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Showing {displayedHistory.length} of {requests.length} journeys
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};