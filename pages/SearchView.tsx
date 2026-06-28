
import React, { useState, useEffect, useRef } from 'react';
import { Profile } from '../types';
import { Icons } from '../components/Icons';
import { DEFAULT_AVATAR } from '../services/api';
import { SERVICE_FEE } from '../constants';
import { openExternalUrl } from '../utils/openExternalUrl';

interface Props {
    results: { experts: Profile[], students: Profile[] };
    query: string;
    user: Profile;
    onHire: (expert: Profile) => void;
    onChat: (p: Profile) => void;
    onToggleConnect: (id: string) => void;
    onViewProfile: (p: Profile | string) => void;
    searchExpertsPage: number;
    searchStudentsPage: number;
    hasMoreSearch: { experts: boolean, students: boolean };
    onLoadMoreSearch: (role: 'EXPERT' | 'STUDENT') => void;
    isIOSNative?: boolean;
    isSearching?: boolean;
    isFetchingMoreSearch?: boolean;
}


export const SearchView: React.FC<Props> = ({
    results, query, user, onHire, onChat, onToggleConnect, onViewProfile,
    searchExpertsPage, searchStudentsPage, hasMoreSearch, isSearching, isFetchingMoreSearch, onLoadMoreSearch, isIOSNative
}) => {
    const expertObserverTarget = useRef<HTMLDivElement>(null);
    const studentObserverTarget = useRef<HTMLDivElement>(null);

    // Infinite scroll logic for experts
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMoreSearch.experts && !isFetchingMoreSearch) {
                    onLoadMoreSearch('EXPERT');
                }
            },
            { 
              threshold: 0.1, 
              root: document.getElementById('main-scroll-container') 
            }
        );

        if (expertObserverTarget.current) {
            observer.observe(expertObserverTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMoreSearch.experts, isFetchingMoreSearch, onLoadMoreSearch]);

    // Infinite scroll logic for students
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMoreSearch.students && !isFetchingMoreSearch) {
                    onLoadMoreSearch('STUDENT');
                }
            },
            { 
              threshold: 0.1, 
              root: document.getElementById('main-scroll-container') 
            }
        );

        if (studentObserverTarget.current) {
            observer.observe(studentObserverTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMoreSearch.students, isFetchingMoreSearch, onLoadMoreSearch]);

    const hasResults = results.experts.length > 0 || results.students.length > 0;

    return (
        <div className="pb-24 space-y-8 animate-fade-in text-left">
            <div className="px-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    {query ? `Search results for "${query}"` : 'Global Search'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-slate-500 font-medium">
                        {hasResults
                            ? `Found ${results.experts.length} experts and ${results.students.length} students`
                            : query && !isSearching ? 'No results found matching your search.' : !query ? 'Type something in the search bar above to begin.' : ''}
                    </p>
                    {isSearching && (
                        <div className="w-3 h-3 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                    )}
                </div>
            </div>

            {isSearching && results.experts.length === 0 && results.students.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Searching for matchings...</p>
                </div>
            )}

            {!hasResults && query && !isSearching && (
                <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-slate-700">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-3xl text-slate-300 mx-auto mb-6">
                        <i className="fas fa-search"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">No matches found</h3>
                    <p className="text-slate-500 mt-2 max-w-xs mx-auto">Try searching for a different name, country, or university.</p>
                </div>
            )}

            {results.experts.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-brand-50 dark:bg-brand-900/20 rounded-xl flex items-center justify-center text-brand-600">
                            <i className="fas fa-user-tie text-xs"></i>
                        </div>
                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Uni Experts</h3>
                    </div>
                    <div className="grid gap-6">
                        {results.experts.map(expert => {
                            const isConnected = user.connections?.includes(expert.id) || false;
                            return (
                                <div key={expert.id} className="w-full max-w-full overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-5 hover:shadow-xl hover:border-brand-200 transition-all group animate-fade-in-up">
                                    <div className="flex gap-5">
                                        <img
                                            src={expert.avatarUrl || DEFAULT_AVATAR}
                                            alt={expert.fullName}
                                            className="w-16 h-16 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity shadow-sm border border-gray-100 dark:border-slate-700"
                                            onClick={() => onViewProfile(expert)}
                                        />
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0">
                                                    <h4
                                                        className="font-bold text-lg cursor-pointer hover:text-brand-600 transition-colors truncate"
                                                        onClick={() => onViewProfile(expert)}
                                                    >
                                                        {expert.fullName}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-black bg-brand-600 text-white px-2 py-0.5 rounded uppercase tracking-widest">Expert</span>
                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                                            <Icons.MapMarker /> {expert.currentLocation || 'Global'}
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

                                            <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                                <Icons.GradCap />
                                                <span className="font-bold truncate">{expert.currentStudies?.[0] || 'Educational Institution'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-brand-50 dark:bg-brand-900/10 p-4 rounded-2xl border border-brand-100 dark:border-brand-900/20">
                                        <p className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-2">Expertise Countries:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {expert.targetCountries?.length ? expert.targetCountries.map(tag => (
                                                <span key={tag} className="text-[10px] font-bold px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-brand-100 dark:border-brand-800 shadow-sm">{tag}</span>
                                            )) : <span className="text-[10px] text-slate-400 italic">No countries specified</span>}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-slate-700/50">
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
                                                className="px-5 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-2"
                                            >
                                                <Icons.Chat /> Chat
                                            </button>
                                            {isIOSNative === false && (
                                                <button
                                                  onClick={() => onHire(expert)}
                                                  className="px-6 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition active:scale-95"
                                                >
                                                  Hire Expert
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {hasMoreSearch.experts && (
                        <div ref={expertObserverTarget} className="pt-8 flex flex-col items-center gap-3">
                            {isFetchingMoreSearch ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Loading experts...</p>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => onLoadMoreSearch('EXPERT')}
                                        className="px-10 py-4 bg-brand-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95"
                                    >
                                        Load More Experts
                                    </button>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        Showing {results.experts.length} results
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </section>
            )}

            {results.students.length > 0 && (
                <section className="space-y-4 pt-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600">
                            <i className="fas fa-user-graduate text-xs"></i>
                        </div>
                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Students</h3>
                    </div>
                    <div className="grid gap-6">
                        {results.students.map(student => {
                            const isConnected = user.connections?.includes(student.id) || false;
                            return (
                                <div key={student.id} className="w-full max-w-full overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-5 hover:shadow-xl hover:border-brand-200 transition-all group animate-fade-in-up">
                                    <div className="flex gap-5">
                                        <img
                                            src={student.avatarUrl || DEFAULT_AVATAR}
                                            className="w-16 h-16 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity shadow-sm border border-gray-100 dark:border-slate-700"
                                            alt={student.fullName}
                                            onClick={() => onViewProfile(student)}
                                        />
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0">
                                                    <h4
                                                        className="font-bold text-lg cursor-pointer hover:text-brand-600 transition-colors truncate"
                                                        onClick={() => onViewProfile(student)}
                                                    >
                                                        {student.fullName}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-black bg-brand-600 text-white px-2 py-0.5 rounded uppercase tracking-widest">Student</span>
                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                                            <Icons.MapMarker /> {student.homeCountries?.[0] || 'International'}
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

                                            <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                                <Icons.GradCap />
                                                <span className="font-bold truncate">{student.currentStudies?.[0] || 'Educational Institution'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
                                        <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Countries to Apply:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {student.targetCountries?.length ? student.targetCountries.map(tag => (
                                                <span key={tag} className="text-[10px] font-bold px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm">{tag}</span>
                                            )) : <span className="text-[10px] text-slate-400 italic">No countries specified</span>}
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

                    {hasMoreSearch.students && (
                        <div ref={studentObserverTarget} className="pt-8 flex flex-col items-center gap-3">
                            {isFetchingMoreSearch ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Loading students...</p>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => onLoadMoreSearch('STUDENT')}
                                        className="px-10 py-4 bg-brand-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95"
                                    >
                                        Load More Students
                                    </button>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        Showing {results.students.length} results
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};
