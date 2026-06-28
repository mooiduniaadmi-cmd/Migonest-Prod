
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Profile, ServiceRequest, AdmissionStep, Document } from '../types';
import { Icons } from '../components/Icons';
import { ADMISSION_STAGES } from '../constants';
import { api, DEFAULT_AVATAR } from '../services/api';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { containsContactInfo } from '../utils/postValidation';
import { SecurityWarningModal } from '../components/SecurityWarningModal';

const AgreementInfo = ({ label, value }: { label: string, value?: string }) => (
  <div className="space-y-1 text-left">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-900 p-2 rounded-lg border border-gray-100 dark:border-slate-700">{value || 'N/A'}</p>
  </div>
);

const TermTag = ({ label, value, checked }: { label: string, value: string, checked?: boolean }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-left">
    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${checked ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
      <i className="fas fa-check text-[10px]"></i>
    </div>
    <div>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">{label}</p>
      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{value}</p>
    </div>
  </div>
);

interface Props {
  user: Profile;
  serviceRequests: ServiceRequest[];
  activeRequestId: string | null;
  setActiveRequestId: (id: string | null) => void;
  experts: Profile[];
  students: Profile[];
  onApproveMilestone: (id: string, step: string) => Promise<void>;
  onMarkMilestone: (id: string, notes?: string, file?: File) => Promise<void>;
  onRejectMilestone: (id: string, message: string, file?: File) => Promise<void>;

  onReportVisaRejection: (id: string, file: File) => Promise<void>;
  onExpertVerifyRejection: (id: string) => Promise<void>;
  onAddDocument: (requestId: string, doc: Omit<Document, 'id' | 'timestamp' | 'uploadedBy'>) => Promise<void>;
  onEditDocument: (requestId: string, docId: string, newName: string) => Promise<void>;
  onDeleteDocument: (requestId: string, docId: string) => Promise<void>;
  onOpenChat: (partner: Profile) => void;
  onSeeMoreHistory: () => void;
  onRedirectToDiscover?: () => void;
  onViewProfile: (p: Profile | string) => void;
  onPostFeedback: (requestId: string, rating: number, comment: string) => void;
  onLoadMoreAdmission: () => void;
  onSearchAdmission: (query: string, subView: SubViewType) => void;
  hasMoreAdmission: boolean;
  isFetchingMoreAdmission: boolean;
  admissionSearchQuery: string;
  admissionYear: string;
  setAdmissionYear: (year: string) => void;
  admissionPage: number;
  onResumePayment: (id: string) => void;
  onCancelPending: (id: string) => void;
  isResumingPayment?: boolean;
  isIOSNative?: boolean;
}



type SubViewType = 'ACTIVE' | 'SUCCESSFUL' | 'REJECTED' | null;

export const AdmissionView: React.FC<Props> = ({
  user, serviceRequests, activeRequestId, setActiveRequestId, experts, students,
  onApproveMilestone, onMarkMilestone, onRejectMilestone, onReportVisaRejection, onExpertVerifyRejection, onAddDocument, onEditDocument, onDeleteDocument, onOpenChat, onSeeMoreHistory, onRedirectToDiscover, onViewProfile, onPostFeedback,
  onLoadMoreAdmission, onSearchAdmission, hasMoreAdmission, isFetchingMoreAdmission, admissionSearchQuery, admissionYear, setAdmissionYear, admissionPage,
  onResumePayment, onCancelPending, isResumingPayment, isIOSNative
}) => {


  const [subView, setSubView] = useState<SubViewType>('ACTIVE');
  const [localSearch, setLocalSearch] = useState('');

  const activeRequests = useMemo(() => (serviceRequests || []).filter(r => r.status !== 'COMPLETED' && r.status !== 'REJECTED' && r.visaStatus !== 'DENIED'), [serviceRequests]);
  const completedRequests = useMemo(() => (serviceRequests || []).filter(r => r.status === 'COMPLETED' && r.visaStatus !== 'DENIED'), [serviceRequests]);
  const rejectedRequests = useMemo(() => (serviceRequests || []).filter(r => r.status === 'REJECTED' || r.visaStatus === 'DENIED'), [serviceRequests]);

  const activeRequest = useMemo(() => (serviceRequests || []).find(r => r.id === activeRequestId), [serviceRequests, activeRequestId]);

  const [visibleCount, setVisibleCount] = useState(10);
  const [isFullListView, setIsFullListView] = useState(false);
  const [visibleFullCount, setVisibleFullCount] = useState(10);

  const isExpert = user.role === 'EXPERT' || user.role === 'ADMIN';
  const partner = useMemo(() => {
    if (!activeRequest) return null;
    return isExpert
      ? { id: activeRequest.studentId, name: activeRequest.studentFullName, avatar: activeRequest.studentAvatarUrl }
      : { id: activeRequest.expertId, name: activeRequest.expertFullName, avatar: activeRequest.expertAvatarUrl };
  }, [activeRequest, isExpert]);

  // Sync subView with search when it changes
  useEffect(() => {
    // If we have an activeRequestId (landing from payment success),
    // skip the initial search to prevent wiping out proactively fetched data
    // before the webhook fully updates the server status.
    if (activeRequestId) {
      console.log('[AdmissionView] Search guarded because of activeRequestId:', activeRequestId);
      return;
    }
    
    onSearchAdmission(localSearch, subView);
  }, [subView, admissionYear, activeRequestId]);


  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchAdmission(localSearch, subView);
  };

  const [confirmStep, setConfirmStep] = useState<AdmissionStep | null>(null);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [useLocker, setUseLocker] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveStageId, setApproveStageId] = useState<string | null>(null);
  const [downloadingMsg, setDownloadingMsg] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  const [isHiringAgreementOpen, setIsHiringAgreementOpen] = useState(false);
  const [agreementTargetRequest, setAgreementTargetRequest] = useState<ServiceRequest | null>(null);
  const [clickOrigin, setClickOrigin] = useState<{ x: string, y: string } | null>(null);

  const [isVisaDenialUploadOpen, setIsVisaDenialUploadOpen] = useState(false);
  const [isConfirmDenialOpen, setIsConfirmDenialOpen] = useState(false);
  const [denialFile, setDenialFile] = useState<File | null>(null);
  const [isProcessingDenial, setIsProcessingDenial] = useState(false);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [completionFile, setCompletionFile] = useState<File | null>(null);
  const completionInputRef = useRef<HTMLInputElement>(null);

  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState('');
  const [rejectionFile, setRejectionFile] = useState<File | null>(null);
  const rejectionInputRef = useRef<HTMLInputElement>(null);

  const [showCelebration, setShowCelebration] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState<string | null>(null);
  const celebrationTimerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const denialInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    const mainElement = document.querySelector('main');
    const isAnyModalOpen = !!confirmStep || isAddDocOpen || !!deletingDocId || !!editingDoc || showFeedbackModal || isVisaDenialUploadOpen || isHiringAgreementOpen || isConfirmDenialOpen || isRejectionModalOpen || isCompletionModalOpen || isApproveModalOpen || showCelebration || showThankYouModal;

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      if (mainElement) {
        mainElement.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = 'unset';
      if (mainElement) {
        mainElement.style.overflow = 'auto';
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
      if (mainElement) mainElement.style.overflow = 'auto';
    };
  }, [confirmStep, isAddDocOpen, deletingDocId, editingDoc, showFeedbackModal, isVisaDenialUploadOpen, isHiringAgreementOpen, isConfirmDenialOpen, isRejectionModalOpen, isCompletionModalOpen, showCelebration, isApproveModalOpen, showThankYouModal]);

  const isDone = activeRequest?.status === 'COMPLETED' && activeRequest?.visaStatus === 'APPROVED';
  const isDenied = activeRequest?.status === 'COMPLETED' && activeRequest?.visaStatus === 'DENIED';

  // Trigger Celebration
  useEffect(() => {
    if (activeRequest && (isDone || isDenied) && hasCelebrated !== activeRequest.id) {
      const hasRated = isExpert ? activeRequest.expertRating : activeRequest.studentRating;
      setHasCelebrated(activeRequest.id);
      if (!hasRated) {
        setShowCelebration(true);
      }
    }
  }, [activeRequest?.id, isDone, isDenied, hasCelebrated, isExpert]);

  // Handle Celebration Timer
  useEffect(() => {
    if (showCelebration) {
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = setTimeout(() => {
        setShowCelebration(false);
        setShowFeedbackModal(true);
      }, 3000); // 3 seconds
    }
    return () => {
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    };
  }, [showCelebration]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || '';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const sanitizeFileName = (name: string): string => {
    return name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
  };

  const handleDownload = async (doc: Document | { name: string, url: string }) => {
    setDownloadingMsg(`Preparing ${doc.name}...`);
    try {
      let downloadUrl = doc.url;

      // If it's a private Supabase document, get a signed URL
      const bucketMatch = doc.url.match(/\/storage\/v1\/object\/(?:authenticated|public)\/([^\/]+)\//);
      if (bucketMatch) {
        const bucket = bucketMatch[1];
        const path = doc.url.split(`/${bucket}/`)[1];
        downloadUrl = await api.getFileUrl(bucket, path, false, true);
      }

      const isDataOrBlob = downloadUrl.startsWith('data:') || downloadUrl.startsWith('blob:');
      const isSupabase = downloadUrl.includes('.supabase.co/storage/v1/object/');

      const runFallbackDownload = (url: string) => {
        if (isDataOrBlob || isSupabase) {
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', doc.name);
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          window.open(url, '_blank');
        }
      };

      if (Capacitor.isNativePlatform()) {
        try {
          await Browser.open({ url: downloadUrl });
        } catch (nativeErr) {
          console.warn("[Download] Capacitor browser failed, falling back...", nativeErr);
          runFallbackDownload(downloadUrl);
        }
      } else {
        runFallbackDownload(downloadUrl);
      }
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to prepare document for download.");
    } finally {
      setTimeout(() => setDownloadingMsg(null), 2500);
    }
  };

  const resetUpload = () => {
    setNewDocName('');
    setSelectedFile(null);
    setIsAddDocOpen(false);
    setUseLocker(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert('Only Image and PDF files are accepted.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds the 10MB limit.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSelectedFile(file);
      const nameWithoutExt = file.name.split('.').slice(0, -1).join('.') || file.name;
      setNewDocName(nameWithoutExt);
    }
  };

  const handleUploadDoc = async () => {
    if (!selectedFile || !activeRequest) return;
    setDownloadingMsg("Uploading document...");
    setIsProcessing(true);
    try {
      let fileToUpload: File | Blob = selectedFile;
      const isImage = selectedFile.type.startsWith('image/');

      // Add image compression for files > 2MB
      if (isImage && selectedFile.size > 2 * 1024 * 1024) {
        setDownloadingMsg("Compressing large image...");
        const compressedDataUrl = await compressImage(selectedFile);
        fileToUpload = dataURLtoBlob(compressedDataUrl);
      }

      const sanitizedName = sanitizeFileName(selectedFile.name);
      const fileName = `${Date.now()}-${sanitizedName}`;
      const storagePath = `${activeRequest.id}/${fileName}`;
      
      setDownloadingMsg("Uploading to server...");
      const fileUrl = await api.uploadFile('documents', storagePath, fileToUpload);

      await onAddDocument(activeRequest.id, {
        name: newDocName || selectedFile.name,
        type: selectedFile.type.includes('pdf') ? 'PDF' : 'IMAGE',
        url: fileUrl
      });
      resetUpload();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload document. Please try again.");
    } finally {
      setDownloadingMsg(null);
      setIsProcessing(false);
    }
  };

  const handleAddFromLocker = async (lockerDoc: Document) => {
    if (!activeRequest) return;
    setDownloadingMsg("Adding from Locker...");
    setIsProcessing(true);
    try {
      await onAddDocument(activeRequest.id, {
        name: lockerDoc.name,
        type: lockerDoc.type,
        url: lockerDoc.url
      });
      resetUpload();
    } catch (err) {
      console.error("Failed to add from locker:", err);
      alert("Failed to add document from locker.");
    } finally {
      setDownloadingMsg(null);
      setIsProcessing(false);
    }
  };

  const openAgreement = (e: React.MouseEvent, req: ServiceRequest) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setClickOrigin({
      x: `${rect.left + rect.width / 2}px`,
      y: `${rect.top + rect.height / 2}px`
    });
    setAgreementTargetRequest(req);
    setIsHiringAgreementOpen(true);
  };

  const handleVisaDenialSubmit = async () => {
    if (!denialFile || !activeRequest) return;
    setIsProcessingDenial(true);
    setDownloadingMsg("Processing denial document...");

    try {
      await onReportVisaRejection(activeRequest.id, denialFile);

      setDownloadingMsg(null);
      setIsVisaDenialUploadOpen(false);
      setDenialFile(null);
      setIsProcessingDenial(false);
    } catch (err) {
      console.error("Denial upload failed:", err);
      alert("Failed to process document. Please try again.");
      setDownloadingMsg(null);
      setIsProcessingDenial(false);
    }
  };

  const openSubView = (view: SubViewType) => {
    setSubView(view);
    setVisibleCount(10);
    setVisibleFullCount(10);
    setIsFullListView(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitFeedback = () => {
    if (!activeRequest) return;
    
    if (containsContactInfo(feedbackComment)) {
      setShowSecurityWarning(true);
      return;
    }

    onPostFeedback(activeRequest.id, feedbackRating, feedbackComment);
    setShowFeedbackModal(false);
    setFeedbackComment('');
    setShowThankYouModal(true);
  };

  const renderJourneyCard = (req: ServiceRequest) => {
    const rawStepIdx = ADMISSION_STAGES.findIndex(s => s.id === req.currentStep);
    const stepIdx = rawStepIdx === -1 ? 0 : rawStepIdx;
    const uniqueSteps = Array.from(new Set(req.completedSteps || []));
    const progress = Math.min(100, Math.round((uniqueSteps.length / 8) * 100));
    const partnerAvatar = (isExpert ? req.studentAvatarUrl : req.expertAvatarUrl) || DEFAULT_AVATAR;
    const partnerName = (isExpert ? req.studentFullName : req.expertFullName) || 'Unknown Partner';

    const allKnownUsers = [user, ...experts, ...students];
    const partnerId = isExpert ? req.studentId : req.expertId;
    const partnerProfile = allKnownUsers.find(p => p?.id === partnerId);

    const isDenied = req.visaStatus === 'DENIED';
    const isPendingVisaDenial = (req.isMilestoneRejected || !!req.visaDenialProofUrl) && req.currentStep === 'VISA';
    const isDone = req.status === 'COMPLETED' && !isDenied;
    const isRejected = req.isMilestoneRejected || isDenied || isPendingVisaDenial;

    let statusText = 'Current Milestone';
    let statusColor = 'text-slate-400';

    if (req.status === 'PENDING_PAYMENT') {
      statusText = 'Awaiting Payment';
      statusColor = 'text-amber-500 font-bold';
    } else if (isDenied || isDone) {
      statusText = 'Final Outcome';
      statusColor = isDenied ? 'text-red-400' : 'text-green-400';
    } else if (isPendingVisaDenial) {
      statusText = isExpert ? 'Verification Required' : 'Under Review';
      statusColor = 'text-amber-500 font-bold';
    } else if (req.isMilestoneRejected) {
      statusText = isExpert ? 'Action Required' : 'Waiting for Expert';
      statusColor = 'text-red-600'; 
    } else if (req.isPendingStudentConfirmation) {
      statusText = isExpert ? 'Waiting for Student' : 'Action Required';
      statusColor = isExpert ? 'text-amber-600' : 'text-red-600';
    } else {
      statusText = isExpert ? 'Action Required' : 'Waiting for Expert';
      statusColor = isExpert ? 'text-red-600' : 'text-brand-600';
    }

    const isAwaitingPayment = req.status === 'PENDING_PAYMENT';
    
    return (
      <div 
        key={req.id} 
        onClick={() => {
          if (isAwaitingPayment) return;
          setActiveRequestId(req.id);
        }} 
        className={`relative bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border-2 ${isRejected ? 'border-red-500 dark:border-red-900 shadow-red-500/10' : 'border-gray-100 dark:border-slate-700'} shadow-sm ${isAwaitingPayment ? 'cursor-default opacity-80' : 'hover:shadow-xl hover:border-brand-300 cursor-pointer'} transition-all group animate-fade-in-up flex flex-col h-full`}
      >

        {req.status === 'PENDING_PAYMENT' && !isExpert && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelPending(req.id);
            }}
            className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 dark:bg-slate-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all z-10 border border-transparent hover:border-red-100 dark:hover:border-red-900/30 shadow-sm"
            title="Cancel Admission Initiation"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        )}

        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <img
              src={partnerAvatar}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-brand-50 shadow-sm hover:opacity-80 transition-opacity cursor-pointer"
              alt=""
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile(partnerProfile || partnerId);
              }}
            />
            {req.isPendingStudentConfirmation && <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></div>}
            {isRejected && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></div>}
            {isDone && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white shadow-sm"><i className="fas fa-check"></i></div>}
            {isDenied && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white shadow-sm"><i className="fas fa-times"></i></div>}
          </div>
          <div className="min-w-0 flex-1">
            <h4
              className="font-bold text-base text-slate-900 dark:text-white truncate group-hover:text-brand-600 transition-colors hover:underline cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile(partnerProfile || partnerId);
              }}
            >
              {partnerName}
            </h4>
            <span className="text-[10px] font-black bg-brand-600 text-white px-2 py-0.5 rounded uppercase tracking-widest leading-none inline-block mt-0.5">
              {isExpert ? 'Student' : 'EXPERT'}
            </span>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">
              Started on {req.date}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-xl font-black leading-none ${isDenied ? 'text-red-500' : isDone ? 'text-green-500' : 'text-brand-600'}`}>
              {isDenied || isDone ? '100%' : `${progress}%`}
            </p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Progress</p>
          </div>
        </div>

        <div className="space-y-4 flex-1">
          <div className={`p-3 rounded-2xl border ${isRejected ? 'bg-red-50 border-red-100' : isDenied ? 'bg-red-50 dark:bg-red-900/10 border-red-100' : isDone ? 'bg-green-50 dark:bg-green-900/10 border-green-100' : 'bg-gray-50 dark:bg-slate-900/50 border-gray-100'} dark:border-slate-800`}>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${statusColor}`}>
              {statusText}
            </p>
            <p className={`text-sm font-bold truncate ${isRejected ? 'text-red-700' : ''}`}>
              {isDenied ? 'Visa Rejected' : isPendingVisaDenial ? 'Visa Rejection Reported' : isDone ? 'University Admission Secured' : ADMISSION_STAGES.find(s => s.id === req.currentStep)?.label}
            </p>
          </div>
          <div className="flex -space-x-1.5 overflow-hidden">
            {ADMISSION_STAGES.map((s, idx) => {
              const isCompleted = (req.completedSteps || []).includes(s.id);
              return (
                <div key={s.id} className={`h-1.5 flex-1 rounded-full border-r border-white dark:border-slate-800 ${isCompleted ? 'bg-green-500' : 'bg-gray-100 dark:bg-slate-700'}`} />
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-50 dark:border-slate-700/50 space-y-2">
          {req.status === 'PENDING_PAYMENT' && !isExpert && isIOSNative === false && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isResumingPayment) onResumePayment?.(req.id);
              }}
              disabled={isResumingPayment}
              className={`w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 ${isResumingPayment ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              {isResumingPayment ? (
                <><i className="fas fa-circle-notch fa-spin"></i> Processing...</>
              ) : (
                <><i className="fab fa-stripe text-sm"></i> Complete Payment</>
              )}
            </button>
          )}
          <button
            onClick={(e) => openAgreement(e, req)}
            className="w-full py-2.5 bg-gray-50 dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-slate-400 hover:text-brand-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-transparent hover:border-brand-100"
          >
            <i className="fas fa-file-contract mr-2"></i> View Agreement
          </button>
        </div>

      </div>
    );
  };

  const renderActiveRequest = () => {
    if (!activeRequest) return null;
    const rawStepIdx = ADMISSION_STAGES.findIndex(s => s.id === activeRequest.currentStep);
    const stepIdx = rawStepIdx === -1 ? 0 : rawStepIdx;
    const uniqueCompleted = Array.from(new Set(activeRequest.completedSteps || []));
    const progress = Math.min(100, Math.round((uniqueCompleted.length / 8) * 100));

    if (!partner) return null; // Safety check

    const isDenied = activeRequest.visaStatus === 'DENIED';
    const isDone = activeRequest.status === 'COMPLETED' && !isDenied;

    const allKnownUsers = [user, ...experts, ...students];
    const partnerId = isExpert ? activeRequest.studentId : activeRequest.expertId;
    const partnerProfile = allKnownUsers.find(p => p?.id === partnerId);

    return (
      <div className="pb-24 space-y-8 animate-fade-in-up">
        {downloadingMsg && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[6000] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in-up flex items-center gap-2">
            {downloadingMsg.includes('Uploading') || downloadingMsg.includes('Adding') ? (
              <i className="fas fa-spinner fa-spin text-brand-400"></i>
            ) : (
              <i className="fas fa-file-download text-brand-400"></i>
            )}
            {downloadingMsg}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={() => setActiveRequestId(null)} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 transition font-bold text-sm">
            <i className="fas fa-arrow-left"></i> Back to Journeys
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChat(isExpert ? { id: activeRequest.studentId, fullName: activeRequest.studentFullName, avatarUrl: activeRequest.studentAvatarUrl || '' } as any : { id: activeRequest.expertId, fullName: activeRequest.expertFullName, avatarUrl: activeRequest.expertAvatarUrl || '' } as any)}
              className="px-4 py-2 bg-brand-50 dark:bg-brand-900/40 text-brand-600 rounded-xl text-xs font-bold hover:bg-brand-100 transition flex items-center gap-2"
            >
              <Icons.Chat /> Open Chat
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-gray-50 dark:border-slate-700 text-left">
            <div className="flex items-center gap-5">
              <img
                src={partner.avatar || DEFAULT_AVATAR}
                className="w-16 h-16 rounded-[1.5rem] object-cover border-4 border-brand-50 shadow-sm cursor-pointer hover:opacity-80 transition"
                alt=""
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProfile(partnerProfile || partnerId);
                }}
              />
              <div>
                <h3
                  className="text-2xl font-black text-slate-900 dark:text-white leading-tight cursor-pointer hover:text-brand-600 transition hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewProfile(partnerProfile || partnerId);
                  }}
                >
                  {partner.name}
                </h3>
                <p className="text-xs font-black text-brand-600 uppercase tracking-[0.2em] mt-1">{isExpert ? 'Student' : 'EXPERT'}</p>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 min-w-[200px] text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Progress</p>
              <div className="text-4xl font-black text-brand-600 mb-2">{isDenied || isDone ? '100%' : `${progress}%`}</div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                <i className="far fa-calendar-alt text-brand-500"></i>
                Started on {activeRequest.date}
              </p>
              <div className="h-2 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-brand-600 transition-all duration-500" style={{ width: `${isDenied || isDone ? 100 : progress}%` }} />
              </div>
            </div>
          </div>

          <div className="space-y-12">
            <section className="text-left">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Collaborative Board</h4>
                {isDenied || isDone ? (
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${isDenied ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                    {isDenied ? 'Journey Closed: Visa Denied' : 'Journey Completed: Successful Study Abroad'}
                  </span>
                ) : null}
              </div>

              <div className="relative pt-4 pb-8 overflow-x-auto scrollbar-hide">
                <div className="flex gap-6 pb-6 overflow-x-auto snap-x scrollbar-hide">
                  {ADMISSION_STAGES.map((s, stepIdx) => {
                    const isCompleted = (activeRequest.completedSteps || []).includes(s.id);
                    const isCurrent = activeRequest.currentStep === s.id;

                    const isVisaDenied = s.id === 'VISA' && isDenied;

                    return (
                      <div key={s.id} className={`flex-1 min-w-[240px] p-6 rounded-3xl border transition-all relative ${isCompleted ? (isVisaDenied ? 'bg-red-50/30 dark:bg-red-900/10 border-red-500 shadow-md shadow-red-500/10' : 'bg-white dark:bg-slate-800 border-green-500 shadow-md shadow-green-500/10') :
                        isCurrent ? (isVisaDenied ? 'bg-red-50 border-red-500 shadow-xl shadow-red-500/10' : 'bg-brand-50/50 dark:bg-brand-900/10 border-brand-200 shadow-xl shadow-brand-500/5') :
                          'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 opacity-40'
                        }`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 shadow-sm relative ${isCompleted ? 'bg-green-500 text-white' :
                          isCurrent ? 'bg-brand-600 text-white' :
                            'bg-gray-50 dark:bg-slate-700 text-slate-300'
                          }`}>
                          <i className={`fas ${s.icon}`}></i>
                          {isCompleted && s.id === 'ACCOMMODATION' && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center animate-bounce">
                              <i className="fas fa-star text-[8px] text-white"></i>
                            </div>
                          )}
                        </div>
                        <h5 className="font-bold text-xl mb-2 text-slate-900 dark:text-white">{s.label}</h5>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{s.description}</p>

                        {activeRequest.milestoneDates?.[s.id] && (
                          <div className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-xl w-fit">
                            <i className="fas fa-calendar-check text-[10px] text-green-600"></i>
                            <span className="text-[10px] font-bold text-green-600 uppercase tracking-tight">
                              {isCompleted ? 'Done' : 'Started'} on {activeRequest.milestoneDates[s.id]}
                            </span>
                          </div>
                        )}

                        {/* Step History (Completion/Rejection Notes) */}
                        {(() => {
                          const rawHistory = (activeRequest.milestoneHistory || []).filter(h => h.step === s.id);
                          if (rawHistory.length === 0) return null;

                          // Deduplicate: Some race conditions or optimistic updates might result in double entries
                          const stepHistory = rawHistory.filter((h, idx) => {
                            const firstIdx = rawHistory.findIndex(other =>
                              other.step === h.step &&
                              other.type === h.type &&
                              other.note === h.note &&
                              Math.abs(new Date(other.timestamp || 0).getTime() - new Date(h.timestamp || 0).getTime()) < 2000
                            );
                            return idx === firstIdx;
                          });

                          return (
                            <div className="space-y-3 mt-4">
                              {[...stepHistory].reverse().map((h, hIdx) => {
                                const isRejection = h.type === 'REJECTED';
                                const isAuthor = h.uploadedBy === user?.id;

                                return (
                                  <div key={hIdx} className={`p-3 rounded-2xl text-left border ${isRejection
                                    ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
                                    : 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30'
                                    }`}>
                                    <h6 className={`text-[10px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1 ${isRejection ? 'text-red-600' : 'text-green-600'
                                      }`}>
                                      <i className={`fas ${isRejection ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
                                      {isRejection
                                        ? (isAuthor ? 'Your Change Request' : 'Student Feedback')
                                        : (isAuthor ? 'Your Completion Note' : 'Expert Completion Note')
                                      }
                                    </h6>
                                    {h.note && (
                                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-2">
                                        {h.note}
                                      </p>
                                    )}
                                    {h.documentUrl && (
                                      <button
                                        onClick={() => handleDownload({ name: `${s.id}_Proof`, url: h.documentUrl! })}
                                        className={`flex items-center gap-2 p-1.5 bg-white dark:bg-slate-800 border rounded-lg text-[10px] font-bold transition shadow-sm ${isRejection
                                          ? 'border-red-100 dark:border-red-900/40 text-red-600 hover:bg-red-50'
                                          : 'border-green-100 dark:border-green-900/40 text-green-600 hover:bg-green-50'
                                          }`}
                                      >
                                        <i className="fas fa-file-invoice"></i> View {isRejection ? 'Reference' : 'Attachment'}
                                      </button>
                                    )}
                                    <p className="text-[7px] text-slate-400 mt-2 font-medium">
                                      {h.timestamp ? new Date(h.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Date N/A'}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {isCurrent && !isDenied && !isDone && (
                          <div className="mt-6 pt-6 border-t border-brand-100 dark:border-brand-900/30 space-y-4">
                            {isExpert ? (
                              activeRequest.isMilestoneRejected && activeRequest.currentStep === 'VISA' ? (
                                <div className="space-y-4 animate-fade-in-up">
                                  <div className="p-4 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-left">
                                    <h6 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                      <i className="fas fa-file-invoice"></i> Visa Rejection Reported
                                    </h6>
                                    {activeRequest.visaDenialProofUrl && (
                                      <button
                                        onClick={() => handleDownload({ name: 'Visa_Denial_Proof', url: activeRequest.visaDenialProofUrl! })}
                                        className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/40 rounded-xl text-[10px] font-bold text-red-600 hover:bg-red-50 transition shadow-sm w-full justify-center"
                                      >
                                        <i className="fas fa-file-pdf"></i> View Student's Proof
                                      </button>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => setIsConfirmDenialOpen(true)}
                                    className="w-full py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition"
                                  >
                                    Verify & Close Journey
                                  </button>
                                </div>
                              ) : !activeRequest.isPendingStudentConfirmation ? (
                                <button
                                  onClick={() => setIsCompletionModalOpen(true)}
                                  className="w-full py-3 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition"
                                >
                                  Mark as Complete
                                </button>
                              ) : (
                                <div className="space-y-4">
                                  <div className="text-center py-2 px-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100">
                                    <p className="text-[10px] font-bold text-amber-600">Pending Student Approval</p>
                                  </div>
                                </div>
                              )
                            ) : (
                              activeRequest.isPendingStudentConfirmation ? (
                                <div className="space-y-4 animate-fade-in-up">
                                  <p className="text-[10px] font-black text-amber-600 uppercase text-center">Review & Approve</p>
                                  <button
                                    disabled={isProcessing}
                                    onClick={async () => {
                                      const nextIdx = stepIdx + 1;
                                      const nextStep = nextIdx < ADMISSION_STAGES.length ? ADMISSION_STAGES[nextIdx].id : activeRequest.currentStep;
                                      setApproveStageId(nextStep);
                                      setIsApproveModalOpen(true);
                                    }}
                                    className="w-full py-3 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                  >
                                    {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : null}
                                    {stepIdx === ADMISSION_STAGES.length - 1 ? 'Approve & Complete Journey' : 'Approve & Move Next'}
                                  </button>

                                  {(activeRequest.currentStep === 'VISA' || (activeRequest.rejectionCount || 0) < 1) ? (
                                    activeRequest.currentStep === 'VISA' && activeRequest.visaDenialProofUrl ? (
                                      <div className="p-4 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-left">
                                        <h6 className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                                          <i className="fas fa-file-invoice"></i> Visa Rejection Reported
                                        </h6>
                                        <button
                                          onClick={() => handleDownload({ name: 'Visa_Denial_Proof', url: activeRequest.visaDenialProofUrl! })}
                                          className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-red-100 dark:border-red-900/40 rounded-xl text-[10px] font-bold text-red-600 hover:bg-red-50 transition shadow-sm w-full justify-center"
                                        >
                                          <i className="fas fa-file-pdf"></i> View Submitted Proof
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          if (activeRequest.currentStep === 'VISA') {
                                            setIsVisaDenialUploadOpen(true);
                                          } else {
                                            setIsRejectionModalOpen(true);
                                          }
                                        }}
                                        className="w-full py-3 bg-white text-red-500 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition"
                                      >
                                        {activeRequest.currentStep === 'VISA' ? 'Report Visa Rejection' : 'Request Changes'}
                                      </button>
                                    )
                                  ) : (
                                    <p className="text-[10px] text-slate-400 font-bold text-center mt-2 italic px-2">
                                      Revision limit reached. Please approve or contact support.
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <p className="text-[10px] text-brand-600 text-center font-bold italic">Waiting for Expert update...</p>
                                </div>
                              )
                            )}

                            {isExpert && activeRequest.isMilestoneRejected && (
                              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/50 rounded-2xl animate-fade-in-up text-left">
                                <p className="text-[10px] font-black text-red-600 uppercase text-center">Revision Requested</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7 space-y-10">
                <section className="text-left">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Shared Documents</h4>
                    {!(isDenied || isDone) && (
                      <button
                        onClick={() => setIsAddDocOpen(true)}
                        className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline flex items-center gap-2"
                      >
                        <Icons.Plus /> Add Document
                      </button>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {(!activeRequest.documents || activeRequest.documents.length === 0) ? (
                      <div className="sm:col-span-2 py-10 text-center bg-gray-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
                        <p className="text-xs text-slate-400 font-medium">No documents shared in this journey.</p>
                      </div>
                    ) : (
                      (activeRequest.documents || []).map(doc => {
                        const uploader = (doc.uploadedBy === user.id ? 'You' : partner.name);
                        return (
                          <div key={doc.id} className="group p-4 bg-gray-50 dark:bg-slate-900 rounded-[1.5rem] border border-gray-100 dark:border-slate-700 flex flex-col gap-3 hover:border-brand-200 transition relative overflow-hidden text-left">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg ${doc.type === 'PDF' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                <i className={`fas ${doc.type === 'PDF' ? 'fa-file-pdf' : 'fa-file-image'}`}></i>
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate text-slate-800 dark:text-slate-200">{doc.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{uploader} • {new Date(doc.timestamp).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDownload(doc)}
                                className="flex-1 py-2 bg-white dark:bg-slate-800 text-brand-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-brand-50 shadow-sm hover:bg-brand-50 transition"
                              >
                                Download
                              </button>
                              {doc.uploadedBy === user.id && !(isDenied || isDone) && (
                                <>
                                  <button onClick={() => { setEditingDoc(doc); setNewDocName(doc.name); }} className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-brand-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition shadow-sm"><i className="fas fa-edit text-[10px]"></i></button>
                                  <button onClick={() => setDeletingDocId(doc.id)} className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-brand-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition shadow-sm"><i className="fas fa-trash-alt text-[10px]"></i></button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>

              <div className="lg:col-span-5 space-y-10">
                <section className="text-left">
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6">Service Contract</h4>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-gray-100 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-800 overflow-hidden">
                    <div className="p-5 space-y-3">
                      <div className="flex flex-col gap-1 text-xs items-start">
                        <span className="text-slate-400 font-bold uppercase tracking-widest">Target Degree</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-left">{activeRequest.questionnaire?.lastEducation}</span>
                      </div>
                      <div className="flex flex-col gap-1 text-xs items-start">
                        <span className="text-slate-400 font-bold uppercase tracking-widest">Target Countries</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-left">{activeRequest.questionnaire?.targetCountries}</span>
                      </div>
                    </div>
                    <div className="p-5 bg-white dark:bg-slate-800/40 space-y-4">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escrow Total</span>
                        <div className="text-right">
                          <div className="text-2xl font-black text-slate-900 dark:text-white">${activeRequest.fee}</div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Paid</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => openAgreement(e, activeRequest)}
                        className="w-full py-3 border border-brand-100 dark:border-brand-900/50 rounded-xl text-[10px] font-black text-brand-600 uppercase tracking-widest hover:bg-brand-50 dark:hover:bg-brand-900/20 transition"
                      >
                        View Agreement Form
                      </button>
                    </div>
                  </div>
                </section>

                {(isDenied || isDone) && (
                  <div className={`p-6 rounded-[2.5rem] border animate-fade-in-up text-left ${isDenied ? 'bg-red-50 dark:bg-red-900/10 border-red-100' : 'bg-green-50 dark:bg-green-900/10 border-green-100'}`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${isDenied ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                        <i className={`fas ${isDenied ? 'fa-times' : 'fa-check-circle'}`}></i>
                      </div>
                      <div>
                        <h4 className={`text-lg font-black ${isDenied ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                          {isDenied ? 'Visa Rejected' : 'Admission Success'}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Journey Outcome</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-6">
                      {isDenied
                        ? isExpert
                          ? `Visa rejection confirmed. As per the protection policy, 20% of the fee ($${(activeRequest.fee * 0.2).toFixed(2)}) has been released to your wallet for your services, and 20% has been refunded to the student.`
                          : `Visa rejection confirmed. As per our protection policy, a 20% refund ($${(activeRequest.fee * 0.2).toFixed(2)}) has been initiated to your wallet. The expert has been paid 20% for their assistance.`
                        : isExpert
                          ? `Congratulations! The student has approved the final milestone. All journey fees (80% total) have been successfully released to your wallet.`
                          : `Congratulations! Your journey to study abroad is now complete. All journey fees (80% total) have been successfully released to ${activeRequest.expertFullName}.`
                      }
                    </p>

                    {isDenied && activeRequest.visaDenialProofUrl && (
                      <button
                        onClick={() => handleDownload({ name: 'Visa_Denial_Proof', url: activeRequest.visaDenialProofUrl! })}
                        className="w-full py-3 mb-6 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 hover:bg-red-100 transition flex items-center justify-center gap-2"
                      >
                        <i className="fas fa-file-pdf"></i> View Submitted Proof
                      </button>
                    )}

                    <div className="space-y-4 pt-4 border-t border-white/50 dark:border-white/5">
                      {(isExpert ? activeRequest.expertRating : activeRequest.studentRating) ? (
                        <div className="p-4 bg-white/40 dark:bg-slate-800/40 rounded-2xl border border-white/20">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Your Feedback</p>
                          <div className="flex gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map(s => (
                              <i key={s} className={`fas fa-star text-[10px] ${s <= (isExpert ? activeRequest.expertRating! : activeRequest.studentRating!) ? 'text-amber-400' : 'text-slate-200'}`}></i>
                            ))}
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 italic">"{isExpert ? activeRequest.expertFeedback : activeRequest.studentFeedback}"</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowFeedbackModal(true)}
                          className={`w-full py-4 ${isDenied ? 'bg-red-600 text-white' : 'bg-white/90 dark:bg-slate-800/90 text-slate-900 dark:text-white'} rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md transition active:scale-[0.98]`}
                        >
                          Share your experience
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSubView(isDenied ? 'REJECTED' : 'SUCCESSFUL');
                        setActiveRequestId(null);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full py-4 bg-transparent text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-brand-600 transition"
                    >
                      Close Details
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSubView = () => {
    const list = subView === 'ACTIVE' ? activeRequests : subView === 'SUCCESSFUL' ? completedRequests : subView === 'REJECTED' ? rejectedRequests : (serviceRequests || []);
    const title = subView === 'ACTIVE' ? 'Active Journeys' : subView === 'SUCCESSFUL' ? 'Successful Study Abroad' : subView === 'REJECTED' ? 'Rejected Journeys' : 'All Journeys';

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left text-slate-900 dark:text-white">
            <button onClick={() => setSubView(null)} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 transition shadow-sm">
              <i className="fas fa-arrow-left"></i>
            </button>
            <h2 className="text-xl font-black uppercase tracking-tight">{title}</h2>
          </div>

          <div className="flex flex-1 max-w-2xl items-center gap-3">
            <div className="relative">
              <select
                value={admissionYear}
                onChange={(e) => setAdmissionYear(e.target.value)}
                className="pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition shadow-sm appearance-none cursor-pointer"
              >
                <option>All Years</option>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
              <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
            </div>

            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search within this category..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition shadow-sm"
              />
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map(req => renderJourneyCard(req))}
        </div>

        {list.length === 0 && !isFetchingMoreAdmission && (
          <div className="pt-4 pb-20 text-center animate-fade-in-up">
            <div className="max-w-md mx-auto px-6">
              <div className="w-24 h-24 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">
                {subView === 'ACTIVE' ? <Icons.Admission /> : subView === 'SUCCESSFUL' ? <i className="fas fa-trophy"></i> : <i className="fas fa-folder-open"></i>}
              </div>

              {((admissionSearchQuery && admissionSearchQuery.trim() !== '') || (admissionYear !== 'All Years')) ? (
                <>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">No matching journeys</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-10">
                    We couldn't find any journeys matching your search for "{admissionSearchQuery}" in {admissionYear === 'All Years' ? 'all years' : admissionYear}.
                  </p>
                  <button
                    onClick={() => { setLocalSearch(''); setAdmissionYear('All Years'); onSearchAdmission('', subView); }}
                    className="px-8 py-3 bg-white dark:bg-slate-800 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest border border-gray-100 shadow-sm"
                  >
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                    {subView === 'ACTIVE'
                      ? (isExpert ? 'No Active Journeys' : 'Start Your Journey')
                      : (subView === 'SUCCESSFUL' ? 'No Successful Journeys' : 'No Results Found')}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-10">
                    {subView === 'ACTIVE'
                      ? (isExpert
                        ? "You don't have any students currently in progress. Browse student requests to start a new collaboration."
                        : "Ready to study abroad? Connect with an expert and launch your admission journey today.")
                      : (subView === 'SUCCESSFUL'
                        ? "Your achievements will appear here as you complete milestones and reach your study abroad goals."
                        : "We couldn't find any journeys in this category. Your adventure awaits!")}
                  </p>

                  {subView === 'ACTIVE' && onRedirectToDiscover && (
                    <button
                      onClick={onRedirectToDiscover}
                      className="px-10 py-4 bg-brand-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95"
                    >
                      {isExpert ? 'Discover Students' : 'Discover Experts'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {hasMoreAdmission && (
          <div className="flex justify-center pt-8">
            <button
              onClick={onLoadMoreAdmission}
              disabled={isFetchingMoreAdmission}
              className="px-8 py-3 bg-white dark:bg-slate-800 text-brand-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-brand-100 dark:border-slate-700 shadow-sm hover:bg-brand-50 active:scale-95 transition disabled:opacity-50"
            >
              {isFetchingMoreAdmission ? 'Loading more...' : 'Load more journeys'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const currentRequests = subView === 'REJECTED' ? rejectedRequests : (subView === 'SUCCESSFUL' ? completedRequests : activeRequests);
  const displayedRequests = currentRequests.slice(0, visibleCount);
  const hasMoreThanLimit = currentRequests.length > 10;

  return (
    <div className="relative">
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-fade-in" onClick={() => setShowCelebration(false)}>
          <div className="text-center max-w-lg">
            <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-[2.5rem] flex items-center justify-center text-6xl text-white mx-auto mb-8 shadow-2xl shadow-yellow-500/40 rotate-12 scale-110 animate-bounce-in">
              <i className={`fas ${isDenied ? 'fa-shield-halved' : 'fa-trophy'}`}></i>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
              {isDenied ? 'Visa Protection Activated!' : 'Congratulations!'}
            </h2>
            <p className="text-xl text-yellow-100 font-bold mb-8 leading-relaxed">
              {isDenied
                ? "Your journey concluded with a visa denial. Don't worry, your protection policy has been processed."
                : "Your Study Abroad journey has reached its successful destination! We're so proud of your achievement."}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Outcome</p>
                <p className="text-lg font-black text-white uppercase">{isDenied ? 'Visa Denied' : 'Study Abroad Finalized'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Status</p>
                <p className="text-lg font-black text-white uppercase">Completed</p>
              </div>
            </div>
            <p className="mt-12 text-white/40 text-xs font-bold animate-pulse italic">Taking you to feedback in a moment...</p>
          </div>
        </div>
      )}
      {activeRequest && activeRequest.status !== 'PENDING_PAYMENT' ? (
        renderActiveRequest()
      ) : (subView || (localSearch.trim() || admissionYear !== 'All Years')) ? (
        renderSubView()
      ) : (
        <div className="pb-24 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1 text-left">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">Admissions</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Manage and track your study abroad journeys.</p>
            </div>


            <div className="flex gap-2 overflow-x-auto pb-4 -mb-4 scrollbar-hide flex-nowrap whitespace-nowrap px-1">
              <button 
                onClick={() => openSubView(null)} 
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex-shrink-0 transition-all ${subView === null ? 'bg-brand-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/10'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => openSubView('ACTIVE')} 
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex-shrink-0 transition-all ${subView === 'ACTIVE' ? 'bg-brand-600 text-white shadow-lg' : 'bg-brand-50/50 dark:bg-brand-900/10 text-brand-600 hover:bg-brand-100 border border-brand-100 dark:border-brand-900/30'}`}
              >
                Active
              </button>
              <button 
                onClick={() => openSubView('SUCCESSFUL')} 
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex-shrink-0 transition-all ${subView === 'SUCCESSFUL' ? 'bg-green-600 text-white shadow-lg' : 'bg-green-50/50 dark:bg-green-900/10 text-green-600 hover:bg-green-100 border border-green-100 dark:border-green-900/30'}`}
              >
                Successful
              </button>
              <button 
                onClick={() => openSubView('REJECTED')} 
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex-shrink-0 transition-all ${subView === 'REJECTED' ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50/50 dark:bg-red-900/10 text-red-600 hover:bg-red-100 border border-red-100 dark:border-red-900/30'}`}
              >
                Rejected
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Active Card */}
            <div onClick={() => openSubView('ACTIVE')} className="group p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-gray-100 dark:border-slate-700 hover:shadow-2xl hover:shadow-brand-500/10 transition-all cursor-pointer text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <i className="fas fa-rocket text-6xl -rotate-12"></i>
              </div>
              <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded-2xl flex items-center justify-center text-2xl mb-6"><Icons.Admission /></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Active</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {activeRequests.length > 0 ? `Track your ${activeRequests.length} ongoing study abroad ${activeRequests.length === 1 ? 'journey' : 'journeys'}.` : 'Keep track of your current progress and milestones.'}
              </p>
              <div className="mt-8 flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-widest">
                View All <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
              </div>
            </div>

            {/* Successful Card */}
            <div onClick={() => openSubView('SUCCESSFUL')} className="group p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-gray-100 dark:border-slate-700 hover:shadow-2xl hover:shadow-green-500/10 transition-all cursor-pointer text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <i className="fas fa-trophy text-6xl -rotate-12 text-green-600"></i>
              </div>
              <div className="w-14 h-14 bg-green-50 dark:bg-green-900/30 text-green-600 rounded-2xl flex items-center justify-center text-2xl mb-6"><i className="fas fa-check-circle"></i></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Successful</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {completedRequests.length > 0 ? `Review your ${completedRequests.length} successful admission ${completedRequests.length === 1 ? 'achievement' : 'achievements'}.` : 'Review your completed and successful admissions.'}
              </p>
              <div className="mt-8 flex items-center gap-2 text-green-600 font-black text-[10px] uppercase tracking-widest">
                View All <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
              </div>
            </div>

            {/* Rejected Card */}
            <div onClick={() => openSubView('REJECTED')} className="group p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-gray-100 dark:border-slate-700 hover:shadow-2xl hover:shadow-red-500/10 transition-all cursor-pointer text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <i className="fas fa-exclamation-triangle text-6xl -rotate-12 text-red-600"></i>
              </div>
              <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 text-red-600 rounded-2xl flex items-center justify-center text-2xl mb-6"><i className="fas fa-times-circle"></i></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Rejected</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {rejectedRequests.length > 0 ? `Manage and handle ${rejectedRequests.length} rejected or denied journey ${rejectedRequests.length === 1 ? 'result' : 'results'}.` : 'Review and handle your rejected admission results.'}
              </p>
              <div className="mt-8 flex items-center gap-2 text-red-600 font-black text-[10px] uppercase tracking-widest">
                View All <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
              </div>
            </div>
          </div>
        </div>
      )}

      {isHiringAgreementOpen && agreementTargetRequest && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => { setIsHiringAgreementOpen(false); setClickOrigin(null); }}>
          <div
            className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-xl w-full max-h-[90vh] overflow-y-auto p-8 md:p-10 shadow-2xl scrollbar-hide relative transform transition-all duration-300 animate-agreement-pop"
            style={{ transformOrigin: clickOrigin ? `${clickOrigin.x} ${clickOrigin.y}` : 'center' }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => { setIsHiringAgreementOpen(false); setClickOrigin(null); }} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition z-10"><i className="fas fa-times text-xl"></i></button>
            <div className="mb-8 text-left">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Admission Agreement</h3>
              <p className="text-sm text-slate-500 font-medium">Full details of the hiring questionnaire and terms accepted.</p>
            </div>

            <div className="space-y-8">
              <section className="text-left">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-2 mb-4">Student Profile Data</h4>
                <div className="grid grid-cols-2 gap-4">
                  <AgreementInfo label="Nationality" value={agreementTargetRequest.questionnaire?.nationality} />
                  <AgreementInfo label="Current residency" value={agreementTargetRequest.questionnaire?.residency} />
                  <AgreementInfo label="Languages" value={agreementTargetRequest.questionnaire?.languages} />
                  <AgreementInfo label="Academic level" value={agreementTargetRequest.questionnaire?.lastEducation} />
                  <AgreementInfo label="Target countries" value={agreementTargetRequest.questionnaire?.targetCountries} />
                  <AgreementInfo label="Target unis" value={agreementTargetRequest.questionnaire?.targetUnis} />
                </div>
              </section>

              <section className="text-left">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-2 mb-4">Hiring Documents</h4>
                {(!agreementTargetRequest.hiringDocuments || agreementTargetRequest.hiringDocuments.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No hiring documents recorded.</p>
                ) : (
                    <div className="grid gap-3">
                      {agreementTargetRequest.hiringDocuments.map(doc => {
                        const [title, fileName] = doc.name.includes(': ') 
                          ? doc.name.split(': ') 
                          : ['Document', doc.name];

                        return (
                          <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl gap-3">
                            <div className="flex gap-3 overflow-hidden items-start">
                              <i className={`fas ${doc.type === 'PDF' ? 'fa-file-pdf text-red-500' : 'fa-file-image text-blue-500'} text-lg flex-shrink-0 mt-1`}></i>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{fileName}</span>
                              </div>
                            </div>
                            <button onClick={() => handleDownload(doc)} className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-slate-800 sm:bg-transparent border border-gray-100 sm:border-none rounded-lg text-brand-600 hover:underline text-[10px] font-black uppercase tracking-widest transition-colors">Download</button>
                          </div>
                        );
                      })}
                    </div>
                )}
              </section>

              <section className="text-left">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-2 mb-4">Terms Accepted</h4>
                <div className="space-y-2">
                  <TermTag label="Service Scope" value="Covered (Max 4 Unis/Countries)" checked={agreementTargetRequest.agreements?.maxLimit} />
                  <TermTag label="Outcome Policy" value="Understood (No Guarantee of Success)" checked={agreementTargetRequest.agreements?.noResponsibility} />
                  <TermTag label="Refund Policy" value="Accepted (20% Protection Guarantee)" checked={agreementTargetRequest.agreements?.refundPolicy} />
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {
        isAddDocOpen && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={resetUpload}>
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-md w-full max-h-[80vh] overflow-y-auto p-8 shadow-2xl animate-fade-in-up relative no-scrollbar" onClick={e => e.stopPropagation()}>
              <button onClick={resetUpload} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition z-10"><i className="fas fa-times text-xl"></i></button>
              <h3 className="text-xl font-bold mb-6 text-left">Add Document</h3>
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-900 rounded-2xl mb-8">
                <button onClick={() => setUseLocker(false)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition ${!useLocker ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm' : 'text-slate-400'}`}>New Upload</button>
                <button onClick={() => setUseLocker(true)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition ${useLocker ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm' : 'text-slate-400'}`}>From Locker</button>
              </div>
              {useLocker ? (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
                  {(!user.commonDocuments || user.commonDocuments.length === 0) ? (
                    <p className="text-xs text-slate-400 italic text-center py-10">Your locker is empty.</p>
                  ) : (
                    user.commonDocuments.map(ldoc => (
                      <div key={ldoc.id} onClick={() => handleAddFromLocker(ldoc)} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:border-brand-500 transition group text-left">
                        <div className="flex items-center gap-3">
                          <i className={`fas ${ldoc.type === 'PDF' ? 'fa-file-pdf text-red-500' : 'fa-file-image text-blue-500'}`}></i>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{ldoc.name}</span>
                        </div>
                        <i className="fas fa-plus text-slate-300 group-hover:text-brand-600 text-xs"></i>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div onClick={() => fileInputRef.current?.click()} className="w-full border-4 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl p-10 text-center cursor-pointer hover:border-brand-500 transition bg-gray-50/50 dark:bg-slate-900/50 group">
                    <i className="fas fa-cloud-upload-alt text-3xl text-brand-200 group-hover:text-brand-500 transition mb-4 block"></i>
                    {selectedFile ? <div className="text-xs font-bold text-brand-600 truncate px-4">{selectedFile.name}</div> : <div className="text-xs text-slate-400 font-medium">PDF or Image (Max 10MB)</div>}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf,image/*" />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Document Label</label>
                    <input type="text" value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="e.g. Passport Bio, Bank Letter" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white font-medium" />
                  </div>
                  <button onClick={handleUploadDoc} disabled={!selectedFile || isProcessing} className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-lg shadow-brand-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : 'Upload to Journey'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      }

      {
        editingDoc && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !isProcessing && setEditingDoc(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl animate-fade-in-up scrollbar-hide relative" onClick={e => e.stopPropagation()}>
              {!isProcessing && <button onClick={() => setEditingDoc(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition z-10"><i className="fas fa-times text-xl"></i></button>}
              <h3 className="text-xl font-bold mb-4 text-left">Rename Document</h3>
              <div className="space-y-4">
                <input type="text" disabled={isProcessing} value={newDocName} onChange={e => setNewDocName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white font-medium disabled:opacity-50" />
                <div className="flex gap-2">
                  <button disabled={isProcessing} onClick={() => { setEditingDoc(null); setNewDocName(''); }} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-bold transition hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                  <button
                    disabled={isProcessing}
                    onClick={async () => {
                      if (editingDoc && newDocName.trim()) {
                        setIsProcessing(true);
                        try {
                          await onEditDocument(activeRequest.id, editingDoc.id, newDocName);
                          setEditingDoc(null);
                          setNewDocName('');
                        } finally {
                          setIsProcessing(false);
                        }
                      }
                    }}
                    className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        deletingDocId && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => !isProcessing && setDeletingDocId(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-sm w-full p-8 text-center shadow-2xl animate-fade-in-up relative" onClick={e => e.stopPropagation()}>
              {!isProcessing && <button onClick={() => setDeletingDocId(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition z-10"><i className="fas fa-times text-xl"></i></button>}
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"><i className="fas fa-trash-alt"></i></div>
              <h3 className="text-xl font-bold mb-2">Delete Document?</h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">This will remove the file from this journey for both parties.</p>
              <div className="flex gap-3">
                <button disabled={isProcessing} onClick={() => setDeletingDocId(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-bold transition hover:bg-gray-200 disabled:opacity-50">Cancel</button>
                <button
                  disabled={isProcessing}
                  onClick={async () => {
                    setIsProcessing(true);
                    try {
                      await onDeleteDocument(activeRequest.id, deletingDocId);
                      setDeletingDocId(null);
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )
      }



      {isVisaDenialUploadOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsVisaDenialUploadOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl animate-fade-in-up relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsVisaDenialUploadOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition z-10"><i className="fas fa-times text-xl"></i></button>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"><i className="fas fa-exclamation-triangle"></i></div>
            <h3 className="text-xl font-bold mb-2 text-center">Report Visa Rejection</h3>
            <p className="text-sm text-slate-500 mb-6 text-center">We're sorry to hear this. Please upload your rejection letter/proof so our experts can verify it and process your refund.</p>

            <div onClick={() => denialInputRef.current?.click()} className="w-full border-4 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl p-8 text-center cursor-pointer hover:border-brand-500 transition bg-gray-50/50 dark:bg-slate-900/50 mb-6">
              <i className="fas fa-cloud-upload-alt text-3xl text-brand-200 mb-3 block"></i>
              {denialFile ? <div className="text-xs font-bold text-brand-600 truncate px-4">{denialFile.name}</div> : <div className="text-xs text-slate-400 font-medium">Upload Rejection Letter (PDF/Image)</div>}
              <input
                type="file"
                ref={denialInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                      alert('Only Image and PDF files are accepted.');
                      if (denialInputRef.current) denialInputRef.current.value = '';
                      return;
                    }
                    if (file.size > 10 * 1024 * 1024) {
                      alert('File size exceeds the 10MB limit.');
                      if (denialInputRef.current) denialInputRef.current.value = '';
                      return;
                    }
                    setDenialFile(file);
                  }
                }}
                className="hidden"
                accept="application/pdf,image/*"
              />
            </div>

            <button
              disabled={!denialFile || isProcessingDenial}
              onClick={async () => {
                if (!denialFile) return;
                setIsProcessingDenial(true);
                try {
                  await onReportVisaRejection(activeRequest.id, denialFile);
                  setIsVisaDenialUploadOpen(false);
                  setDenialFile(null);
                } finally {
                  setIsProcessingDenial(false);
                }
              }}
              className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessingDenial ? <i className="fas fa-spinner fa-spin"></i> : 'Submit Proof & Report'}
            </button>
          </div>
        </div>
      )}

      {isRejectionModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => !isProcessing && setIsRejectionModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-md w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-fade-in-up scrollbar-hide relative" onClick={e => e.stopPropagation()}>
            {!isProcessing && (
              <button onClick={() => setIsRejectionModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition z-10"><i className="fas fa-times text-xl"></i></button>
            )}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"><i className="fas fa-exclamation-triangle"></i></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Request Changes</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">Please explain what needs to be improved in this stage.</p>
            </div>
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Explanation *</label>
                <textarea
                  value={rejectionMessage}
                  onChange={e => setRejectionMessage(e.target.value)}
                  rows={4}
                  placeholder="Describe what needs to be changed..."
                  className="w-full p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reference Document (Optional)</label>
                <div
                  onClick={() => rejectionInputRef.current?.click()}
                  className={`w-full p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition ${rejectionFile ? 'border-green-500 bg-green-50/30' : 'border-gray-100 dark:border-slate-700 hover:border-brand-500'}`}
                >
                  <i className={`fas ${rejectionFile ? 'fa-check-circle text-green-500' : 'fa-cloud-upload-alt text-slate-300'} text-xl mb-1`}></i>
                  <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate px-2">{rejectionFile ? rejectionFile.name : 'Click to upload proof or reference'}</p>
                  <input
                    type="file"
                    ref={rejectionInputRef}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                          alert('Only Image and PDF files are accepted.');
                          if (rejectionInputRef.current) rejectionInputRef.current.value = '';
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          alert('File size exceeds the 10MB limit.');
                          if (rejectionInputRef.current) rejectionInputRef.current.value = '';
                          return;
                        }
                        setRejectionFile(file);
                      }
                    }}
                    className="hidden"
                    accept="application/pdf,image/*"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsRejectionModalOpen(false)} disabled={isProcessing} className="flex-1 py-4 bg-gray-100 dark:bg-slate-700 rounded-2xl font-bold text-slate-500 transition disabled:opacity-50">Cancel</button>
                <button
                  onClick={async () => {
                    if (!rejectionMessage.trim()) return alert('Please provide an explanation.');
                    setIsProcessing(true);
                    await onRejectMilestone(activeRequest.id, rejectionMessage, rejectionFile || undefined);
                    setIsProcessing(false);
                    setIsRejectionModalOpen(false);
                    setRejectionMessage('');
                    setRejectionFile(null);
                  }}
                  disabled={!rejectionMessage.trim() || isProcessing}
                  className="flex-[2] py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <><i className="fas fa-circle-notch fa-spin"></i> Sending...</> : 'Send Feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCompletionModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => !isProcessing && setIsCompletionModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-md w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-fade-in-up scrollbar-hide relative" onClick={e => e.stopPropagation()}>
            {!isProcessing && (
              <button onClick={() => setIsCompletionModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition z-10"><i className="fas fa-times text-xl"></i></button>
            )}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-brand-50 text-brand-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"><i className="fas fa-check-double"></i></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Mark Complete</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">Add a final note or attach a document for the student to review.</p>
            </div>
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expert Note (Optional)</label>
                <textarea
                  value={completionMessage}
                  onChange={e => setCompletionMessage(e.target.value)}
                  rows={4}
                  placeholder="Provide details about the work done..."
                  className="w-full p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none text-slate-900 dark:text-white font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Attachment (Optional)</label>
                <div
                  onClick={() => completionInputRef.current?.click()}
                  className={`w-full p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition ${completionFile ? 'border-green-500 bg-green-50/30' : 'border-gray-100 dark:border-slate-700 hover:border-brand-500'}`}
                >
                  <i className={`fas ${completionFile ? 'fa-check-circle text-green-500' : 'fa-cloud-upload-alt text-slate-300'} text-xl mb-1`}></i>
                  <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate px-2">{completionFile ? completionFile.name : 'Click to attach proof or result'}</p>
                  <input
                    type="file"
                    ref={completionInputRef}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                          alert('Only Image and PDF files are accepted.');
                          if (completionInputRef.current) completionInputRef.current.value = '';
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          alert('File size exceeds the 10MB limit.');
                          if (completionInputRef.current) completionInputRef.current.value = '';
                          return;
                        }
                        setCompletionFile(file);
                      }
                    }}
                    className="hidden"
                    accept="application/pdf,image/*"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsCompletionModalOpen(false)} disabled={isProcessing} className="flex-1 py-4 bg-gray-100 dark:bg-slate-700 rounded-2xl font-bold text-slate-500 transition disabled:opacity-50">Cancel</button>
                <button
                  onClick={async () => {
                    setIsProcessing(true);
                    await onMarkMilestone(activeRequest.id, completionMessage, completionFile || undefined);
                    setIsProcessing(false);
                    setIsCompletionModalOpen(false);
                    setCompletionMessage('');
                    setCompletionFile(null);
                  }}
                  disabled={isProcessing}
                  className="flex-[2] py-4 bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? <><i className="fas fa-circle-notch fa-spin"></i> Processing...</> : 'Complete Milestone'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isConfirmDenialOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsConfirmDenialOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl animate-fade-in-up relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsConfirmDenialOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition z-10"><i className="fas fa-times text-xl"></i></button>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"><i className="fas fa-search"></i></div>
            <h3 className="text-xl font-bold mb-2 text-center">Verify Visa Rejection</h3>
            <p className="text-sm text-slate-500 mb-6 text-center">Please review the student's proof document. Confirming this will close the journey and initiate the refund/payout process.</p>

            {activeRequest?.visaDenialProofUrl ? (
              <button
                onClick={() => handleDownload({ name: 'Visa_Denial_Proof', url: activeRequest.visaDenialProofUrl! })}
                className="block w-full p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl flex items-center justify-between hover:bg-gray-100 transition mb-6"
              >
                <div className="flex items-center gap-3">
                  <i className="fas fa-file-alt text-brand-500 text-xl"></i>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">View Proof Document</span>
                </div>
                <i className="fas fa-external-link-alt text-slate-400 text-xs"></i>
              </button>
            ) : <p className="text-xs text-red-500 italic text-center mb-6">No proof document uploaded yet.</p>}

            <div className="flex gap-3">
              <button onClick={() => setIsConfirmDenialOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-bold transition">Cancel</button>
              <button
                onClick={async () => {
                  setIsProcessingDenial(true);
                  try {
                    await onExpertVerifyRejection(activeRequest.id);
                    setIsConfirmDenialOpen(false);
                  } finally {
                    setIsProcessingDenial(false);
                  }
                }}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 active:scale-95 transition flex items-center justify-center gap-2"
              >
                {isProcessingDenial ? <i className="fas fa-spinner fa-spin"></i> : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => {
          const hasRated = isExpert ? activeRequest?.expertRating : activeRequest?.studentRating;
          const isFinal = activeRequest?.status === 'COMPLETED';
          if (!hasRated && isFinal) return; // Prevent closing if feedback is needed for finished journey
          setShowFeedbackModal(false);
        }}>
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl animate-fade-in-up relative" onClick={e => e.stopPropagation()}>
            {/* Show Close button only if not mandatory */}
            {!( (activeRequest?.status === 'COMPLETED') && !(isExpert ? activeRequest?.expertRating : activeRequest?.studentRating) ) && (
              <button onClick={() => setShowFeedbackModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition z-10"><i className="fas fa-times text-xl"></i></button>
            )}
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"><i className="fas fa-star"></i></div>
            <h3 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-2">Share your experience</h3>
            <p className="text-sm text-slate-500 mb-6 text-center font-medium">Your feedback help us improve and celebrate {isDenied ? 'all types of' : 'successful'} journeys!</p>

            <div className="space-y-6">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Overall Rating</p>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className="transition-transform active:scale-90"
                    >
                      <i className={`fas fa-star text-3xl ${star <= feedbackRating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}></i>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Comments</label>
                <textarea
                  value={feedbackComment}
                  onChange={e => setFeedbackComment(e.target.value)}
                  rows={4}
                  placeholder="What was great? What could be better?..."
                  className="w-full p-4 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 resize-none text-slate-900 dark:text-white font-medium"
                />
              </div>

              <button
                disabled={!feedbackComment.trim() || isProcessing}
                onClick={async () => {
                  if (!feedbackComment.trim()) return;
                  setIsProcessing(true);
                  try {
                    await onPostFeedback(activeRequest?.id || '', feedbackRating, feedbackComment);
                    setShowFeedbackModal(false);
                    setFeedbackComment('');
                    setShowThankYouModal(true);
                    scrollToBottom();
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => !isProcessing && setIsApproveModalOpen(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl animate-fade-in-up relative" onClick={e => e.stopPropagation()}>
            {!isProcessing && (
              <button onClick={() => setIsApproveModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition z-10"><i className="fas fa-times text-xl"></i></button>
            )}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"><i className="fas fa-check-circle"></i></div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Approve Milestone</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">Are you sure you want to approve this milestone and move to the next stage?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsApproveModalOpen(false)} disabled={isProcessing} className="flex-1 py-4 bg-gray-100 dark:bg-slate-700 rounded-2xl font-bold text-slate-500 transition disabled:opacity-50">Cancel</button>
              <button
                onClick={async () => {
                  if (!approveStageId || !activeRequest) return;
                  setIsProcessing(true);
                  try {
                    await onApproveMilestone(activeRequest.id, approveStageId);
                    setIsApproveModalOpen(false);
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
                className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showThankYouModal && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowThankYouModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl animate-fade-in-up relative text-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowThankYouModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition z-10"><i className="fas fa-times text-xl"></i></button>
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              <i className="fas fa-heart animate-pulse"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Thank You!</h3>
            <p className="text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
              Your feedback is incredibly valuable to us. We've notified the {isExpert ? 'student' : 'expert'} and updated the journey status below.
            </p>
            <button
              onClick={() => setShowThankYouModal(false)}
              className="w-full py-4 bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 active:scale-95 transition"
            >
              Great, thanks!
            </button>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-10" />

      <SecurityWarningModal 
        isOpen={showSecurityWarning} 
        onClose={() => setShowSecurityWarning(false)} 
      />
    </div>
  );
};
