import React, { useState, useRef, useEffect } from 'react';
import { Post } from '../types';
import { containsContactInfo } from '../utils/postValidation';
import { SecurityWarningModal } from '../components/SecurityWarningModal';

interface PostEditModalProps {
    post: Post;
    onClose: () => void;
    onSave: (content: string) => void;
}

export const PostEditModal: React.FC<PostEditModalProps> = ({
    post,
    onClose,
    onSave
}) => {
    const editEditorRef = useRef<HTMLDivElement>(null);
    const [isEditEditorEmpty, setIsEditEditorEmpty] = useState(false);
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        list: false
    });
    const [showSecurityWarning, setShowSecurityWarning] = useState(false);

    const updateActiveFormats = () => {
        setActiveFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            list: document.queryCommandState('insertUnorderedList')
        });

        if (editEditorRef.current) {
            const text = editEditorRef.current.innerText.trim();
            setIsEditEditorEmpty(text === '');
        }
    };

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editEditorRef.current?.focus();
        updateActiveFormats();
    };

    // Initialize content on mount
    useEffect(() => {
        if (editEditorRef.current) {
            editEditorRef.current.innerHTML = post.content;
            setIsEditEditorEmpty(post.content.trim() === '');
        }
    }, [post.content]);

    const handleSave = () => {
        if (!editEditorRef.current) return;
        const content = editEditorRef.current.innerHTML;
        const textContent = editEditorRef.current.innerText;

        // Check for forbidden contact info (URL, Email, Phone)
        if (containsContactInfo(textContent)) {
            setShowSecurityWarning(true);
            return;
        }

        onSave(content);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-fade-in-up scrollbar-hide" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Edit Post</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <button
                            onClick={() => execCommand('bold')}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${activeFormats.bold ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}
                        >
                            <i className="fas fa-bold"></i>
                        </button>
                        <button
                            onClick={() => execCommand('italic')}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${activeFormats.italic ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}
                        >
                            <i className="fas fa-italic"></i>
                        </button>
                        <button
                            onClick={() => execCommand('insertUnorderedList')}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${activeFormats.list ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500'}`}
                        >
                            <i className="fas fa-list-ul"></i>
                        </button>
                    </div>
                    <div
                        ref={editEditorRef}
                        contentEditable
                        onInput={updateActiveFormats}
                        className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-brand-500 min-h-[120px] max-h-[300px] overflow-y-auto rich-editor"
                    />
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-bold transition hover:bg-gray-200">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={isEditEditorEmpty}
                        className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 transition active:scale-95 disabled:opacity-50"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
            
            <SecurityWarningModal 
                isOpen={showSecurityWarning} 
                onClose={() => setShowSecurityWarning(false)} 
            />
        </div>
    );
};
