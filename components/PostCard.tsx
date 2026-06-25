
import React, { useState, useEffect, useRef } from 'react';
import { Post, Profile } from '../types';
import { DEFAULT_AVATAR } from '../services/api';
import { Icons } from './Icons';
import { useSocialActions } from '../hooks/useSocialActions';
import { sanitizeHTML } from '../utils/security';

interface PostCardProps {
    post: Post;
    user: Profile;
    onPost: (content: string) => Promise<void>;
    onAuthorClick: (authorId: string, authorRole: string) => void;
    onEdit?: (post: Post) => void;
    onDelete?: (post: Post) => void;
    highlight?: boolean;
    initialIsLiked?: boolean;
    initialIsReposted?: boolean;
    onShare?: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
    post,
    user,
    onPost,
    onAuthorClick,
    onEdit,
    onDelete,
    highlight = false,
    initialIsLiked = false,
    initialIsReposted = false,
    onShare
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [sharing, setSharing] = useState(false);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);
    const { likes, reposts, isLiked, isReposted, toggleLike, toggleRepost, handleShare } = useSocialActions(post, user, onPost, initialIsLiked, initialIsReposted);

    const isAuthor = post.authorId === user.id;

    const handleShareClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setSharing(true);
        // If parent provides share handler (e.g. for modal), use it
        if (onShare) {
            onShare(post);
        } else {
            // Fallback to internal/native share
            await handleShare();
        }
        setSharing(false);
    };

    return (
        <div
            className={`bg-white dark:bg-slate-800 p-6 rounded-3xl border ${highlight ? 'border-brand-200 shadow-md' : 'border-gray-100 dark:border-slate-800'} shadow-sm transition-all hover:shadow-md relative group`}
        >
            <div className="flex items-center gap-4 mb-4">
                <img
                    src={post.authorAvatarUrl || DEFAULT_AVATAR}
                    className="w-12 h-12 rounded-2xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    alt=""
                    onClick={(e) => { e.stopPropagation(); onAuthorClick(post.authorId, post.authorRole); }}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h4
                            className="font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-brand-600 transition-colors"
                            onClick={(e) => { e.stopPropagation(); onAuthorClick(post.authorId, post.authorRole); }}
                        >
                            {post.authorName}
                        </h4>
                        {isAuthor && onEdit && onDelete && (
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                                    className={`p-2 rounded-xl transition-all ${isMenuOpen ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    <Icons.EllipsisV />
                                </button>
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-50 py-2 animate-scale-in origin-top-right">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit(post); setIsMenuOpen(false); }}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                        >
                                            <Icons.Edit />
                                            <span className="ml-1">Edit</span>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(post); setIsMenuOpen(false); }}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                        >
                                            <Icons.Trash />
                                            <span className="ml-1">Delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black bg-brand-600 text-white px-2 py-0.5 rounded uppercase tracking-widest leading-none inline-block">{post.authorRole}</span>
                        <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold">•</span>
                        <p className="text-[10px] text-slate-400 font-bold">
                            {new Date(post.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>

            <div
                className="text-slate-800 dark:text-slate-200 mb-6 leading-relaxed post-content-render"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(post.content) }}
            />

            <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-slate-800">
                <button
                    onClick={toggleLike}
                    className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}
                >
                    {isLiked ? <i className="fas fa-heart"></i> : <Icons.Heart />}
                    <span className="text-xs font-bold">{likes}</span>
                </button>

                <button
                    onClick={toggleRepost}
                    className={`flex items-center gap-2 font-bold text-xs transition-colors ${isReposted ? 'text-brand-600 cursor-default' : 'text-slate-500 hover:text-brand-500'}`}
                    disabled={isReposted}
                >
                    <Icons.Repost />
                    {isReposted ? 'Shared' : 'Repost'}
                    {reposts > 0 && <span className="text-xs font-bold ml-1">{reposts}</span>}
                </button>

                <button
                    onClick={handleShareClick}
                    className="flex items-center gap-2 text-slate-500 hover:text-brand-500 transition-colors font-bold text-xs"
                >
                    {sharing ? <i className="fas fa-circle-notch fa-spin"></i> : <Icons.Share />}
                    Share
                </button>
            </div>
        </div>
    );
};
