
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Profile, Post, Review, ServiceRequest } from '../types';
import { Icons } from './Icons';
import { DEFAULT_AVATAR, DEFAULT_COVER } from '../services/api';
import { sanitizeHTML } from '../utils/security';
import { ShareProfileModal } from './ShareProfileModal';

interface Props {
  user: Profile;
  posts: Post[];
  isOpen: boolean;
  onClose: () => void;
  onChat: (p: Profile) => void;
  onHire?: (p: Profile) => void;
  onToggleConnect: (id: string) => void;
  currentUser: Profile;
  serviceRequests: ServiceRequest[];
  onViewProfile: (p: Profile | string) => void;
  experts: Profile[];
  students: Profile[];
  isIOSNative?: boolean;
  onSubscribe?: () => void;
}


export const ProfileDetailModal: React.FC<Props> = ({ user, posts, isOpen, onClose, onChat, onHire, onToggleConnect, currentUser, serviceRequests, onViewProfile, experts, students, isIOSNative, onSubscribe }) => {

  const [activeTab, setActiveTab] = useState<'INFO' | 'POSTS' | 'REVIEWS' | 'SUGGESTIONS'>('INFO');
  const [visiblePostsCount, setVisiblePostsCount] = useState(5);
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(10);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (mainElement) mainElement.style.overflow = 'hidden';
      // Ensure modal starts at the top
      if (scrollRef.current) scrollRef.current.scrollTo(0, 0);
    } else {
      document.body.style.overflow = 'unset';
      if (mainElement) mainElement.style.overflow = 'auto';
      setVisiblePostsCount(5);
      setVisibleReviewsCount(10);
      setActiveTab('INFO');
    }
    return () => {
      document.body.style.overflow = 'unset';
      if (mainElement) mainElement.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Ensure scroll to top when viewing a new profile within the same modal (e.g. from reviews)
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTo(0, 0);
    }
  }, [user?.id]);

  const userPosts = useMemo(() => {
    if (!user?.id) return [];
    return (posts || []).filter(p => p.authorId === user.id).sort((a, b) => b.timestamp - a.timestamp);
  }, [posts, user?.id]);

  const isExpert = user?.role === 'EXPERT';

  const userReviews: Review[] = useMemo(() => {
    if (!user?.id) return [];
    return (serviceRequests || [])
      .filter(sr => sr.status === 'COMPLETED' && (isExpert ? !!sr.studentFeedback : !!sr.expertFeedback))
      .filter(sr => isExpert ? sr.expertId === user.id : sr.studentId === user.id)
      .map(sr => ({
        id: `rev-${sr.id}`,
        authorId: isExpert ? sr.studentId : sr.expertId,
        authorName: isExpert ? sr.studentFullName : sr.expertFullName,
        authorAvatarUrl: isExpert ? (sr.studentAvatarUrl || '') : (sr.expertAvatarUrl || ''),
        authorRole: isExpert ? 'STUDENT' : 'EXPERT',
        rating: isExpert ? (sr.studentRating || 5) : (sr.expertRating || 5),
        comment: isExpert ? (sr.studentFeedback || '') : (sr.expertFeedback || ''),
        timestamp: sr.milestoneDates?.['ACCOMMODATION'] ? new Date(sr.milestoneDates['ACCOMMODATION']).getTime() : Date.now()
      }));
  }, [serviceRequests, isExpert, user?.id]);

  const displayedReviews = useMemo(() => userReviews.slice(0, visibleReviewsCount), [userReviews, visibleReviewsCount]);
  const hasMoreReviews = userReviews.length > visibleReviewsCount;

  const averageRating = useMemo(() => {
    if (userReviews.length === 0) return 0;
    const sum = userReviews.reduce((acc, rev) => acc + rev.rating, 0);
    return sum / userReviews.length;
  }, [userReviews]);

  if (!isOpen || !user) return null;

  const currentConnections = currentUser?.connections || [];
  const isConnected = currentConnections.includes(user.id);
  const isAdmin = user.role === 'ADMIN';
  const showHireBtn = isExpert && currentUser?.role === 'STUDENT' && onHire && isIOSNative === false;

  // Pagination logic for posts
  const displayedPosts = userPosts.slice(0, visiblePostsCount);
  const hasMorePosts = userPosts.length > visiblePostsCount;

  const handleReviewerClick = (authorId: string) => {
    if (!authorId) return;
    const allUsers = [...experts, ...students];
    const found = allUsers.find(u => u.id === authorId);
    if (found) {
      onViewProfile(found);
    }
  };

  const handleSendChatClick = () => {
    if (!user) return;

    // IF iOS student and not subscribed, trigger Paywall immediately
    if (isIOSNative && currentUser.role === 'STUDENT' && !currentUser.isSubscribed && onSubscribe) {
      onSubscribe(false, user.id);
      return;
    }

    onChat(user);
    onClose();
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[3000] overflow-y-auto bg-black/60 backdrop-blur-md transition-all duration-300 flex justify-center items-start pt-4 sm:pt-10 pb-10 px-2 sm:px-4"
      onClick={onClose}
    >
      <div
        ref={scrollRef}
        className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-3xl w-full shadow-2xl animate-fade-in-up relative overflow-hidden my-auto sm:my-0 flex flex-col h-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Cover Photo */}
        <div className="h-48 md:h-64 bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
          <img
            src={user.coverPhotoUrl || DEFAULT_COVER}
            onError={(e) => { e.currentTarget.src = DEFAULT_COVER; }}
            className="w-full h-full object-cover"
            alt="Cover"
          />
        </div>

        <div className="absolute top-5 right-5 sm:top-6 sm:right-6 flex gap-2 z-50">
          <button 
            onClick={() => setIsShareModalOpen(true)}
            className="text-white bg-black/25 hover:bg-black/45 dark:bg-black/40 dark:hover:bg-black/60 backdrop-blur-md w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
            aria-label="Share"
          >
            <i className="fas fa-share-alt text-lg"></i>
          </button>
          <button 
            onClick={onClose} 
            className="text-white bg-black/25 hover:bg-black/45 dark:bg-black/40 dark:hover:bg-black/60 backdrop-blur-md w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
            aria-label="Close"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <div className="px-6 md:px-10 pb-10">
          <div className="flex flex-col items-start">
            <div className="flex items-end gap-5">
              <div className="-mt-14 relative flex-shrink-0">
                <img src={user.avatarUrl || DEFAULT_AVATAR} className="w-28 h-28 rounded-3xl border-[6px] border-white dark:border-slate-800 shadow-xl shadow-black/10 object-cover" alt="" />
              </div>
              {isExpert && (
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-[#f5f5f5] text-[#02569B] px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] shadow-sm border border-blue-100/50">
                    <i className="fas fa-check-circle text-[#0084FF] text-xs"></i> VERIFIED
                  </span>
                </div>
              )}
            </div>

            <div className="w-full min-w-0 mt-4">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 space-y-2 text-left">
                  <h2 className="text-3xl font-black leading-tight text-slate-900 dark:text-white line-clamp-2">
                    {user.fullName}
                  </h2>
                  <p className="text-sm text-slate-500 font-bold flex items-center justify-start gap-1 truncate pt-1">
                    <Icons.MapMarker /> {user.currentLocation}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase tracking-wider whitespace-nowrap ${isAdmin ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-brand-600 text-white'
                      }`}>{user.role}</span>
                    {user.isSubscribed && isIOSNative === false && <span className="text-[10px] px-3 py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 font-black uppercase tracking-wider whitespace-nowrap">PREMIUM</span>}
                    {averageRating > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 font-black text-[10px]">
                        <i className="fas fa-star text-[8px]"></i>
                        {averageRating.toFixed(1)}
                      </div>
                    )}
                    <span className="text-[10px] px-3 py-1 rounded-lg bg-slate-100 text-slate-600 dark:text-slate-400 font-black uppercase tracking-wider whitespace-nowrap">
                      {(user.connections || []).filter(id => id !== user.id).length} Connections
                    </span>
                  </div>
                </div>
                {showHireBtn && isIOSNative === false && (
                  <button
                    onClick={() => { onHire(user); onClose(); }}
                    className="hidden sm:flex px-6 py-3 bg-brand-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95 items-center gap-2"
                  >
                    <i className="fas fa-user-plus"></i> Hire Expert
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-8 mt-10 border-b border-gray-100 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('INFO')}
              className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'INFO' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Info
              {activeTab === 'INFO' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-600 rounded-full animate-fade-in-up" />}
            </button>
            <button
              onClick={() => setActiveTab('POSTS')}
              className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'POSTS' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Posts
              {activeTab === 'POSTS' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-600 rounded-full animate-fade-in-up" />}
            </button>
            <button
              onClick={() => setActiveTab('REVIEWS')}
              className={`pb-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'REVIEWS' ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Reviews ({userReviews.length})
              {activeTab === 'REVIEWS' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-600 rounded-full animate-fade-in-up" />}
            </button>
          </div>

          <div className="mt-8 animate-fade-in-up">
            {activeTab === 'INFO' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-4">
                  <InfoBlock label="Nationality" icon="fa-home" value={user.homeCountries?.join(', ') || 'Not specified'} />
                  <InfoBlock label={isExpert || isAdmin ? "Highest Qualification" : "Academic Qualification"} icon="fa-graduation-cap" value={user.highestQualifications?.join(', ') || 'Not specified'} />
                  <InfoBlock label={isExpert || isAdmin ? "Expertise Background" : "Education"} icon="fa-university" value={user.currentStudies?.join(', ') || 'Not specified'} />
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700 text-left">
                    <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                      <i className="fas fa-language text-[10px]"></i> Languages Spoken
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {user.languages && user.languages.length > 0 ? (
                        user.languages.map(lang => (
                          <span key={lang} className="text-[11px] font-black text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded">
                            {lang}
                          </span>
                        ))
                      ) : (
                        <p className="text-slate-400 text-xs font-medium">No languages added</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700 text-left">
                    <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                      <i className="fas fa-lightbulb text-[10px]"></i> {isAdmin || isExpert ? 'Primary Focus Areas' : 'Interested Area of Study'}
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {user.interestAreas?.length ? (
                        user.interestAreas.map(area => (
                          <span key={area} className="text-[11px] font-black text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded">
                            {area}
                          </span>
                        ))
                      ) : (
                        <p className="text-slate-400 text-xs font-medium">Not specified</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700 text-left">
                    <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                      <i className="fas fa-award text-[10px]"></i> Target Degree
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mt-1 justify-start">
                      {user.targetDegree && user.targetDegree.length > 0 ? (
                        user.targetDegree.map(deg => (
                          <span key={deg} className="text-[11px] font-black text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded">
                            {deg}
                          </span>
                        ))
                      ) : (
                        <p className="text-slate-400 text-xs font-medium">Not specified</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 md:col-span-2 lg:col-span-1">
                  <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700 text-left">
                    <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                      <Icons.Globe /> {isExpert || isAdmin ? 'Target Expertise Countries' : 'Admission Targets'}
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {user.targetCountries?.length ? (
                        user.targetCountries.map(country => (
                          <span key={country} className="text-[11px] font-black text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded">
                            {country}
                          </span>
                        ))
                      ) : (
                        <p className="text-slate-400 text-xs font-medium">No countries specified</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'POSTS' ? (
              <div className="space-y-4 max-w-2xl mx-auto">
                {userPosts.length === 0 ? (
                  <div className="py-20 text-center bg-gray-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4 text-2xl">
                      <Icons.Comment />
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No activity shared yet</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4">
                      {displayedPosts.map(post => (
                        <div key={post.id} className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 hover:border-brand-200 transition-colors animate-fade-in-up text-left">
                          <div className="flex items-center gap-3 mb-4">
                            <img src={user.avatarUrl || DEFAULT_AVATAR} className="w-8 h-8 rounded-lg object-cover" alt="" />
                            <div>
                              <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{user.fullName}</p>
                              <p className="text-[9px] text-slate-400 font-bold">{new Date(post.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                          </div>
                          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic" dangerouslySetInnerHTML={{ __html: sanitizeHTML(post.content) }} />
                          <div className="mt-4 flex items-center gap-4 text-slate-400">
                            <span className="text-[10px] font-bold flex items-center gap-1.5"><Icons.Heart /> {post.likes}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {hasMorePosts && (
                      <div className="pt-6 flex justify-center">
                        <button
                          onClick={() => setVisiblePostsCount(prev => prev + 10)}
                          className="px-8 py-4 bg-brand-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition-all hover:bg-brand-700 flex items-center gap-2"
                        >
                          <i className="fas fa-plus-circle"></i> Load 10 More Posts
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4 max-w-2xl mx-auto pb-10">
                {userReviews.length === 0 ? (
                  <div className="py-20 text-center bg-gray-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4 text-2xl">
                      <i className="fas fa-star"></i>
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No reviews yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {displayedReviews.map(review => (
                      <div key={review.id} className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 transition-colors animate-fade-in-up text-left">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={review.authorAvatarUrl || DEFAULT_AVATAR}
                              className="w-10 h-10 rounded-xl object-cover shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                              alt=""
                              onClick={() => handleReviewerClick(review.authorId)}
                            />
                            <div>
                              <p
                                className="text-sm font-black text-slate-900 dark:text-white cursor-pointer hover:text-brand-600 transition-colors"
                                onClick={() => handleReviewerClick(review.authorId)}
                              >
                                {review.authorName}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-600 text-white font-black uppercase tracking-widest">{review.authorRole}</span>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(review.timestamp).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <i key={s} className={`fas fa-star text-[10px] ${s <= review.rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}></i>
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">"{review.comment}"</p>
                      </div>
                    ))}

                    {hasMoreReviews && (
                      <div className="pt-6 flex flex-col items-center gap-3">
                        <button
                          onClick={() => setVisibleReviewsCount(prev => prev + 10)}
                          className="px-8 py-3.5 bg-brand-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition-all hover:bg-brand-700 flex items-center gap-2"
                        >
                          <i className="fas fa-plus-circle"></i> Load 10 More Reviews
                        </button>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                          Showing {displayedReviews.length} of {userReviews.length}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

          <div className="flex flex-col gap-4 pt-10 mt-6 border-t border-gray-100 dark:border-slate-700">
            {showHireBtn && isIOSNative === false && (
              <button
                onClick={() => { onHire(user); onClose(); }}
                className="w-full sm:hidden py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <i className="fas fa-user-plus"></i> Hire Expert ($299)
              </button>
            )}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => onToggleConnect(user.id)}
                className={`flex-1 py-4 rounded-2xl font-bold transition flex items-center justify-center gap-2 ${isConnected
                  ? 'bg-gray-100 dark:bg-slate-700 text-brand-600 dark:text-brand-400'
                  : 'bg-brand-600 text-white shadow-xl shadow-brand-500/20 hover:bg-brand-700'
                  }`}
              >
                <i className={`fas ${isConnected ? 'fa-user-check' : 'fa-user-plus'}`}></i>
                {isConnected ? 'CONNECTED' : 'Connect'}
              </button>
              <button
                onClick={handleSendChatClick}
                className="flex-1 py-4 bg-white dark:bg-slate-900 border-2 border-brand-600 text-brand-600 dark:text-brand-400 font-bold rounded-2xl hover:bg-brand-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Icons.Chat /> Send Message
              </button>
            </div>
          </div>
        </div>
      </div>
      <ShareProfileModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} user={user} />
    </div>,
    document.body
  );
};

const InfoBlock = ({ label, icon, value }: { label: string, icon: string, value: string }) => (
  <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700 text-left">
    <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
      <i className={`fas ${icon} text-[10px]`}></i> {label}
    </h4>
    <p className="text-slate-700 dark:text-slate-300 font-bold">{value}</p>
  </div>
);
