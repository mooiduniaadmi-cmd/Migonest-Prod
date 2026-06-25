
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExpertApplication, Profile } from '../types';
import { Icons } from '../components/Icons';
import { api, DEFAULT_AVATAR } from '../services/api';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
interface Props {
  applications: ExpertApplication[];
  onReview: (appId: string, status: 'APPROVED' | 'REJECTED') => Promise<void>;
  onBack: () => void;
  onViewProfile: (p: Profile | string) => void;
  experts: Profile[];
  students: Profile[];
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: (status: string) => void;
}

const ALL_COUNTRIES = [
  // ... (omitted for brevity in instruction, but I'll keep the full list in replacement)
  "Afghanistan", "Albania", "Algeria", "Andorra", "Andola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Holy See", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Mainland China", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Trkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan",
  "Vanuatu", "Venezuela", "Vietnam",
  "Yemen", "Zambia", "Zimbabwe"
];

export const ExpertReviewsView: React.FC<Props> = ({ applications, onReview, onBack, onViewProfile, experts, students, hasMore, isFetchingMore, onLoadMore }) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [reviewSearch, setReviewSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [selectedApp, setSelectedApp] = useState<ExpertApplication | null>(null);
  const [confirmState, setConfirmState] = useState<{ status: 'APPROVED' | 'REJECTED'; app: ExpertApplication } | null>(null);
  const [downloadingMsg, setDownloadingMsg] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    if (selectedApp || confirmState) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedApp, confirmState]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isCountryDropdownOpen && !target.closest('.country-search-container')) {
        setIsCountryDropdownOpen(false);
        setCountrySearchQuery('');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCountryDropdownOpen]);

  const filteredCountriesForFilter = useMemo(() => {
    if (!countrySearchQuery) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(c => c.toLowerCase().includes(countrySearchQuery.toLowerCase()));
  }, [countrySearchQuery]);

  const filteredApps = useMemo(() => {
    let result = applications.filter(app => app.status === activeStatusTab);

    if (countryFilter) {
      result = result.filter(app => {
        const assisted = app.data.formData?.assistedCountries || app.data.assistedCountries;
        return assisted?.toLowerCase().includes(countryFilter.toLowerCase());
      });
    }

    if (reviewSearch) {
      const term = reviewSearch.toLowerCase();
      result = result.filter(app =>
        app.studentName.toLowerCase().includes(term) ||
        app.studentId.toLowerCase().includes(term)
      );
    }

    result = [...result].sort((a, b) => {
      return dateFilter === 'NEWEST' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
    });

    return result;
  }, [applications, countryFilter, dateFilter, reviewSearch, activeStatusTab]);

  const displayedApps = filteredApps;

  const handleReviewAction = (status: 'APPROVED' | 'REJECTED') => {
    if (selectedApp) {
      setConfirmState({ status, app: selectedApp });
    }
  };

  const finalizeReview = async () => {
    if (confirmState) {
      const { app, status } = confirmState;
      setIsSubmittingReview(true);

      try {
        await onReview(app.id, status);

        setConfirmState(null);
        setReviewSuccess(`${app.studentName} has been ${status === 'APPROVED' ? 'approved' : 'rejected'}.`);

        if (status === 'APPROVED') {
          setActiveStatusTab('APPROVED');
          setSelectedApp(null);
        } else if (status === 'REJECTED') {
          setActiveStatusTab('REJECTED');
          setSelectedApp(null);
        }

        setTimeout(() => {
          setReviewSuccess(null);
        }, 3000);
      } catch (err) {
        console.error('Failed to finalize review:', err);
        alert('Failed to process review. Please try again.');
        // Do not close confirmState on error so user can retry
      } finally {
        setIsSubmittingReview(false);
      }
    }
  };

  const handleDownload = async (doc: any) => {
    setDownloadingMsg(`Preparing ${doc.name}...`);
    try {
      const isDataOrBlob = doc.url.startsWith('data:') || doc.url.startsWith('blob:');
      
      const runFallbackDownload = (url: string) => {
        if (isDataOrBlob) {
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', doc.name);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          window.open(url, '_blank');
        }
      };

      if (isDataOrBlob) {
        runFallbackDownload(doc.url);
      } else {
        // More robust bucket detection
        let bucket = 'documents';
        const bucketMatch = doc.url.match(/\/storage\/v1\/object\/(?:authenticated|public)\/([^\/]+)\//);
        if (bucketMatch) bucket = bucketMatch[1];

        // Fetch signed URL to bypass RLS/Auth issues for admins
        const signedUrl = await api.getSignedUrl(bucket, doc.url);
        
        if (Capacitor.isNativePlatform()) {
          try {
            await Browser.open({ url: signedUrl });
          } catch (nativeErr) {
            console.warn("[Download] Capacitor browser failed, falling back...", nativeErr);
            runFallbackDownload(signedUrl);
          }
        } else {
          runFallbackDownload(signedUrl);
        }
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate download link. Please try again.');
    } finally {
      setTimeout(() => setDownloadingMsg(null), 2000);
    }
  };

  const handleUserClick = (id: string) => {
    const allUsers = [...experts, ...students];
    const found = allUsers.find(u => u.id === id);
    if (found) onViewProfile(found);
  };

  const switchTab = (tab: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    setActiveStatusTab(tab);
    setVisibleCount(10); // Reset pagination on tab switch
  };

  return (
    <div className="pb-24 space-y-6 relative">
      {downloadingMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in-up flex items-center gap-2">
          <i className="fas fa-file-download text-brand-400"></i> {downloadingMsg}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-slate-500 hover:text-brand-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
          aria-label="Go back to profile"
        >
          <i className="fas fa-arrow-left text-lg"></i>
        </button>
        <h2 className="text-2xl font-bold">Expert Applications</h2>
      </div>

      {reviewSuccess && (
        <div className="bg-green-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in-up mb-6">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <i className="fas fa-check"></i>
          </div>
          <p className="font-bold text-sm tracking-tight">{reviewSuccess}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-2 px-1">
        <button
          onClick={() => switchTab('PENDING')}
          className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeStatusTab === 'PENDING' ? 'bg-brand-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-brand-600'}`}
        >
          Pending
        </button>
        <button
          onClick={() => switchTab('APPROVED')}
          className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeStatusTab === 'APPROVED' ? 'bg-green-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-green-600'}`}
        >
          Accepted
        </button>
        <button
          onClick={() => switchTab('REJECTED')}
          className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeStatusTab === 'REJECTED' ? 'bg-red-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-red-600'}`}
        >
          Rejected
        </button>
      </div>

      <section className="bg-white dark:bg-slate-800 rounded-3xl p-3 sm:p-5 lg:p-6 shadow-sm border border-brand-200 dark:border-brand-900/50 animate-fade-in-up overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Search Applications</p>
              <div className="relative group">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                <input
                  type="text"
                  placeholder="Student Name..."
                  value={reviewSearch}
                  onChange={(e) => {
                    setReviewSearch(e.target.value);
                    setVisibleCount(10);
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5 relative country-search-container">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Country</p>
              <div className="relative group">
                <i className="fas fa-filter absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                <input
                  type="text"
                  placeholder="All Countries"
                  readOnly={!isCountryDropdownOpen}
                  value={isCountryDropdownOpen ? countrySearchQuery : countryFilter}
                  onFocus={() => setIsCountryDropdownOpen(true)}
                  onChange={(e) => setCountrySearchQuery(e.target.value)}
                  className={`w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-slate-900 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer ${countryFilter ? 'border-brand-300 ring-2 ring-brand-500/10' : 'border-gray-100 dark:border-slate-700'}`}
                />
                {countryFilter && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setCountryFilter(''); setCountrySearchQuery(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500"
                  >
                    <i className="fas fa-times-circle"></i>
                  </button>
                )}
              </div>
              {isCountryDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-2xl z-[150] overflow-hidden animate-fade-in-up">
                  <div className="max-h-60 overflow-y-auto scrollbar-hide">
                    {filteredCountriesForFilter.length === 0 ? (
                      <div className="p-4 text-xs text-slate-400 text-center italic">No countries found</div>
                    ) : (
                      filteredCountriesForFilter.map(c => (
                        <div
                          key={c}
                          onClick={() => {
                            setCountryFilter(countryFilter === c ? '' : c);
                            setIsCountryDropdownOpen(false);
                            setCountrySearchQuery('');
                            setVisibleCount(10);
                          }}
                          className={`p-4 text-xs font-bold transition-all cursor-pointer border-b last:border-0 ${countryFilter === c ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                        >
                          {c}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Sort By Date</p>
              <div className="relative group">
                <i className="fas fa-calendar absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value as any);
                    setVisibleCount(10);
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 appearance-none transition-all cursor-pointer"
                >
                  <option value="NEWEST">Newest First</option>
                  <option value="OLDEST">Oldest First</option>
                </select>
              </div>
            </div>

            <div className={`h-[46px] rounded-xl flex items-center justify-center shadow-lg border-2 ${activeStatusTab === 'PENDING' ? 'bg-brand-600 border-brand-500 shadow-brand-500/20' : activeStatusTab === 'APPROVED' ? 'bg-green-600 border-green-500 shadow-green-500/20' : 'bg-red-600 border-red-500 shadow-red-500/20'}`}>
              <span className="text-[10px] font-black text-white uppercase tracking-widest px-4">
                {filteredApps.length} {activeStatusTab}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {displayedApps.map(app => (
            <div key={app.id} className="p-4 sm:p-5 bg-gray-50 dark:bg-slate-900/30 rounded-[2rem] border border-gray-100 dark:border-slate-700/50 group hover:border-brand-400 transition-all overflow-hidden">
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] xl:items-center gap-4 lg:gap-6">
                {/* Student Identity */}
                <div className="flex items-center gap-5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={app.studentAvatarUrl || DEFAULT_AVATAR}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-md cursor-pointer hover:opacity-80 transition-opacity"
                      alt=""
                      onClick={() => handleUserClick(app.studentId)}
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className="font-black text-base text-slate-900 dark:text-white truncate cursor-pointer hover:text-brand-600 transition-colors"
                        onClick={() => handleUserClick(app.studentId)}
                      >
                        {app.studentName}
                      </h4>
                      <span className="shrink-0 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[9px] font-black uppercase tracking-widest rounded-md">
                        Student
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1.5">
                      <i className="far fa-clock"></i> Applied {new Date(app.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Expertise Meta */}
                <div className="xl:px-8 border-y xl:border-y-0 xl:border-x border-gray-100 dark:border-slate-700/50 py-4 xl:py-0 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-60">Target Expertise</p>
                  <p className="text-sm font-bold text-brand-600 truncate">
                    {app.data.formData?.assistedCountries || app.data.assistedCountries}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end shrink-0 min-w-[160px]">
                  {app.status === 'PENDING' ? (
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="w-full xl:w-auto px-6 py-3 bg-brand-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95 flex items-center justify-center gap-2.5"
                    >
                      <i className="fas fa-search-plus"></i> Review
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="w-full xl:w-auto px-6 py-3 bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition flex items-center justify-center gap-2.5"
                    >
                      <i className="far fa-eye"></i> View
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredApps.length === 0 && (
            <div className="py-20 text-center bg-gray-50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4 text-4xl shadow-sm">
                <i className={`fas ${activeStatusTab === 'PENDING' ? 'fa-clipboard-list' : activeStatusTab === 'APPROVED' ? 'fa-user-check' : 'fa-user-times'}`}></i>
              </div>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No {activeStatusTab.toLowerCase()} applications matching filters</p>
            </div>
          )}
        </div>

        {hasMore && (
          <div className="pt-8 flex flex-col items-center gap-3">
            {isFetchingMore ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Loading applications...</p>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onLoadMore(activeStatusTab)}
                  className="px-10 py-4 bg-brand-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95"
                >
                  Load More
                </button>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Showing {applications.length} results
                </p>
              </>
            )}
          </div>
        )}
      </section>

      {selectedApp && !confirmState && createPortal(
        <div 
          className="fixed bottom-0 left-0 right-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" 
          style={{ zIndex: 999999, top: 'calc(env(safe-area-inset-top) + 4rem)', paddingBottom: 'max(env(safe-area-inset-bottom), 2.5rem)' }}
          onClick={() => setSelectedApp(null)}
        >
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-xl w-full max-h-[90vh] overflow-y-auto p-8 lg:p-10 shadow-2xl animate-fade-in-up scrollbar-hide relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedApp(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition">
              <i className="fas fa-times text-xl"></i>
            </button>

            <div className="flex items-center gap-6 mb-10">
              <img
                src={selectedApp.studentAvatarUrl || DEFAULT_AVATAR}
                className="w-24 h-24 rounded-[2rem] object-cover shadow-xl border-4 border-white dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                alt=""
                onClick={() => handleUserClick(selectedApp.studentId)}
              />
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-3">
                  <h3
                    className="text-2xl font-black text-slate-900 dark:text-white truncate cursor-pointer hover:text-brand-600 transition-colors"
                    onClick={() => handleUserClick(selectedApp.studentId)}
                  >
                    {selectedApp.studentName}
                  </h3>
                  <span className="shrink-0 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-lg align-middle">
                    Student
                  </span>
                </div>
                <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mt-1">Student ID: {selectedApp.studentId}</p>
                <div className="mt-3 flex gap-2">
                  <span className={`px-3 py-1 text-[10px] font-black rounded-full border ${selectedApp.status === 'PENDING' ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400' : selectedApp.status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    {selectedApp.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10 text-left">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nationality & Location</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{(selectedApp.data.formData?.nationality || selectedApp.data.nationality)} • {(selectedApp.data.formData?.residency || selectedApp.data.residency)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Highest Qualification</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{(selectedApp.data.formData?.education || selectedApp.data.education)}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Studies</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{(selectedApp.data.formData?.currentStudies || 'N/A')}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Languages</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{(selectedApp.data.formData?.languages || selectedApp.data.languages)}</p>
                </div>
              </div>
              <div className="col-span-1 sm:col-span-2 text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expertise Countries</p>
                <p className="text-sm font-bold text-brand-600">{(selectedApp.data.formData?.assistedCountries || selectedApp.data.assistedCountries)}</p>
              </div>
            </div>

            <div className="mb-10 space-y-4 text-left">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-2">Verification Documents</h4>
              <div className="grid grid-cols-1 gap-3">
                <ReviewDocCategory label="Passport (Biography and Personal Data page)" docs={selectedApp.data.documents?.passport} onDownload={handleDownload} />
                <ReviewDocCategory label="Visa or Residence Permit" docs={selectedApp.data.documents?.visa} onDownload={handleDownload} />
                <ReviewDocCategory label="Academic Records" docs={selectedApp.data.documents?.academic || selectedApp.data.documents?.residency} onDownload={handleDownload} />
                <ReviewDocCategory label="Admission Guideline" docs={selectedApp.data.documents?.guideline} onDownload={handleDownload} />
              </div>
            </div>

            {/* Terms & Conditions Display */}
            <div className="mb-10 space-y-4 text-left">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-2">Terms & Commitments</h4>
              <div className="space-y-3">
                {selectedApp.data.agreements ? (
                  Object.entries(selectedApp.data.agreements).map(([key, value]) => {
                    const labels: Record<string, string> = {
                      services: "Committed to core expert services (SOP, Visa, Courses)",
                      feeSplit: "Accepted 40/40/20 Payout Structure",
                      visaDenied: "Accepted 60% Payout on Visa Denial",
                      confidentiality: "Committed to strict Data Confidentiality",
                      scope: "Limited to 4 University/Country applications per student"
                    };
                    return (
                      <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900/40 rounded-xl border border-gray-100 dark:border-slate-700">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${value ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          <i className={`fas ${value ? 'fa-check-circle' : 'fa-times-circle'} text-xs`}></i>
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{labels[key] || key}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic">No agreements data available for this application.</p>
                )}
              </div>
            </div>

            {selectedApp.status === 'PENDING' ? (
              <div className="flex gap-4">
                <button
                  onClick={() => handleReviewAction('REJECTED')}
                  className="flex-1 py-4 bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-[11px] uppercase tracking-[0.15em] rounded-2xl hover:bg-red-50 hover:text-red-600 transition active:scale-[0.98]"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleReviewAction('APPROVED')}
                  className="flex-[2] py-4 bg-green-600 text-white font-black text-[11px] uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-green-500/30 hover:bg-green-700 transition active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <i className="fas fa-user-check"></i> Approve Expert
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSelectedApp(null)}
                className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition"
              >
                Close View
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {confirmState && createPortal(
        <div 
          className="fixed bottom-0 left-0 right-0 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" 
          style={{ zIndex: 999999, top: 'calc(env(safe-area-inset-top) + 4rem)', paddingBottom: 'max(env(safe-area-inset-bottom), 2.5rem)' }}
          onClick={() => setConfirmState(null)}
        >
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-8 shadow-2xl animate-fade-in-up text-center" onClick={e => e.stopPropagation()}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl ${confirmState.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <i className={`fas ${confirmState.status === 'APPROVED' ? 'fa-user-check' : 'fa-user-times'}`}></i>
            </div>
            <h3 className="text-xl font-bold mb-2">Confirm {confirmState.status === 'APPROVED' ? 'Approval' : 'Rejection'}</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Confirm {confirmState.status === 'APPROVED' ? 'approval' : 'rejection'} for <b>{confirmState.app.studentName}</b>? This action is immediate.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmState(null)}
                disabled={isSubmittingReview}
                className="flex-1 py-3 rounded-xl font-bold bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 transition hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={finalizeReview}
                disabled={isSubmittingReview}
                className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${confirmState.status === 'APPROVED' ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}
              >
                {isSubmittingReview ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const ReviewDocCategory = ({ label, docs, onDownload }: { label: string, docs?: any[], onDownload: (doc: any) => void }) => (
  <div className="space-y-2">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    {!docs || docs.length === 0 ? (
      <p className="text-xs text-slate-400 italic">No files available.</p>
    ) : (
      docs.map((doc, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <i className={`fas ${doc.type === 'PDF' ? 'fa-file-pdf text-red-500' : 'fa-file-image text-blue-500'} text-sm`}></i>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{doc.name}</span>
          </div>
          <button
            onClick={() => onDownload(doc)}
            className="px-4 py-1.5 bg-brand-50 dark:bg-brand-900/40 text-brand-600 text-[10px] font-black uppercase rounded-lg hover:bg-brand-100 transition"
          >
            Download
          </button>
        </div>
      ))
    )}
  </div>
);
