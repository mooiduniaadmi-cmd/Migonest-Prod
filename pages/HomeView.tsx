import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Profile, Post } from '../types';
import { Icons } from '../components/Icons';
import { PostCard } from '../components/PostCard';
import { DEFAULT_AVATAR } from '../services/api';
import { PostEditModal } from '../components/PostEditModal';
import { containsContactInfo } from '../utils/postValidation';
import { SecurityWarningModal } from '../components/SecurityWarningModal';

interface Props {
  user: Profile;
  setView: (v: string) => void;
  posts: Post[];
  onPost: (content: string) => Promise<void>;
  onDeletePost: (id: string) => void;
  onEditPost: (id: string, content: string) => void;
  onToggleConnect: (id: string) => void;
  onViewProfile: (p: Profile | string) => void;
  experts: Profile[];
  students: Profile[];
  admin: Profile;
  defaultStudent: Profile;
  likedPostIds: string[];
  repostedPostIds: string[];
  recommendedProfiles: Profile[];
  hasMorePosts: boolean;
  isFetchingMorePosts: boolean;
  onLoadMorePosts: () => void;
}

export const HomeView: React.FC<Props> = ({ user, setView, posts, onPost, onDeletePost, onEditPost, onToggleConnect, onViewProfile, experts, students, admin, defaultStudent, likedPostIds, repostedPostIds, recommendedProfiles, hasMorePosts, isFetchingMorePosts, onLoadMorePosts }) => {
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  // States for post management
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  // Body scroll lock effect
  useEffect(() => {
    if (postToDelete || postToEdit || sharingPost) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [postToDelete, postToEdit, sharingPost]);

  const observerTarget = useRef<HTMLDivElement>(null);
  
  // Infinite Scroll Implementation via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePosts && !isFetchingMorePosts) {
          onLoadMorePosts();
        }
      },
      { 
        threshold: 0.1, 
        root: document.getElementById('main-scroll-container') 
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMorePosts, isFetchingMorePosts, onLoadMorePosts]);

  // Track formatting states for button highlights
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    list: false
  });

  const handleCreatePost = async () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    const textContent = editorRef.current.innerText;
    
    if (isEditorEmpty) return;

    // Check for forbidden contact info (URL, Email, Phone)
    if (containsContactInfo(textContent)) {
      setShowSecurityWarning(true);
      return;
    }

    try {
      setIsPosting(true);
      await onPost(content);
      editorRef.current.innerHTML = '';
      setIsEditorEmpty(true);
      updateActiveFormats();
      triggerToast('Post shared!');
    } catch (err) {
      triggerToast('Failed to share post');
    } finally {
      setIsPosting(false);
    }
  };

  const execCommand = (command: string, ref: React.RefObject<HTMLDivElement | null>, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    ref.current?.focus();
    updateActiveFormats();
  };

  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      list: document.queryCommandState('insertUnorderedList')
    });

    if (editorRef.current) {
      const text = editorRef.current.innerText.trim();
      setIsEditorEmpty(text === '');
    }
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  // Memoized list of suggestions using advanced weighted matching
  const dynamicSuggestions = useMemo(() => {
    return recommendedProfiles.map(p => ({
      id: p.id,
      name: p.fullName,
      role: p.role === 'EXPERT' ? 'Expert' : 'Student',
      // Dynamic country label based on role
      country: p.currentLocation || 'Location N/A',
      avatar: p.avatarUrl,
      fullProfile: p
    }));
  }, [recommendedProfiles]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative pb-24">
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in-up border border-white/10 flex items-center gap-2">
          <Icons.Check /> {showToast}
        </div>
      )}

      <div className="lg:col-span-8 space-y-8">

        <div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm mb-8">
            <div className="flex items-center gap-2 mb-3 px-1">
              <button
                onClick={() => execCommand('bold', editorRef)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition ${activeFormats.bold ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-slate-900 text-slate-500 hover:text-brand-600'}`}
                title="Bold"
              >
                <i className="fas fa-bold"></i>
              </button>
              <button
                onClick={() => execCommand('italic', editorRef)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition ${activeFormats.italic ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-slate-900 text-slate-500 hover:text-brand-600'}`}
                title="Italic"
              >
                <i className="fas fa-italic"></i>
              </button>
              <button
                onClick={() => execCommand('insertUnorderedList', editorRef)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition ${activeFormats.list ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-slate-900 text-slate-500 hover:text-brand-600'}`}
                title="Bullet List"
              >
                <i className="fas fa-list-ul"></i>
              </button>
            </div>

            <div
              ref={editorRef}
              contentEditable
              onInput={updateActiveFormats}
              onKeyUp={updateActiveFormats}
              onMouseUp={updateActiveFormats}
              data-placeholder="What's happening in your study journey?"
              className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none min-h-[100px] max-h-[300px] overflow-y-auto rich-editor"
            />

            <style>{`
              .rich-editor[contenteditable]:empty:before {
                content: attr(data-placeholder);
                color: #94a3b8;
                pointer-events: none;
                display: block;
              }
              .rich-editor ul, .post-content-render ul {
                list-style-type: disc;
                margin-left: 1.5rem;
                margin-top: 0.5rem;
                margin-bottom: 0.5rem;
              }
              .rich-editor b, .rich-editor strong, .post-content-render b, .post-content-render strong {
                font-weight: 800;
              }
            `}</style>

            <div className="flex justify-end mt-4">
              <button
                onClick={handleCreatePost}
                disabled={isEditorEmpty || isPosting}
                className="px-8 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPosting ? (
                  <><i className="fas fa-circle-notch fa-spin"></i> Sharing...</>
                ) : (
                  'Share Update'
                )}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                onPost={onPost}
                onAuthorClick={(id) => {
                  const p = [user, ...experts, ...students].find(x => x?.id === id);
                  onViewProfile(p || id);
                }}
                onEdit={(p) => {
                  setPostToEdit(p);
                }}
                onDelete={setPostToDelete}
                initialIsLiked={likedPostIds.includes(post.id)}
                initialIsReposted={repostedPostIds.includes(post.id)}
                onShare={setSharingPost}
              />
            ))}

            {/* Pagination Controls */}
            {hasMorePosts && (
              <div ref={observerTarget} className="pt-4 flex flex-col items-center gap-3">
                {isFetchingMorePosts ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                      Loading more updates...
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={onLoadMorePosts}
                      className="px-10 py-4 bg-brand-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95 disabled:opacity-50"
                    >
                      Load More Activity
                    </button>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Showing {posts.length} posts
                    </p>
                  </>
                )}
              </div>
            )}

            {!posts.length && (
              <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                  <Icons.Home />
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Feed is empty</h4>
                <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed font-medium">Connect with experts or students to see their updates here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="hidden lg:block lg:col-span-4 space-y-8 sticky top-4 h-fit">
        <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <img
            src={user.avatarUrl || DEFAULT_AVATAR}
            className="w-14 h-14 rounded-2xl object-cover shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
            alt=""
            onClick={() => setView('PROFILE')}
          />
          <div className="flex-1 overflow-hidden text-left">
            <h4
              className="font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-brand-600 transition-colors"
              onClick={() => setView('PROFILE')}
            >
              {user.fullName}
            </h4>
            <span className="text-[9px] font-black bg-brand-600 text-white px-2 py-0.5 rounded uppercase tracking-widest leading-none inline-block mt-0.5">{user.role}</span>
            <p className="text-[10px] text-slate-400 truncate">{user.currentLocation}</p>
          </div>
          <button
            onClick={() => setView('PROFILE')}
            className="w-10 h-10 flex items-center justify-center bg-brand-50 dark:bg-brand-900/40 text-brand-600 rounded-xl shadow-sm border border-brand-100 dark:border-slate-700 transition-colors hover:bg-brand-100"
          >
            <Icons.User />
          </button>
        </div>

        {user.role === 'ADMIN' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-brand-100 dark:border-brand-900/30 shadow-sm border-l-4 border-l-brand-600">
            <h4 className="font-bold text-lg mb-2 text-left flex items-center gap-2">
              <Icons.Shield /> Admin Control
            </h4>
            <p className="text-[10px] text-slate-500 mb-4 font-medium uppercase tracking-widest">Platform Management</p>
            <button 
              onClick={() => setView('ADMIN_WITHDRAWALS')}
              className="w-full py-4 bg-brand-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95 flex items-center justify-center gap-2 mb-3"
            >
              <Icons.Money /> Approve Withdrawals
            </button>
            <button 
              onClick={() => setView('ADMIN_ANALYTICS')}
              className="w-full py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-slate-800 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-chart-line"></i> Analytics Dashboard
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <h4 className="font-bold text-lg mb-4 text-left">Profile Suggestions</h4>
          <div className="space-y-4">
            {dynamicSuggestions.slice(0, 2).map((suggestion, i) => {
              const isConnected = (user.connections || []).includes(suggestion.id);
              const institute = suggestion.fullProfile.currentStudies?.[0] || 'Educational Institute';

              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl transition border border-transparent"
                >
                  <img
                    src={suggestion.avatar || DEFAULT_AVATAR}
                    className="w-10 h-10 rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity border border-gray-100 dark:border-slate-700"
                    alt=""
                    onClick={() => onViewProfile(suggestion.fullProfile)}
                  />
                  <div className="flex-1 overflow-hidden text-left">
                    <span
                      className="text-sm font-bold text-slate-700 dark:text-slate-300 block truncate cursor-pointer hover:text-brand-600 transition-colors"
                      onClick={() => onViewProfile(suggestion.fullProfile)}
                    >
                      {suggestion.name}
                    </span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black bg-brand-600 text-white px-2 py-0.5 rounded uppercase tracking-widest leading-none inline-block">{suggestion.role}</span>
                        <span className="text-[9px] text-slate-400">•</span>
                        <span className="text-[9px] text-slate-400 truncate">{suggestion.country}</span>
                      </div>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium truncate italic">{institute}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleConnect(suggestion.id); }}
                    className={`text-[9px] font-bold px-3 py-1.5 rounded-full border transition active:scale-95 ${isConnected
                      ? 'bg-brand-50 border-brand-200 text-brand-600'
                      : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-slate-500 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200'
                      }`}
                  >
                    {isConnected ? 'Connected' : '+ Connect'}
                  </button>
                </div>
              );
            })}
            {dynamicSuggestions.length === 0 && (
              <p className="text-[10px] text-slate-400 text-center italic py-4">No more suggestions available.</p>
            )}
          </div>
          <button
            onClick={() => setView(user.role === 'STUDENT' ? 'FIND' : 'FIND_STUDENTS')}
            className="w-full mt-6 py-3 border border-gray-100 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition"
          >
            See all profiles
          </button>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-brand-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-500/20 text-left">
          <h4 className="font-bold text-lg mb-2">Need direct help?</h4>
          <p className="text-xs text-indigo-50 mb-6 leading-relaxed">
            {user.role === 'ADMIN' || user.role === 'EXPERT'
              ? 'Connect with students looking for guidance and manage platform quality.'
              : 'Connect with vetted experts who have actually lived and studied in your target country.'}
          </p>
          <button
            onClick={() => setView((user.role === 'ADMIN' || user.role === 'EXPERT') ? 'FIND_STUDENTS' : 'FIND')}
            className="w-full py-3 bg-white text-brand-600 font-bold rounded-xl text-sm hover:bg-indigo-50 transition active:scale-95 shadow-lg"
          >
            {user.role === 'ADMIN' || user.role === 'EXPERT' ? 'Discover Students' : 'Discover Experts'}
          </button>
        </div>
      </div>

      {/* Post Deletion Modal */}
      {postToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPostToDelete(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-[320px] max-w-[90vw] max-h-[90vh] overflow-y-auto p-8 text-center shadow-2xl animate-fade-in-up scrollbar-hide" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
              <Icons.Trash />
            </div>
            <h3 className="text-xl font-bold mb-2">Delete Post?</h3>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete this update? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setPostToDelete(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-bold transition hover:bg-gray-200">Cancel</button>
              <button
                onClick={() => {
                  onDeletePost(postToDelete.id);
                  setPostToDelete(null);
                  triggerToast('Post deleted');
                }}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Editing Modal */}
      {postToEdit && (
        <PostEditModal
          post={postToEdit}
          onClose={() => setPostToEdit(null)}
          onSave={(content) => {
            onEditPost(postToEdit.id, content);
            setPostToEdit(null);
            triggerToast('Post updated!');
          }}
        />
      )}

      {sharingPost && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSharingPost(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-fade-in-up scrollbar-hide" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-6 text-center">Share this Post</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/?view=PROFILE&userId=${sharingPost.authorId}&tab=posts`;
                  navigator.clipboard.writeText(url);
                  setSharingPost(null);
                  triggerToast('Link copied!');
                }}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl hover:bg-brand-50 transition group border border-transparent hover:border-brand-100"
              >
                <div className="w-12 h-12 bg-white dark:bg-slate-800 text-slate-600 rounded-xl flex items-center justify-center shadow-sm">
                  <i className="fas fa-link"></i>
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Copy Link</p>
                  <p className="text-[10px] text-slate-500">Share anywhere</p>
                </div>
              </button>
              <button onClick={() => setSharingPost(null)} className="w-full py-3 text-slate-500 font-bold text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <SecurityWarningModal 
        isOpen={showSecurityWarning} 
        onClose={() => setShowSecurityWarning(false)} 
      />
    </div>
  );
};
