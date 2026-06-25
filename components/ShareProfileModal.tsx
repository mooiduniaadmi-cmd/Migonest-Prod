import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Profile } from '../types';
import { DEFAULT_AVATAR } from '../services/api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    user: Profile;
}

export const ShareProfileModal: React.FC<Props> = ({ isOpen, onClose, user }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const baseUrl = window.location.origin.includes('capacitor://') ? 'https://migonest.com' : window.location.origin;
    const shareUrl = `${baseUrl}/m/${user.slug}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-fade-in-up text-center relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition">
                    <i className="fas fa-times text-xl"></i>
                </button>

                <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-4 border-4 border-white dark:border-slate-700 shadow-md">
                    <img src={user.avatarUrl || DEFAULT_AVATAR} alt={user.fullName} className="w-full h-full object-cover" />
                </div>

                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">{user.fullName}</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">Scan to view profile</p>

                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-inner inline-block mb-6">
                    <QRCodeSVG value={shareUrl} size={180} />
                </div>

                <div className="space-y-4">

                    <button
                        onClick={handleCopy}
                        className={`w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${copied
                            ? 'bg-green-500 text-white'
                            : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95'
                            }`}
                    >
                        {copied ? <><i className="fas fa-check"></i> Copied!</> : <><i className="fas fa-copy"></i> Copy Link</>}
                    </button>

                    <div className="flex justify-center gap-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-110 active:scale-95 transition" title="Share on Facebook">
                            <i className="fab fa-facebook-f"></i>
                        </a>
                        <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out ${user.fullName}'s profile on Migonest!`)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:scale-110 active:scale-95 transition" title="Share on X (Twitter)">
                            <i className="fab fa-twitter"></i>
                        </a>
                        <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out ${user.fullName}'s profile on Migonest! ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:scale-110 active:scale-95 transition text-lg" title="Share on WhatsApp">
                            <i className="fab fa-whatsapp"></i>
                        </a>
                        <a href={`mailto:?subject=${encodeURIComponent(`${user.fullName}'s Profile on Migonest`)}&body=${encodeURIComponent(`Check out this profile: ${shareUrl}`)}`} className="w-10 h-10 rounded-full bg-slate-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition" title="Share via Email">
                            <i className="fas fa-envelope"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
