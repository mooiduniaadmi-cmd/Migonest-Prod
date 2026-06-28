import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Profile, ChatMessage, ServiceRequest } from '../types';
import { Icons } from '../components/Icons';
import { DEFAULT_AVATAR } from '../services/api';

interface Props {
  user: Profile;
  experts: Profile[];
  students: Profile[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  messages: ChatMessage[];
  onSendMessage: (chatId: string, text: string) => void;
  isSubscribed: boolean | undefined;
  serviceRequests: ServiceRequest[];
  setView: (v: string) => void;
  onViewProfile: (p: Profile | string) => void;
  onMarkMessagesAsRead: (partnerId: string) => void;
  onEditMessage: (id: string, text: string) => void;
  onDeleteMessage: (id: string) => void;
  onClearChatHistory: (partnerId: string) => void;
  setReferralSourceId: (id: string | null) => void;
  onSubscribe: (referrerId?: string) => void;
  isSubscribing: boolean;
  onViewMembership: () => void;
  isIOSNative?: boolean;
  isNative?: boolean;
}


export const ChatView: React.FC<Props> = ({
  user, experts, students, activeChatId, setActiveChatId, messages, onSendMessage, isSubscribed, serviceRequests, setView, onViewProfile, onMarkMessagesAsRead,
  onEditMessage, onDeleteMessage, onClearChatHistory, setReferralSourceId, onSubscribe, isSubscribing, onViewMembership, isIOSNative, isNative
}) => {

  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom only on mount or when sending a specific new message (controlled by parent ideally, but here we just check length or id)
  // For now, let's rely on a simpler check or just scroll when messages length changes *and* we are already near bottom or it's a new message from 'me'.
  // But the user complained about "scrolling up scrolls back down". This means it blindly auto-scrolls on every render.
  // We should only scroll if the *last message* ID changes.
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastMessageId, activeChatId]); // Only scroll when new messages arrive, not on every re-render (like during edits)

  useEffect(() => {
    if (activeChatId) {
      onMarkMessagesAsRead(activeChatId);
    }
  }, [messages, activeChatId, onMarkMessagesAsRead]);

  // Check if there is an active or completed admission journey between the users
  const hasAdmissionWith = (partnerId: string) => {
    return (serviceRequests || []).some(sr =>
      (sr.status === 'PAID' || sr.status === 'COMPLETED') &&
      ((sr.studentId === user.id && sr.expertId === partnerId) ||
        (sr.expertId === user.id && sr.studentId === partnerId))
    );
  };

  // Build the contacts list: Only show users with message history OR the active chat partner
  const contacts = useMemo(() => {
    // 1. Identify all unique partner IDs with message history
    const messagePartnerIds = new Set<string>();
    messages.forEach(m => {
      if (m.senderId === user.id) messagePartnerIds.add(m.receiverId);
      if (m.receiverId === user.id) messagePartnerIds.add(m.senderId);
    });

    // 2. Always include the currently active chat partner (e.g. if opened from a profile)
    if (activeChatId) {
      messagePartnerIds.add(activeChatId);
    }

    const allKnownUsers = [...experts, ...students];
    
    // Fallback: Add missing users from serviceRequests (e.g. if a student hired an expert but isn't in the public lists)
    serviceRequests?.forEach(sr => {
      if (sr.studentId !== user.id && !allKnownUsers.some(u => u.id === sr.studentId)) {
        allKnownUsers.push({
          id: sr.studentId,
          fullName: sr.studentFullName,
          avatarUrl: sr.studentAvatarUrl || '',
          role: 'STUDENT'
        } as any);
      }
      if (sr.expertId !== user.id && !allKnownUsers.some(u => u.id === sr.expertId)) {
        allKnownUsers.push({
          id: sr.expertId,
          fullName: sr.expertFullName,
          avatarUrl: sr.expertAvatarUrl || '',
          role: 'EXPERT'
        } as any);
      }
    });

    // 3. Filter and Sort
    return allKnownUsers
      .filter(u => messagePartnerIds.has(u.id))
      .sort((a, b) => {
        // Sort by latest message timestamp
        const lastA = [...messages].reverse().find(m => m.senderId === a.id || m.receiverId === a.id);
        const lastB = [...messages].reverse().find(m => m.senderId === b.id || m.receiverId === b.id);
        
        if (!lastA && !lastB) return 0;
        if (!lastA) return 1;
        if (!lastB) return -1;
        return lastB.timestamp - lastA.timestamp;
      });
  }, [user.id, experts, students, messages, activeChatId, serviceRequests]);

  const activePartner = useMemo(() => {
    if (!activeChatId) return null;
    const fromContacts = contacts.find(p => p.id === activeChatId);
    if (fromContacts) return fromContacts;
    
    // Fallback: If not in contacts (e.g. on iOS where they are filtered out), find in global lists
    const all = [...experts, ...students];
    return all.find(p => p.id === activeChatId) || null;
  }, [activeChatId, contacts, experts, students]);

  const relevantMsgs = messages.filter(m =>
    (m.senderId === user.id && m.receiverId === activeChatId) ||
    (m.senderId === activeChatId && m.receiverId === user.id)
  );

  const isAdmissionPartner = activeChatId ? hasAdmissionWith(activeChatId) : false;
  const isInputEnabled = isSubscribed || isAdmissionPartner;

  // New State for Edit/Delete
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editBuff, setEditBuff] = useState('');
  const [hoverMsgId, setHoverMsgId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setMenuOpenId(null);
      setIsHeaderMenuOpen(false);
    };
    if (menuOpenId || isHeaderMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [menuOpenId, isHeaderMenuOpen]);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    actionType: 'DELETE' | 'CLEAR';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    actionType: 'DELETE'
  });

  const requestDeleteMessage = (msgId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message?',
      onConfirm: () => onDeleteMessage(msgId),
      actionType: 'DELETE'
    });
  };

  const requestClearChat = (partnerId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Chat History',
      message: 'Are you sure you want to delete all messages? This cannot be undone.',
      onConfirm: () => onClearChatHistory(partnerId),
      actionType: 'CLEAR'
    });
  };

  return (
    <div className={`flex gap-6 overflow-hidden ${activeChatId ? 'h-full' : 'h-[calc(100dvh-60px)] lg:h-[calc(100dvh-120px)]'}`}>
      <div className={`flex-col lg:flex lg:w-80 space-y-2 overflow-y-auto pr-2 custom-scrollbar ${activeChatId && 'hidden'}`}>
        <h2 className="text-2xl font-bold mb-4 px-2 pt-10 lg:pt-0">Conversations</h2>

        {contacts.length === 0 ? (
          <div className="flex flex-col items-center text-center p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700/50 mt-4">
            <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center text-xl mb-3">
              <Icons.Chat />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">No active chats</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Check profiles, connect and start messaging. Find users on discover screen to connect and start chatting.
            </p>
            <button
              onClick={() => setView(user.role === 'STUDENT' ? 'FIND' : 'FIND_STUDENTS')}
              className="w-full mt-4 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-sm font-bold"
            >
              <i className="fas fa-search text-[10px]"></i>
              Connect Now
            </button>
          </div>
        ) : (
          contacts.map(partner => {
            const hasAdmission = hasAdmissionWith(partner.id);
            const isLocked = !isSubscribed && !hasAdmission;
            const isActive = activeChatId === partner.id;
            const unreadCount = messages.filter(m => m.senderId === partner.id && m.receiverId === user.id && !m.read).length;

            return (
              <div
                key={partner.id}
                onClick={() => setActiveChatId(partner.id)}
                className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition border relative group ${isActive ? 'bg-brand-50 border-brand-200 dark:bg-brand-900/20' : 'bg-white dark:bg-slate-800 border-transparent hover:bg-slate-50'}`}
              >
                {isLocked && (
                  <div className="absolute inset-0 z-10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
                      <Icons.Lock />
                    </div>
                  </div>
                )}
                <div className="relative">
                  <img src={partner.avatarUrl || DEFAULT_AVATAR} className="w-12 h-12 rounded-2xl object-cover" alt="" />
                  {unreadCount > 0 && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">{unreadCount}</div>}
                </div>
                <div className="flex-1 overflow-hidden text-left">
                  <h4 className="font-bold truncate text-slate-900 dark:text-white">{partner.fullName}</h4>
                  <p className="text-[10px] text-slate-500 truncate font-medium">Online</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={`flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden h-full ${!activeChatId && 'hidden lg:flex'}`}>
        {activeChatId ? (
          <>
            <div className="flex-none bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex items-center justify-between p-4 pt-12 lg:pt-4 border-b border-gray-100 dark:border-slate-700/50 z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveChatId(null)} className="p-2 -ml-2 text-slate-500 hover:text-brand-600 transition-colors">
                  <i className="fas fa-arrow-left"></i>
                </button>
                <img
                  src={activePartner?.avatarUrl || DEFAULT_AVATAR}
                  className="w-10 h-10 rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  alt=""
                  onClick={() => activePartner && onViewProfile(activePartner)}
                />
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <h4
                      className="font-bold cursor-pointer hover:text-brand-600 transition-colors truncate text-slate-900 dark:text-white"
                      onClick={() => activePartner && onViewProfile(activePartner)}
                    >
                      {activePartner?.fullName}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isAdmissionPartner ? 'bg-brand-500' : 'bg-green-500'}`}></span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {activePartner?.role} • {isAdmissionPartner ? 'Admission Partner' : 'Active Now'}
                    </span>
                  </div>
                </div>
              </div>

              {relevantMsgs.length > 0 && (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsHeaderMenuOpen(!isHeaderMenuOpen); }}
                    className={`p-2 rounded-xl transition-colors ${isHeaderMenuOpen ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    title="Conversation Options"
                  >
                    <i className="fas fa-ellipsis-v"></i>
                  </button>
                  {isHeaderMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-50 py-2 animate-scale-in origin-top-right">
                      <button
                        onClick={() => { setIsHeaderMenuOpen(false); requestClearChat(activeChatId); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      >
                        <i className="fas fa-trash-alt w-4"></i>
                        <span className="font-bold">Clear History</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>


            <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6 space-y-4 custom-scrollbar">
              {relevantMsgs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-10">
                  <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-2xl flex items-center justify-center text-2xl mb-4">
                    <Icons.Chat />
                  </div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No messages yet</p>
                  <p className="text-xs text-slate-500 mt-2">Start a conversation with {(activePartner?.fullName || 'User').split(' ')[0]}.</p>
                </div>
              )}
              {relevantMsgs.map(msg => {
                const isMe = msg.senderId === user.id;
                const isHovered = hoverMsgId === msg.id;
                const isEditing = editingMsgId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex group relative ${isMe ? 'justify-end' : 'justify-start'}`}
                    onMouseEnter={() => setHoverMsgId(msg.id)}
                    onMouseLeave={() => setHoverMsgId(null)}
                  >
                    <div className={`max-w-[75%] p-4 rounded-2xl text-sm text-left relative group whitespace-pre-wrap ${isMe ? 'bg-brand-600 text-white shadow-lg' : 'bg-gray-50 dark:bg-slate-700 border dark:border-slate-600 text-slate-800 dark:text-slate-200'}`}>
                      {isMe && !isEditing && (
                        <div className="absolute top-0 right-full mr-2 h-full flex items-center">
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === msg.id ? null : msg.id); }}
                              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${menuOpenId === msg.id ? 'bg-white dark:bg-slate-700 text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100'}`}
                            >
                              <i className="fas fa-ellipsis-v text-xs"></i>
                            </button>
                            {menuOpenId === msg.id && (
                              <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-xl shadow-xl z-50 py-2 animate-scale-in origin-top-right">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingMsgId(msg.id); setEditBuff(msg.text); setMenuOpenId(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600/50 transition-colors"
                                >
                                  <i className="fas fa-pencil-alt w-4"></i>
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); requestDeleteMessage(msg.id); setMenuOpenId(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                >
                                  <i className="fas fa-trash w-4"></i>
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {isEditing ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <textarea value={editBuff} onChange={e => setEditBuff(e.target.value)} className="w-full bg-white/10 text-white rounded p-2 text-xs outline-none" rows={2} autoFocus />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingMsgId(null)} className="text-[10px] font-bold opacity-70 hover:opacity-100">Cancel</button>
                            <button onClick={() => { onEditMessage(msg.id, editBuff); setEditingMsgId(null); }} className="text-[10px] font-bold bg-white text-brand-600 px-2 py-1 rounded hover:bg-gray-100">Save</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.text}
                          <div className={`text-[9px] mt-1 text-right ${isMe ? 'opacity-70' : 'opacity-40'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div 
              className="flex-none p-4 lg:p-6 bg-gray-50/50 dark:bg-slate-900/20 border-t dark:border-slate-700 transition-all duration-300"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + var(--keyboard-offset, 0px) + 12px)' }}
            >
              {isInputEnabled ? (
                <div className="flex gap-4 items-center">
                  <textarea
                    id="chat-textarea"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      e.stopPropagation();
                      // On desktop (not native), Enter sends the message, Shift+Enter adds a new line.
                      // On mobile (iOS/Android), Enter ALWAYS adds a new line (standard textarea behavior).
                      const isMobile = isNative || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                      
                      if (!isMobile && e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim()) {
                          onSendMessage(activeChatId, input);
                          setInput('');
                        }
                      }
                    }}
                    placeholder="Write your message..."
                    rows={2}
                    className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl px-6 py-3 outline-none focus:ring-2 focus:ring-brand-500 shadow-sm text-slate-900 dark:text-white resize-none max-h-32 min-h-[56px] custom-scrollbar"
                  />
                  <button
                    onClick={() => { if (input.trim()) { onSendMessage(activeChatId, input); setInput(''); } }}
                    disabled={!input.trim()}
                    className="w-14 h-14 bg-brand-600 rounded-2xl text-white flex items-center justify-center disabled:opacity-50 hover:bg-brand-700 transition-colors"
                  >
                    <i className="fas fa-paper-plane text-xl"></i>
                  </button>
                </div>
              ) : (
                <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm animate-fade-in-up">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-2xl flex items-center justify-center text-2xl mb-4">
                      <Icons.Lock />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">Subscription Required</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 font-medium">Unlock direct messaging with {activePartner?.fullName || 'this expert'} and the rest of your network.</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => isIOSNative ? onSubscribe() : onViewMembership()}
                        className="w-full py-4 px-6 bg-brand-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-500/20 active:scale-95 transition flex items-center justify-center gap-2"
                      >
                        {isIOSNative ? 'Subscribe to unlock chat' : 'Subscribe to unlock chat'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 max-w-md mx-auto">
            {contacts.length === 0 ? (
              <>
                <div className="w-24 h-24 bg-gradient-to-tr from-brand-500/10 to-cyan-500/10 dark:from-brand-500/20 dark:to-cyan-500/20 text-brand-600 dark:text-brand-400 rounded-[2.5rem] flex items-center justify-center text-4xl mb-6 shadow-inner animate-pulse">
                  <i className="far fa-comments"></i>
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Start Your Conversations</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                  Check profiles, connect and start messaging. Find users on discover screen to connect and start chatting.
                </p>
                <button
                  onClick={() => setView(user.role === 'STUDENT' ? 'FIND' : 'FIND_STUDENTS')}
                  className="mt-8 px-8 py-4 bg-gradient-to-r from-brand-600 to-cyan-600 hover:from-brand-700 hover:to-cyan-700 text-white rounded-2xl text-sm font-extrabold uppercase tracking-wider shadow-lg shadow-brand-500/20 active:scale-95 transition-all duration-200 flex items-center gap-2"
                >
                  <i className="fas fa-search"></i>
                  {user.role === 'STUDENT' ? 'Discover Experts' : 'Discover Students'}
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-gray-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-slate-200 text-3xl mb-6">
                  <Icons.Chat />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Your Inbox</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2">Select a conversation from the left to start messaging your network.</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {
        confirmModal.isOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-scale-in">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{confirmModal.message}</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { confirmModal.onConfirm(); setConfirmModal(prev => ({ ...prev, isOpen: false })); }}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-lg shadow-red-500/20"
                >
                  {confirmModal.actionType === 'CLEAR' ? 'Clear All' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};