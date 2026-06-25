
import { useState, useCallback } from 'react';
import { Post, Profile } from '../types';
import { api, supabase } from '../services/api';

// Helper interface for the hook return value
interface UseSocialActionsReturn {
    likes: number;
    reposts: number;
    isLiked: boolean;
    isReposted: boolean;
    toggleLike: () => Promise<void>;
    toggleRepost: () => Promise<void>;
    handleShare: () => Promise<void>;
}

export const useSocialActions = (
    post: Post,
    user: Profile,
    onRepost?: (newPostContent: string) => Promise<void>,
    initialIsLiked = false,
    initialIsReposted = false
): UseSocialActionsReturn => {
    // Initialize state from props
    // trusting the post.likes count initially
    const [likes, setLikes] = useState(post.likes || 0);
    const [reposts, setReposts] = useState(post.reposts || 0);

    // Track local status from initial props (server-fetched)
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [isReposted, setIsReposted] = useState(initialIsReposted);

    const toggleLike = useCallback(async () => {
        const prevLikes = likes;
        const prevIsLiked = isLiked;

        // Optimistic Update
        setIsLiked(!prevIsLiked);
        setLikes(prev => prevIsLiked ? prev - 1 : prev + 1);

        try {
            const { liked, newCount } = await api.toggleLike(post.id, user.id);
            // Sync with actual server state
            setIsLiked(liked);
            setLikes(newCount);
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert on error
            setIsLiked(prevIsLiked);
            setLikes(prevLikes);
        }
    }, [likes, isLiked, post.id, user.id]);

    const toggleRepost = useCallback(async () => {
        // Logic: A repost in this app seems to be "Create a new post quoting the old one"
        // PLUS we want to track it as a repost on the original post.

        if (isReposted) return; // Prevent double reposting for now, or handle undo if desired

        const prevReposts = reposts;

        // Optimistic
        setIsReposted(true);
        setReposts(prev => prev + 1);

        try {
            // 1. Create the new post (Quote Post)
            if (onRepost) {
                const dateStr = new Date(post.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const quoteContent = `<div><i>Reposted from <b>@${post.authorName}</b> on ${dateStr}:</i></div><div class="mt-2 pl-4 border-l-2 border-brand-200">${post.content}</div>`;
                await onRepost(quoteContent);
            }

            // 2. Track in post_reposts table
            const { error: matchError } = await supabase
                .from('post_reposts')
                .insert({ post_id: post.id, user_id: user.id });

            // Ignore duplicate key error if user already reposted (shouldn't happen with UI block but handled safest)
            if (matchError && matchError.code !== '23505') throw matchError;

            // 3. Increment repost count via RPC
            const { error: rpcError } = await supabase
                .rpc('increment_post_reposts', { post_id_arg: post.id });

            if (rpcError) throw rpcError;

        } catch (error) {
            console.error('Error reposting:', error);
            setIsReposted(false);
            setReposts(prevReposts);
        }

    }, [reposts, isReposted, post, user.id, onRepost]);

    const handleShare = useCallback(async () => {
        const shareData = {
            title: `Check out this post by ${post.authorName}`,
            text: `Read this on Migonest:\n${post.content.replace(/<[^>]+>/g, '')}`, // Strip HTML for text preview
            url: `${window.location.origin}/post/${post.id}`
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.warn('Share canceled or failed', err);
            }
        } else {
            // Fallback to Clipboard
            try {
                await navigator.clipboard.writeText(shareData.url);
                // Return value or callback could trigger toast, but for now we assume hook user handles UI feedback 
                // or we could add return state 'justShared'
                alert('Link copied to clipboard!');
            } catch (err) {
                console.error('Failed to copy', err);
            }
        }
    }, [post]);

    return {
        likes,
        reposts,
        isLiked,
        isReposted,
        toggleLike,
        toggleRepost,
        handleShare
    };
};
