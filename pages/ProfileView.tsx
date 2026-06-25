import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api, DEFAULT_COVER, DEFAULT_AVATAR } from '../services/api';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Post, Profile, ServiceRequest, AdmissionStep, Document, ExpertApplication, Review } from '../types'; // Modified Line
import { PostCard } from '../components/PostCard';
import { Icons } from '../components/Icons';
import { ShareProfileModal } from '../components/ShareProfileModal';
import { ExpertApplicationModal } from '../components/ExpertApplicationModal';
import { ADMISSION_STAGES, SUBSCRIPTION_FEE } from '../constants'; // Added Line
import { openExternalUrl } from '../utils/openExternalUrl';
import { containsContactInfo } from '../utils/postValidation';
import { SecurityWarningModal } from '../components/SecurityWarningModal';
import { ForceSubModal } from '../components/ForceSubModal';
import { PaymentResultModal } from '../components/PaymentResultModal';

interface Props {
  user: Profile;
  expertApplications: ExpertApplication[];
  setView: (v: string) => void;
  onSubscribe: () => void;
  onApplyExpert: (data: any) => void;
  pendingAdmissions?: ServiceRequest[];
  onReviewAdmission?: (requestId: string) => void;
  onStudentConfirm?: (requestId: string, nextStep: AdmissionStep) => void;
  onAddCommonDoc: (doc: Omit<Document, 'id' | 'timestamp' | 'uploadedBy'>) => void;
  onDeleteCommonDoc: (id: string) => void;
  onEditCommonDoc: (id: string, name: string) => void;
  onUpdateProfile?: (updatedProfile: Profile) => void;
  serviceRequests: ServiceRequest[];
  onViewProfile: (p: Profile | string) => void;
  experts: Profile[];
  students: Profile[];
  // Post Related Props
  currentUser?: Profile; // Session user
  posts?: Post[];
  onPost?: (content: string) => Promise<void>;
  onDeletePost?: (id: string) => void;
  onEditPost?: (id: string, content: string) => void;
  onToggleConnect?: (id: string) => void;
  likedPostIds?: string[];
  repostedPostIds?: string[];
  isSubscribing?: boolean;
  isIOSNative?: boolean;
  targetSection?: string | null;
  onClearTargetSection?: () => void;
  onOpenCustomerCenter?: () => void;
}

const ALL_COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
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

const ALL_LANGUAGES = [
  "English", "Hindi", "Mandarin Chinese", "Spanish", "French", "Arabic", "Bengali", "Portuguese", "Russian", "Japanese", "Punjabi",
  "German", "Javanese", "Wu Chinese", "Malay", "Telugu", "Vietnamese", "Korean", "Marathi", "Tamil", "Turkish",
  "Urdu", "Assistant", "Italian", "Yue Chinese", "Thai", "Gujarati", "Jin Chinese", "Southern Min", "Persian", "Polish", "Pashto",
  "Kannada", "Xiang Chinese", "Malayalam", "Sundanese", "Hausa", "Odia", "Burmese", "Hakka Chinese", "Ukrainian", "Bhojpuri",
  "Tagalog", "Yoruba", "Maithili", "Uzbek", "Sindhi", "Amharic", "Fula", "Romanian", "Oromo", "Igbo", "Azerbaijani",
  "Awadhi", "Gan Chinese", "Cebuano", "Dutch", "Kurdish", "Serbo-Croatian", "Malagasy", "Saraiki", "Nepali", "Sinhala",
  "Chittagonian", "Zhuang", "Khmer", "Turkmen", "Assamese", "Madurese", "Somali", "Marwari", "Magahi", "Haryanvi",
  "Hungarian", "Chhattisgarhi", "Greek", "Chewa", "Deccan", "Akan", "Kazakh", "Min Bei", "Sylheti", "Zulu",
  "Czech", "Kinyarwanda", "Dhundhari", "Haitian Creole", "Eastern Min", "Ilocano", "Quechua", "Kirundi", "Swedish", "Hmong",
  "Shona", "Hiligaynon", "Uyghur", "Balochi", "Belarusian", "Mossi", "Xhosa", "Konkani"
];



const DocumentCategory = ({ label, docs, onDownload }: { label: string, docs?: any[], onDownload: (doc: any) => void }) => {
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</p>
      {!docs || docs.length === 0 ? (
        <p className="text-xs text-slate-400 italic ml-1 font-medium">No documents uploaded.</p>
      ) : (
        docs.map((doc, i) => {
          const iconType = doc.type === 'PDF' ? 'fa-file-pdf text-red-500' : 'fa-file-image text-blue-500';
          const iconClassName = `fas ${iconType} text-sm`;
          return (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-3 min-w-0">
                <i className={iconClassName}></i>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{doc.name}</span>
              </div>
              <button
                onClick={() => onDownload(doc)}
                className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition"
              >
                <i className="fas fa-download text-xs"></i>
              </button>
            </div>
          );
        })
      )}
    </div>
  );
};

const DetailRow = ({ label, value, full }: { label: string, value: string, full?: boolean }) => {
  const containerClass = `space-y-1 ${full ? 'sm:col-span-2' : ''}`;
  return (
    <div className={containerClass}>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">{value || 'N/A'}</p>
    </div>
  );
};

const ConditionItem = ({ checked, text }: { checked: boolean, text: string }) => {
  const checkClassName = `mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${checked ? 'bg-green-500 text-white' : 'bg-gray-200 text-slate-400'}`;
  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700">
      <div className={checkClassName}>
        <i className="fas fa-check text-[10px]"></i>
      </div>
      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{text}</span>
    </div>
  );
};

const ApplicationDetailModal = ({ application, onClose, onDownload }: { application: ExpertApplication, onClose: () => void, onDownload: (doc: any) => void }) => {
  const formData = application.data.formData || application.data;
  const agreements = application.data.agreements || {};
  const documents = application.data.documents || {};

  return (
    <div 
      className="fixed inset-0 overflow-y-auto bg-black/60 backdrop-blur-md transition-all duration-300 flex justify-center items-start px-2 sm:px-4"
      style={{ zIndex: 99999, paddingTop: 'max(env(safe-area-inset-top), 1rem)', paddingBottom: 'max(env(safe-area-inset-bottom), 2.5rem)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-xl w-full p-6 sm:p-8 lg:p-10 shadow-2xl animate-fade-in-up relative text-left my-auto sm:my-0 flex flex-col h-auto" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 sm:top-6 sm:right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/50 p-2 rounded-full transition-all duration-200 z-10 active:scale-90 flex items-center justify-center w-10 h-10"
          aria-label="Close"
        >
          <i className="fas fa-times text-lg"></i>
        </button>

        <div className="mb-8">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">Expert Application</h3>
          <p className="text-xs text-brand-600 font-bold uppercase tracking-widest mt-1">Status: Pending Approval</p>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-2">Questions & Answers</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailRow label="Nationality" value={formData.nationality} />
              <DetailRow label="Residency" value={formData.residency} />
              <DetailRow label="Current Studies" value={formData.currentStudies} />
              <DetailRow label="Education" value={formData.education} />
              <DetailRow label="Languages" value={formData.languages} />
              <DetailRow label="Assisted Countries" value={formData.assistedCountries} full />
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-2">Verification Documents</h4>
            <div className="space-y-3">
              <DocumentCategory label="Passport Copy" docs={documents.passport} onDownload={onDownload} />
              <DocumentCategory label="Visa or Residence Permit" docs={documents.visa} onDownload={onDownload} />
              <DocumentCategory label="Academic Records" docs={documents.academic || documents.residency} onDownload={onDownload} />
              <DocumentCategory label="Admission Guideline" docs={documents.guideline} onDownload={onDownload} />
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-2">Conditions Agreement</h4>
            <div className="space-y-3">
              <ConditionItem checked={agreements.services} text="Provide full admission services (Unis, Visa, Accommodation)." />
              <ConditionItem checked={agreements.feeSplit} text="Accept 40/40/20 fee split logic." />
              <ConditionItem checked={agreements.visaDenied} text="Accept 60% total payout logic in case of visa denial." />
              <ConditionItem checked={agreements.confidentiality} text="Commit to strict student confidentiality." />
              <ConditionItem checked={agreements.scope} text="Commit to assist 1-4 universities/countries." />
            </div>
          </section>

          <div className="pt-6">
            <button
              onClick={onClose}
              className="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BecomeExpertInfoModal = ({ onClose }: { onClose: () => void }) => {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);

  const handleSecureDownload = async (e: React.MouseEvent, url: string, filename: string, type: 'pdf' | 'docx') => {
    e.preventDefault();
    if (Capacitor.isNativePlatform()) {
      try {
        window.open(url, '_system');
        return;
      } catch (err) {
        console.error('Error opening system browser:', err);
      }
    }

    if (type === 'pdf') setIsDownloadingPdf(true);
    else setIsDownloadingDocx(true);
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Failed to download file. Please try again.');
    } finally {
      if (type === 'pdf') setIsDownloadingPdf(false);
      else setIsDownloadingDocx(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 overflow-y-auto bg-black/60 backdrop-blur-md transition-all duration-300 flex justify-center items-start px-2 sm:px-4"
      style={{ zIndex: 99999, paddingTop: 'max(env(safe-area-inset-top), 1rem)', paddingBottom: 'max(env(safe-area-inset-bottom), 2.5rem)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-2xl w-full p-6 sm:p-8 lg:p-12 shadow-2xl animate-fade-in-up relative text-left my-auto sm:my-0 flex flex-col h-auto" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 sm:top-6 sm:right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/50 p-2 rounded-full transition-all duration-200 z-10 active:scale-90 flex items-center justify-center w-10 h-10"
          aria-label="Close"
        >
          <i className="fas fa-times text-lg"></i>
        </button>

        <div className="mb-10">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/40 text-brand-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">
            <i className="fas fa-graduation-cap"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">Become a Uni Expert</h2>
          <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">Guide students through their international education journey and earn from your experience while building your global profile.</p>
        </div>

        <div className="space-y-12">
          {/* Steps */}
          <section>
            <h3 className="text-sm font-black text-brand-600 uppercase tracking-widest mb-6 flex items-center gap-2">
              <i className="fas fa-clipboard-list"></i> How to Become a Uni Expert
            </h3>
            <div className="space-y-3">
              {[
                "Prepare University Admission Guide in order to guide students in a organised maner step by step",
                "Prepare the required documents, such as your passport, visa or residence permit, academic records along with the study abroad admission guidelines required to become a Uni Expert.",
                "Go to Become a Uni Expert section on your Profile and click on \"Apply Now\" button.",
                "Complete your application by submitting all required information and documents to help make Migonest a secure, trusted, and authentic university admissions platform."
              ].map((step, i) => (
                <div key={i} className="flex gap-4 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-50 dark:border-slate-700/50 group transition-all hover:border-brand-100">
                  <div className="text-brand-600 mt-0.5"><i className="fas fa-check-circle"></i></div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed">{step}</p>
                    {i === 0 && (
                      <div className="flex flex-wrap gap-2 text-[10px] normal-case tracking-normal font-medium mt-3">
                        <button onClick={(e) => handleSecureDownload(e, 'https://gwengahnqgvwoletcovl.supabase.co/storage/v1/object/sign/documents/Canadian%20University%20Application%20Guide.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNmY2ZTJkZS05ZWExLTRjYWEtOGZkYy1mNjRlZWMzZDU3YmMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkb2N1bWVudHMvQ2FuYWRpYW4gVW5pdmVyc2l0eSBBcHBsaWNhdGlvbiBHdWlkZS5wZGYiLCJpYXQiOjE3Nzg5Nzc5NjgsImV4cCI6MjA5NDMzNzk2OH0.gGQ2fXpGoezX2lW2m31kSmnoLzNaBSr3JKFY5S7W9jw', 'Canadian University Application Guide.pdf', 'pdf')} disabled={isDownloadingPdf} className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 dark:text-brand-400 px-2 py-1.5 rounded-md transition-colors border border-brand-100 dark:border-brand-800 disabled:opacity-50">
                          {isDownloadingPdf ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>} Template (PDF)
                        </button>
                        <button onClick={(e) => handleSecureDownload(e, 'https://gwengahnqgvwoletcovl.supabase.co/storage/v1/object/sign/documents/Canadian%20University%20Application%20Guide.docx?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNmY2ZTJkZS05ZWExLTRjYWEtOGZkYy1mNjRlZWMzZDU3YmMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkb2N1bWVudHMvQ2FuYWRpYW4gVW5pdmVyc2l0eSBBcHBsaWNhdGlvbiBHdWlkZS5kb2N4IiwiaWF0IjoxNzc4OTc3OTE3LCJleHAiOjIwOTQzMzc5MTd9.uwMpej91tYs94vxUh81PPt9V9zUGi1BWALjd_XSKhZk', 'Canadian University Application Guide.docx', 'docx')} disabled={isDownloadingDocx} className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 dark:text-brand-400 px-2 py-1.5 rounded-md transition-colors border border-brand-100 dark:border-brand-800 disabled:opacity-50">
                          {isDownloadingDocx ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-word"></i>} Template (DOCX)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Verification */}
          <section>
            <h3 className="text-sm font-black text-brand-600 uppercase tracking-widest mb-6 flex items-center gap-2">
              <i className="fas fa-shield-alt"></i> Verification Process
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: "fa-search", text: "Our team will review your application." },
                { icon: "fa-phone", text: "If shortlisted, we will schedule a quick call with you." },
                { icon: "fa-file-signature", text: "After that, we will complete the final verification process." },
                { icon: "fa-check-circle", text: "Once approved, receive a Verified Uni Expert badge and start being hired!" }
              ].map((item, i) => (
                <div key={i} className="p-5 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-brand-600 shadow-sm">
                    <i className={`fas ${item.icon} text-lg`}></i>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-snug">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Start Earning */}
          <section>
            <h3 className="text-sm font-black text-brand-600 uppercase tracking-widest mb-6 flex items-center gap-2">
              <i className="fas fa-wallet"></i> Start Earning
            </h3>
            <div className="bg-slate-900 dark:bg-black p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs text-slate-300 mb-6 font-medium leading-relaxed">As a verified expert, you can start guiding students with:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-8">
                  {[
                    "Course and university selection",
                    "Motivation Letters / SOP",
                    "Application process",
                    "Visa guidance",
                    "Finding accommodation abroad"
                  ].map((service, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs font-bold">
                      <i className="fas fa-star text-brand-400 text-[10px]"></i>
                      {service}
                    </div>
                  ))}
                </div>
                <div className="p-5 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <p className="text-[11px] text-slate-200 leading-relaxed">
                    Once a student pays <span className="text-brand-400 font-black">$599</span> and hires you, 8 Admission Journey Cards will be available under the Admission tab to document conversations and track progress.
                  </p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-brand-600/20 rounded-full blur-3xl"></div>
            </div>
          </section>

          {/* Earnings Structure */}
          <section>
            <h3 className="text-sm font-black text-brand-600 uppercase tracking-widest mb-6 flex items-center gap-2">
              <i className="fas fa-chart-pie"></i> Earnings & Payment Structure
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Immediate", value: "40%", sub: "After Payment", color: "bg-blue-50 text-blue-600 border-blue-100" },
                  { label: "On Visa", value: "40%", sub: "Upon Approval", color: "bg-green-50 text-green-600 border-green-100" },
                  { label: "Platform", value: "20%", sub: "Service Fee", color: "bg-gray-50 text-gray-500 border-gray-100" }
                ].map((item, i) => (
                  <div key={i} className={`p-6 rounded-3xl border ${item.color} text-center`}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">{item.label}</p>
                    <div className="text-3xl font-black mb-1">{item.value}</div>
                    <p className="text-[9px] font-bold opacity-80">{item.sub}</p>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] border border-amber-100 dark:border-amber-900/20">
                <p className="text-xs font-black text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle"></i> IF VISA IS REJECTED
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <span>Expert Earnings</span>
                    <span className="text-amber-600">60% of Total</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <span>Student Refund</span>
                    <span className="text-amber-600">20% Refund in Wallet</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Promote */}
          <section className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <i className="fas fa-qrcode"></i> Promote Profile
              </h4>
              <ul className="space-y-2 text-[11px] text-slate-500 font-bold">
                <li className="flex items-start gap-2"><i className="fas fa-arrow-right mt-1 text-[8px] text-brand-600"></i> Share your profile using your unique QR code.</li>
                <li className="flex items-start gap-2"><i className="fas fa-arrow-right mt-1 text-[8px] text-brand-600"></i> We provide a digital business card for connections.</li>
              </ul>
            </div>
            <div className="flex-1 p-6 bg-brand-600 rounded-3xl text-white">
              <h4 className="text-xs font-black uppercase tracking-widest mb-3">Support</h4>
              <p className="text-[11px] font-medium leading-relaxed opacity-90 mb-4">Feel free to reach out for support or questions.</p>
              <a href="mailto:contact@migonest.com" className="inline-flex items-center gap-2 text-xs font-black bg-white text-brand-600 px-4 py-2 rounded-xl">
                <i className="fas fa-envelope"></i> contact@migonest.com
              </a>
            </div>
          </section>

          <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">Build your side income with Migonest</p>
        </div>
      </div>
    </div>
  );
};

export const ProfileView: React.FC<Props> = ({
  user, expertApplications, setView, onSubscribe, onApplyExpert, pendingAdmissions = [],
  onReviewAdmission, onStudentConfirm, onAddCommonDoc, onDeleteCommonDoc, onEditCommonDoc,
  onUpdateProfile, serviceRequests, onViewProfile, experts, students,
  currentUser, posts = [], onPost, onDeletePost, onEditPost, onToggleConnect, likedPostIds = [], repostedPostIds = [],
  isSubscribing, isIOSNative, targetSection, onClearTargetSection, onOpenCustomerCenter
}) => {
  const [isRedirectingPortal, setIsRedirectingPortal] = useState(false);
  const [subStatus, setSubStatus] = useState<{ isSubscribed: boolean; cancelAtPeriodEnd?: boolean; currentPeriodEnd?: number; subscriptionId?: string } | null>(null);
  const [isResumingSub, setIsResumingSub] = useState(false);

  useEffect(() => {
    if (user?.isSubscribed && currentUser?.id === user.id) {
      api.getSubscriptionStatus(user.id).then(res => {
        setSubStatus(res);
        // If Stripe says not subscribed but DB said yes, sync global state
        if (res.isSubscribed === false && onUpdateProfile) {
          console.log('[ProfileView] Stripe reports no active sub. Syncing DB...');
          onUpdateProfile({ ...user, isSubscribed: false });
        }
      }).catch(err => {
        // Only log if it's not a standard network failure (which is now handled by API retries)
        if (err.name !== 'TypeError' && !err.message?.includes('fetch')) {
          console.error('[ProfileView] Failed to verify subscription status:', err);
        }
        // Fallback to local DB status so the spinner stops and the UI stays functional.
        // We assume they are still subscribed if the DB says so, to avoid locking them out during downtime.
        setSubStatus({ isSubscribed: true, currentPeriodEnd: user?.currentPeriodEnd, cancelAtPeriodEnd: user?.cancelAtPeriodEnd });
      });
    }
  }, [user?.isSubscribed, user?.id, currentUser?.id]);

  useEffect(() => {
    if (targetSection === 'MEMBERSHIP') {
      const element = document.getElementById('membership-section');
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (onClearTargetSection) onClearTargetSection();
        }, 500);
      }
    }
  }, [targetSection, onClearTargetSection]);
  const [activeTab, setActiveTab] = useState<'INFO' | 'REVIEWS' | 'POSTS'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'posts') return 'POSTS';
    return 'INFO';
  });

  const isReviewer = user?.email === 'wahedtestbd1@gmail.com';
  const isSubscribed = isReviewer ? true : (subStatus !== null ? subStatus.isSubscribed : !!user?.isSubscribed);

  const [isExpertModalOpen, setExpertModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [viewAppDetail, setViewAppDetail] = useState<ExpertApplication | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloadingMsg, setDownloadingMsg] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isCompressingCover, setIsCompressingCover] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isForceSubModalOpen, setIsForceSubModalOpen] = useState(false);
  const [isExpertInfoModalOpen, setExpertInfoModalOpen] = useState(false);
  const [showResumeSuccess, setShowResumeSuccess] = useState(false);

  // Review Pagination
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(10);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Edit State
  const [editFullName, setEditFullName] = useState('');
  const [editHomeCountries, setEditHomeCountries] = useState<string[]>([]);
  const [editCurrentLocation, setEditCurrentLocation] = useState('');
  const [editCurrentStudies, setEditCurrentStudies] = useState<string[]>([]);
  const [editHighestQualifications, setEditHighestQualifications] = useState<string[]>([]);
  const [editInterestAreas, setEditInterestAreas] = useState<string[]>([]);
  const [editLanguages, setEditLanguages] = useState<string[]>([]);
  const [editTargetCountries, setEditTargetCountries] = useState<string[]>([]);
  const [editTargetDegree, setEditTargetDegree] = useState<string[]>([]);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 3000);
  };

  // Temporary inputs for tags
  const [tempEdu, setTempEdu] = useState('');
  const [tempArea, setTempArea] = useState('');
  const [tempStudy, setTempStudy] = useState('');
  const [tempTargetDegree, setTempTargetDegree] = useState('');

  // Search state for country/language selection in Modal
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchField, setActiveSearchField] = useState<'home' | 'current' | 'targets' | 'languages' | null>(null);

  const isExpert = user.role === 'EXPERT';
  const isAdmin = user.role === 'ADMIN';

  const userApplication = useMemo(() =>
    expertApplications.find(app => app.studentId === user.id && (app.status === 'PENDING' || app.status === 'APPROVED')),
    [expertApplications, user.id]
  );

  const isOwnProfile = currentUser?.id === user.id;

  // Derived reviews for the current user from serviceRequests
  const userReviews: Review[] = useMemo(() => {
    return serviceRequests
      .filter(sr => sr.status === 'COMPLETED' && (isExpert ? !!sr.studentFeedback : !!sr.expertFeedback))
      .filter(sr => isExpert ? sr.expertId === user.id : sr.studentId === user.id)
      .map(sr => ({
        id: `rev-${sr.id}`,
        authorId: isExpert ? sr.studentId : sr.expertId,
        authorName: isExpert ? sr.studentFullName : sr.expertFullName,
        authorAvatarUrl: isExpert ? (sr.studentAvatarUrl || '') : (sr.expertAvatarUrl || ''),
        rating: isExpert ? (sr.studentRating || 5) : (sr.expertRating || 5),
        comment: isExpert ? (sr.studentFeedback || '') : (sr.expertFeedback || ''),
        timestamp: Date.now() // For demo purposes
      }));
  }, [serviceRequests, isExpert, user.id]);

  const displayedReviews = useMemo(() => userReviews.slice(0, visibleReviewsCount), [userReviews, visibleReviewsCount]);
  const hasMoreReviews = userReviews.length > visibleReviewsCount;

  const averageRating = useMemo(() => {
    if (userReviews.length === 0) return 0;
    const sum = userReviews.reduce((acc, rev) => acc + rev.rating, 0);
    return sum / userReviews.length;
  }, [userReviews]);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    const isAnyModalOpen = isExpertModalOpen || isExpertInfoModalOpen || isAddDocOpen || editingDoc || deletingDoc || isEditProfileOpen || viewAppDetail;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      if (mainElement) mainElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      if (mainElement) mainElement.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'unset';
      if (mainElement) mainElement.style.overflow = 'auto';
    };
  }, [isExpertModalOpen, isAddDocOpen, editingDoc, deletingDoc, isEditProfileOpen, viewAppDetail]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (activeSearchField && !target.closest('.search-container')) {
        setActiveSearchField(null);
        setSearchQuery('');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeSearchField]);

  const compressImage = (file: File, isCover: boolean = false): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDimension = isCover ? 500 : 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDimension) {
              height = Math.round(height * maxDimension / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round(width * maxDimension / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          let quality = 0.85;
          let compressedDataUrl = '';
          let blobSize = Infinity;
          const maxSizeBytes = isCover ? 150 * 1024 : 70 * 1024;

          do {
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            const headSize = compressedDataUrl.indexOf(',') + 1;
            blobSize = Math.round((compressedDataUrl.length - headSize) * 0.75);
            quality -= 0.05;
          } while (blobSize > maxSizeBytes && quality >= 0.1);

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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    try {
      setIsCompressing(true);

      // Always compress to meet constraints (max 200px dimension and max 70 KB size)
      const compressedDataUrl = await compressImage(file, false);
      const fileToUpload = dataURLtoBlob(compressedDataUrl);

      // Upload to Supabase Storage
      const publicUrl = await api.uploadFile('avatars', `${user.id}/avatar-${Date.now()}.jpg`, fileToUpload);

      // Update Profile Table
      await api.updateProfile(user.id, { avatarUrl: publicUrl });

      if (onUpdateProfile) {
        onUpdateProfile({
          ...user,
          avatarUrl: publicUrl
        });
      }
      triggerToast('Profile picture updated!');
      setIsCompressing(false);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try another one.');
      setIsCompressing(false);
    }
    e.target.value = '';
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    try {
      setIsCompressingCover(true);

      // Always compress to meet constraints (max 500px dimension and max 150 KB size)
      const compressedDataUrl = await compressImage(file, true);
      const fileToUpload = dataURLtoBlob(compressedDataUrl);

      // Upload to Supabase Storage
      const publicUrl = await api.uploadFile('covers', `${user.id}/cover-${Date.now()}.jpg`, fileToUpload);

      // Update Profile Table
      await api.updateProfile(user.id, { coverPhotoUrl: publicUrl });

      if (onUpdateProfile) {
        onUpdateProfile({
          ...user,
          coverPhotoUrl: publicUrl
        });
      }
      triggerToast('Cover photo updated!');
      setIsCompressingCover(false);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try another one.');
      setIsCompressingCover(false);
    }
    e.target.value = '';
  };

  const openEditModal = () => {
    setEditFullName(user.fullName || '');
    setEditHomeCountries(user.homeCountries || []);
    setEditCurrentLocation(user.currentLocation || '');
    setEditCurrentStudies(user.currentStudies || []);
    setEditHighestQualifications(user.highestQualifications || []);
    setEditInterestAreas(user.interestAreas || []);
    setEditLanguages(user.languages || []);
    setEditTargetCountries(user.targetCountries || []);
    setEditTargetDegree(user.targetDegree || []);
    setTempEdu(user.highestQualifications?.[0] || '');
    setTempStudy(user.currentStudies?.[0] || '');
    setTempTargetDegree(user.targetDegree?.[0] || '');
    setTempArea('');
    setIsEditProfileOpen(true);
  };

  const handleUpdateDocName = () => {
    if (editingDoc && newDocName.trim()) {
      onEditCommonDoc(editingDoc.id, newDocName);
      setEditingDoc(null);
      setNewDocName('');
    }
  };

  const handleDownload = async (doc: Document | { name: string, url: string }) => {
    setDownloadingMsg(`Preparing ${doc.name}...`);
    try {
      let downloadUrl = doc.url;

      // If it's a private Supabase document, get a signed URL
      if (doc.url.includes('/storage/v1/object/authenticated/documents/') || doc.url.includes('/storage/v1/object/public/documents/')) {
        const path = doc.url.split('/documents/')[1];
        downloadUrl = await api.getFileUrl('documents', path, false, true);
      }

      const runFallbackDownload = (url: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
      setTimeout(() => setDownloadingMsg(null), 2000);
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingDoc) {
      onDeleteCommonDoc(deletingDoc.id);
      setDeletingDoc(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.includes('pdf') || file.type.includes('image')) {
        setSelectedFile(file);
        if (!newDocName) setNewDocName(file.name);
      } else {
        alert("Only Image and PDF files are allowed.");
        if (e.target) e.target.value = '';
      }
    }
  };

  const handleUploadDoc = async () => {
    if (!selectedFile) return;

    const isImage = selectedFile.type.startsWith('image/');
    const isPdf = selectedFile.type === 'application/pdf';
    let fileToUpload: File | Blob = selectedFile;

    try {
      // If bigger than 10MB and is image, compress it
      if (isImage && selectedFile.size > 10 * 1024 * 1024) {
        setDownloadingMsg("Compressing large image...");
        const compressedDataUrl = await compressImage(selectedFile);
        fileToUpload = dataURLtoBlob(compressedDataUrl);
      }

      // Check final size against 10MB limit
      const sizeInBytes = fileToUpload.size;
      if (sizeInBytes > 10 * 1024 * 1024) {
        if (isPdf) {
          alert("Limit is 10 MB per PDF file. Please compress it manually before uploading.");
        } else {
          alert("Even after compression, this image is over 10 MB. Please resize it manually.");
        }
        setDownloadingMsg(null);
        return;
      }

      setDownloadingMsg("Uploading to locker...");
      const sanitizedName = sanitizeFileName(selectedFile.name);
      const fileName = `${Date.now()}-${sanitizedName}`;
      const storagePath = `${user.id}/${fileName}`;
      const fileUrl = await api.uploadFile('documents', storagePath, fileToUpload);

      onAddCommonDoc({
        name: newDocName || selectedFile.name,
        type: isPdf ? 'PDF' : 'IMAGE',
        url: fileUrl
      });
      resetLockerUpload();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload document.");
      setDownloadingMsg(null);
    }
  };

  const handleSaveProfile = async () => {
    if (
      containsContactInfo(editFullName) ||
      containsContactInfo(tempStudy) ||
      containsContactInfo(tempEdu)
    ) {
      setShowSecurityWarning(true);
      return;
    }
    if (onUpdateProfile) {
      const updatedUser: Profile = {
        ...user,
        fullName: editFullName.trim(),
        homeCountries: editHomeCountries,
        currentLocation: editCurrentLocation,
        currentStudies: tempStudy.trim() ? [tempStudy.trim()] : [],
        highestQualifications: tempEdu.trim() ? [tempEdu.trim()] : [],
        interestAreas: editInterestAreas,
        languages: editLanguages,
        targetCountries: editTargetCountries,
        targetDegree: tempTargetDegree.trim() ? [tempTargetDegree.trim()] : []
      };

      try {
        setDownloadingMsg("Saving changes...");
        await api.updateProfile(user.id, updatedUser);
        onUpdateProfile(updatedUser);
        setIsEditProfileOpen(false);
        triggerToast('Profile updated successfully!');
      } catch (err) {
        console.error("Failed to save profile:", err);
        alert("Failed to save changes. Please try again.");
      } finally {
        setDownloadingMsg(null);
      }
    }
  };

  const toggleTargetCountry = (country: string) => {
    setEditTargetCountries(prev =>
      prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
    );
    setSearchQuery('');
    setActiveSearchField(null);
  };

  const toggleEditHomeCountry = (country: string) => {
    setEditHomeCountries(prev =>
      prev.includes(country) ? [] : [country]
    );
    setSearchQuery('');
    setActiveSearchField(null);
  };

  const toggleEditLanguage = (lang: string) => {
    setEditLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
    setSearchQuery('');
    setActiveSearchField(null);
  };

  const resetLockerUpload = () => {
    setNewDocName('');
    setSelectedFile(null);
    setIsAddDocOpen(false);
    setDownloadingMsg(null);
  };

  const isInputSelected = (field: 'studies' | 'education' | 'targetDegree') => {
    if (field === 'studies') return tempStudy.trim() !== '' && tempStudy.trim() === (editCurrentStudies[0] || '').trim();
    if (field === 'education') return tempEdu.trim() !== '' && tempEdu.trim() === (editHighestQualifications[0] || '').trim();
    if (field === 'targetDegree') return tempTargetDegree.trim() !== '' && tempTargetDegree.trim() === (editTargetDegree[0] || '').trim();
    return false;
  };

  const handleSetSingleTag = (field: 'studies' | 'education' | 'targetDegree', val: string) => {
    if (containsContactInfo(val)) {
      setShowSecurityWarning(true);
      return;
    }
    if (val.trim()) {
      const formattedVal = val.trim().charAt(0).toUpperCase() + val.trim().slice(1);
      if (field === 'studies') setEditCurrentStudies([formattedVal]);
      if (field === 'education') setEditHighestQualifications([formattedVal]);
      if (field === 'targetDegree') setEditTargetDegree([formattedVal]);
    }
  };

  const filteredItems = useMemo(() => {
    const list = activeSearchField === 'languages' ? ALL_LANGUAGES : ALL_COUNTRIES;
    if (!searchQuery) return list.slice(0, 10);
    return list.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20);
  }, [searchQuery, activeSearchField]);

  const handleReviewerClick = (authorId: string) => {
    const allUsers = [...experts, ...students];
    const found = allUsers.find(u => u.id === authorId);
    if (found) onViewProfile(found);
  };

  return (
    <div className="pb-24 space-y-10 animate-fade-in relative">
      {showToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-slate-900 dark:bg-brand-600 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in-up border border-white/10 flex items-center gap-2">
          <Icons.Check /> {showToast}
        </div>
      )}
      {downloadingMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in-up flex items-center gap-2">
          <i className="fas fa-download"></i> {downloadingMsg}
        </div>
      )}

      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-bold">My Profile</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView('CONNECTIONS')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand-600 transition"
            title="My Connections"
          >
            <i className="fas fa-users"></i>
          </button>

          {isAdmin && (
            <button
              onClick={() => setView('EXPERT_REVIEWS')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:amber-400 hover:bg-amber-100 transition relative"
              title="Review Expert Applications"
            >
              <i className="fas fa-user-check text-base"></i>
              {expertApplications.filter(a => a.status === 'PENDING').length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
                  {expertApplications.filter(a => a.status === 'PENDING').length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setView('SETTINGS')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand-600 transition"
            title="Settings"
          >
            <Icons.Settings />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative">
        {/* Cover Photo Section */}
        <div className="relative h-48 md:h-64 bg-slate-100 dark:bg-slate-900 group overflow-hidden">
          {isOwnProfile && (
            <input
              type="file"
              ref={coverInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleCoverChange}
            />
          )}
          <img
            src={user.coverPhotoUrl || DEFAULT_COVER}
            onError={(e) => { e.currentTarget.src = DEFAULT_COVER; }}
            className={`w-full h-full object-cover transition-opacity duration-500 ${isCompressingCover ? 'opacity-50' : 'opacity-100'}`}
            alt="Cover"
          />
          {isCompressingCover && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <i className="fas fa-circle-notch fa-spin text-brand-600 text-2xl"></i>
            </div>
          )}
          {isOwnProfile && (
            <button
              onClick={() => !isCompressingCover && coverInputRef.current?.click()}
              className="absolute top-4 right-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-2.5 rounded-xl text-slate-700 dark:text-slate-200 shadow-lg border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-xs font-bold z-20"
            >
              <i className="fas fa-camera"></i> Change Cover
            </button>
          )}
        </div>

        <div className="px-6 pb-8 relative z-10">
          <div className="flex flex-col items-start">
            <div className="flex items-end gap-5">
              <div className="-mt-14 relative flex-shrink-0">
                <div className="relative">
                  <img src={user.avatarUrl || DEFAULT_AVATAR} className={`w-28 h-28 rounded-3xl border-[6px] border-white dark:border-slate-800 shadow-xl shadow-black/10 object-cover transition-opacity ${isCompressing ? 'opacity-50' : 'opacity-100'}`} alt="" />
                  {isCompressing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <i className="fas fa-circle-notch fa-spin text-brand-600 text-xl"></i>
                    </div>
                  )}
                </div>
                {isOwnProfile && (
                  <>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                    <div
                      onClick={() => !isCompressing && avatarInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 bg-brand-600 text-white w-9 h-9 rounded-xl flex items-center justify-center border-4 border-white dark:border-slate-800 cursor-pointer hover:bg-brand-700 transition shadow-sm z-20"
                    >
                      <i className="fas fa-camera text-xs"></i>
                    </div>
                  </>
                )}
              </div>

              {isExpert && (
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-[#f5f5f5] text-[#02569B] px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] shadow-sm border border-blue-100/50 animate-fade-in-up">
                    <i className="fas fa-check-circle text-[#0084FF] text-xs"></i> VERIFIED
                  </span>
                </div>
              )}
              {isOwnProfile && (
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="w-10 h-10 bg-white dark:bg-slate-800 text-slate-400 rounded-xl hover:text-brand-600 hover:bg-brand-50 transition shadow-sm border border-gray-100 dark:border-slate-700 flex items-center justify-center"
                    title="Share Profile"
                  >
                    <i className="fas fa-qrcode"></i>
                  </button>
                  <button
                    onClick={openEditModal}
                    className="w-10 h-10 bg-brand-50 dark:bg-brand-900/40 text-brand-600 rounded-xl hover:bg-brand-100 transition shadow-sm border border-brand-100 dark:border-slate-700 flex items-center justify-center"
                    title="Edit Profile"
                  >
                    <Icons.Edit />
                  </button>
                </div>
              )}
            </div>

            <div className="w-full min-w-0 mt-4">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 space-y-2">
                  <h2 className="text-3xl font-black leading-tight text-slate-900 dark:text-white line-clamp-2" title={user.fullName}>
                    {user.fullName}
                  </h2>
                  <p className="text-sm text-slate-500 font-bold flex items-center justify-start gap-1 truncate pt-1">
                    <Icons.MapMarker /> {user.currentLocation}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase tracking-wider whitespace-nowrap ${isAdmin ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-brand-600 text-white'
                      }`}>{user.role}</span>
                    {isSubscribed && isIOSNative === false && <span className="text-[10px] px-3 py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-200 font-black uppercase tracking-wider whitespace-nowrap">PREMIUM</span>}
                    {averageRating > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 font-black text-[10px]">
                        <i className="fas fa-star text-[8px]"></i>
                        {averageRating.toFixed(1)}
                      </div>
                    )}
                    <button
                      onClick={() => setView('CONNECTIONS')}
                      className="text-[10px] px-3 py-1 rounded-lg bg-slate-100 text-slate-600 dark:text-slate-700 dark:text-slate-400 font-black uppercase tracking-wider whitespace-nowrap hover:bg-brand-50 dark:hover:bg-slate-600 transition"
                    >
                      {user.connections?.length || 0} Connections
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

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

          <div className="mt-8">
            {activeTab === 'INFO' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
                <div className="space-y-4">
                  <InfoBlock label="Nationality" icon="fa-home" value={user.homeCountries?.join(', ') || 'Not specified'} />
                  <InfoBlock label={isExpert || isAdmin ? "Highest Qualification" : "Academic Qualification"} icon="fa-graduation-cap" value={user.highestQualifications?.join(', ') || 'Not specified'} />
                  <InfoBlock label={isExpert || isAdmin ? "Expertise Background" : "Education"} icon="fa-university" value={user.currentStudies?.join(', ') || 'Not specified'} />
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700 text-left">
                    <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                      <i className="fas fa-award text-[10px]"></i> Target Degree
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mt-1">
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
                      <i className="fas fa-lightbulb text-[10px]"></i> {isAdmin || isExpert ? 'Areas of Interest' : 'Interested Area of Study'}
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
                </div>

                <div className="space-y-4 md:col-span-2 lg:col-span-1">
                  <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700 text-left">
                    <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                      <Icons.Globe /> {isExpert || isAdmin ? 'Expertise Countries' : 'Countries to Apply'}
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
              <div className="space-y-6 animate-fade-in-up">
                {posts
                  .filter(p => p.authorId === user.id)
                  .map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      user={currentUser || user} // Prefer session user for context, fallback to profile user (view only)
                      onPost={onPost || (async () => { })}
                      onAuthorClick={() => { }} // No-op on own profile
                      onEdit={currentUser?.id === post.authorId ? onEditPost : undefined}
                      onDelete={currentUser?.id === post.authorId ? onDeletePost : undefined}
                      onShare={(post) => {
                        const url = `${window.location.origin}/?view=PROFILE&userId=${post.authorId}&tab=posts`;
                        navigator.clipboard.writeText(url);
                        alert('Link copied!');
                      }}
                      initialIsLiked={likedPostIds.includes(post.id)}
                      initialIsReposted={repostedPostIds.includes(post.id)}
                    />
                  ))}
                {posts.filter(p => p.authorId === user.id).length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-slate-400 font-bold text-sm">No posts yet.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in-up pb-10">
                {userReviews.length === 0 ? (
                  <div className="py-20 text-center bg-gray-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4 text-2xl">
                      <i className="fas fa-star"></i>
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No reviews yet</p>
                    <p className="text-xs text-slate-500 mt-2 font-medium">Reviews appear here after admission journeys are completed.</p>
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
                              <div className="flex items-center gap-2">
                                <h4
                                  className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-brand-600 transition-colors"
                                  onClick={() => handleReviewerClick(review.authorId)}
                                >
                                  {review.authorName}
                                </h4>
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest leading-none bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  {review.authorRole}
                                </span>
                              </div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(review.timestamp).toLocaleDateString()}</p>
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
                          className="px-8 py-3.5 bg-white dark:bg-slate-800 text-brand-600 border border-brand-100 dark:border-slate-700 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:bg-brand-50 transition active:scale-95"
                        >
                          Load More Reviews
                        </button>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                          Showing {displayedReviews.length} of {userReviews.length}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
            }
          </div >
        </div >
      </div >

      {/* Pending Milestones Section */}
      {
        isOwnProfile && !isExpert && !isAdmin && pendingAdmissions.length > 0 && (
          <section className="bg-amber-50 dark:bg-amber-900/10 rounded-3xl p-6 border border-amber-200 dark:border-amber-900/30 shadow-sm animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs animate-pulse">
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <h3 className="font-extrabold text-amber-900 dark:text-amber-200">Action Required</h3>
            </div>
            <div className="space-y-3">
              {pendingAdmissions.map(req => {
                const currentStage = ADMISSION_STAGES.find(s => s.id === req.currentStep);
                return (
                  <div key={req.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={req.expertAvatarUrl || DEFAULT_AVATAR} className="w-10 h-10 rounded-xl object-cover" alt="" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{req.expertFullName || 'Expert'}</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest">
                          Verify: {currentStage?.label}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onReviewAdmission ? onReviewAdmission(req.id) : setView('ADMISSION')}
                      className="px-4 py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-amber-700 transition active:scale-95"
                    >
                      Review
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )
      }

      {
        isOwnProfile && !isExpert && !isAdmin && !userApplication && !isApplying && isIOSNative === false && (
          <div className="bg-brand-600 dark:bg-brand-700 rounded-3xl p-6 text-white shadow-xl overflow-hidden relative border border-white/10">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-extrabold">Become a Uni Expert</h3>
                <button
                  onClick={() => setExpertInfoModalOpen(true)}
                  className="w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-all active:scale-90"
                  title="Learn more"
                >
                  <i className="fas fa-info-circle text-sm"></i>
                </button>
              </div>
              <p className="text-xs text-blue-50 mb-5 font-medium leading-relaxed max-w-[90%]">Guide others through admissions and visas while earning from your expertise.</p>
              <button
                disabled={isApplying}
                onClick={() => setExpertModalOpen(true)}
                className="px-6 py-2.5 bg-white text-brand-600 font-bold rounded-xl text-xs hover:bg-blue-50 transition-all shadow-lg active:scale-95 transform flex items-center gap-2"
              >
                {isApplying ? (
                  <>
                    <div className="w-3 h-3 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : "Apply Now"}
              </button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          </div>
        )
      }

      {
        isApplying && !isExpert && !isAdmin && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-10 border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-4 shadow-sm animate-pulse">
            <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Processing Application...</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Updating your status</p>
            </div>
          </div>
        )
      }

      {
        isOwnProfile && userApplication && !isExpert && !isAdmin && (
          <div className={`${userApplication.status === 'APPROVED' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30'} rounded-3xl p-6 border shadow-sm animate-fade-in-up`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${userApplication.status === 'APPROVED' ? 'bg-green-100 dark:bg-green-900/40 text-green-600' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'} rounded-2xl flex items-center justify-center text-xl`}>
                  <i className={`fas ${userApplication.status === 'APPROVED' ? 'fa-check-circle' : 'fa-user-clock'}`}></i>
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${userApplication.status === 'APPROVED' ? 'text-green-900 dark:text-green-200' : 'text-amber-900 dark:text-amber-200'}`}>
                    {userApplication.status === 'APPROVED' ? 'Application Approved!' : 'Expert Status Pending'}
                  </h3>
                  <p className={`text-xs ${userApplication.status === 'APPROVED' ? 'text-green-700/70 dark:text-green-400/70' : 'text-amber-700/70 dark:text-amber-400/70'} font-medium`}>
                    {userApplication.status === 'APPROVED' ? 'Your expert status is now active.' : 'Applied and pending admin approval'}
                  </p>
                </div>
              </div>
              {userApplication.status === 'APPROVED' ? (
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-white dark:bg-slate-800 text-green-600 border border-green-200 dark:border-green-900/50 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-green-50 transition"
                >
                  Refresh to Activate
                </button>
              ) : (
                <button
                  onClick={() => setViewAppDetail(userApplication)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 text-amber-600 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-amber-50 transition"
                >
                  View Application
                </button>
              )}
            </div>
            <div className={`bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border ${userApplication.status === 'APPROVED' ? 'border-green-100 dark:border-green-900/20' : 'border-amber-100 dark:border-amber-900/20'}`}>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                {userApplication.status === 'APPROVED'
                  ? "Congratulations! You are now a Uni Expert. Please refresh your page to see your new tools and profile status."
                  : "Your application is currently under manual review. This process usually takes 2-3 business days. We will notify you once your expert status is activated."
                }
              </p>
            </div>
          </div>
        )
      }

      {isIOSNative === false && isOwnProfile && (
        <div
          onClick={() => { setView('WALLET'); window.scrollTo(0, 0); }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 cursor-pointer hover:border-brand-300 transition-all group"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Icons.Money /> My Wallet
            </h3>
            <div className="text-xs font-bold text-brand-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
              History & Withdraw <i className="fas fa-chevron-right text-[10px]"></i>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Available Balance</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">${(user.walletBalance || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      <div id="membership-section" className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative transition-all duration-500">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col items-end">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <i className="fas fa-gem text-amber-500"></i> Membership
            </h3>
          </div>
          {isSubscribed ? (
            <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
              Active Plan
            </span>
          ) : (
            <span className="text-xs font-bold text-slate-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
              Free Plan
            </span>
          )}
        </div>

        {(user.isSubscribed || subStatus?.isSubscribed) && subStatus?.isSubscribed !== false ? (
          <div className="space-y-4">
            {subStatus === null ? (
              <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-5 h-5 border-2 border-brand-100 border-t-brand-600 rounded-full animate-spin mb-2"></div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verifying status...</p>
              </div>
            ) : (
              <>
                <div className={`flex items-center gap-4 p-4 ${(subStatus?.cancelAtPeriodEnd || user.cancelAtPeriodEnd) ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30' : 'bg-brand-50/30 dark:bg-brand-900/10 border-brand-100 dark:border-brand-900/30'} rounded-2xl border`}>
                  <div className={`w-10 h-10 ${(subStatus?.cancelAtPeriodEnd || user.cancelAtPeriodEnd) ? 'bg-amber-500 text-white' : 'bg-brand-600 text-white'} rounded-xl flex items-center justify-center`}>
                    <i className={(subStatus?.cancelAtPeriodEnd || user.cancelAtPeriodEnd) ? "fas fa-exclamation-triangle" : "fas fa-check"}></i>
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${(subStatus?.cancelAtPeriodEnd || user.cancelAtPeriodEnd) ? 'text-amber-700 dark:text-amber-500' : ''}`}>
                      {(subStatus?.cancelAtPeriodEnd || user.cancelAtPeriodEnd) ? 'Membership Ending' : 'Premium Membership'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {(subStatus?.cancelAtPeriodEnd || user.cancelAtPeriodEnd)
                        ? (function () {
                          const endVal = subStatus?.currentPeriodEnd || user.currentPeriodEnd;
                          if (!endVal) return 'Ending soon';
                          const d = new Date(Number(endVal) * 1000);
                          if (isNaN(d.getTime())) return 'Ending soon';
                          return `Service ends on ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
                        })()
                        : (function () {
                          const endVal = subStatus?.currentPeriodEnd || user?.currentPeriodEnd;
                          if (!endVal) return `Premium Active • $${SUBSCRIPTION_FEE}`;
                          const d = new Date(Number(endVal) * 1000);
                          const dateStr = isNaN(d.getTime()) ? 'Active' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                          return `Renews on ${dateStr} • $${SUBSCRIPTION_FEE}`;
                        })()}
                    </p>
                  </div>
                </div>

                {(subStatus?.cancelAtPeriodEnd || user.cancelAtPeriodEnd) ? (
                  <button
                    disabled={isResumingSub || !subStatus.subscriptionId}
                    onClick={async () => {
                      if (!subStatus.subscriptionId) return;
                      setIsResumingSub(true);
                      try {
                        await api.resumeSubscription(subStatus.subscriptionId);
                        setSubStatus(s => s ? { ...s, cancelAtPeriodEnd: false } : null);
                        setShowResumeSuccess(true);
                      } catch (err) {
                        alert("Failed to resume subscription.");
                      } finally {
                        setIsResumingSub(false);
                      }
                    }}
                    className="w-full py-3 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition flex items-center justify-center gap-2"
                  >
                    {isResumingSub ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Resuming...</span>
                      </>
                    ) : "Resume Subscription (Stop Cancellation)"}
                  </button>
                ) : (
                  <button
                    disabled={isRedirectingPortal}
                    onClick={async () => {
                      if (isIOSNative && onOpenCustomerCenter) {
                        onOpenCustomerCenter();
                        return;
                      }
                      setIsRedirectingPortal(true);
                      try {
                        const data = await api.createPortalSession(currentUser.id);
                        if (data.url) await openExternalUrl(data.url);
                      } catch (error) {
                        console.error("Failed to create portal session:", error);
                        alert(`Failed to redirect to Stripe Customer Portal: ${error instanceof Error ? error.message : String(error)}`);
                      } finally {
                        setIsRedirectingPortal(false);
                      }
                    }}
                    className="w-full py-3 bg-gray-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-brand-50 hover:text-brand-600 transition flex items-center justify-center gap-2"
                  >
                    {isRedirectingPortal ? (
                      <>
                        <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                        <span>Opening {isIOSNative ? 'Subscription Manager' : 'Stripe Portal'}...</span>
                      </>
                    ) : "Manage Subscription"}
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black text-left mb-1">Subscription Required</p>
            <p className="text-xs text-slate-500 leading-relaxed font-medium text-left">
              Unlock direct messaging with anyone at Migonest, cancel anytime.
            </p>
            <button
              onClick={() => onSubscribe()}
              disabled={isSubscribing}
              className="w-full py-4 px-6 bg-brand-600 disabled:bg-brand-400 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition flex items-center justify-center gap-2"
            >
              {isSubscribing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                'Get Migonest Premium $19.99/mo'
              )}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <i className="fas fa-network-wired text-brand-600"></i> My Network
          </h3>
          <button onClick={() => setView('CONNECTIONS')} className="text-xs font-bold text-brand-600">View All</button>
        </div>
        <div className="flex -space-x-3 overflow-hidden">
          {user.connections.length > 0 ? (
            user.connections.slice(0, 3).map(id => (
              <div key={id} className="inline-block h-10 w-10 rounded-full ring-2 ring-white dark:ring-slate-800 bg-gray-100 flex items-center justify-center font-bold text-[10px] text-slate-400">
                {id.charAt(0).toUpperCase()}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 py-2">No connections yet.</p>
          )}
          {user.connections.length > 3 && (
            <div
              onClick={() => setView('CONNECTIONS')}
              className="flex items-center justify-center h-10 w-10 rounded-full ring-2 ring-white dark:ring-slate-800 bg-brand-100 text-brand-600 font-bold text-[10px] cursor-pointer"
            >
              +{user.connections.length - 3}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <i className="fas fa-vault text-brand-600"></i> My Digital Locker
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">Keep your standard documents for quick sharing</p>
          </div>
          <button
            onClick={() => setIsAddDocOpen(true)}
            className="w-10 h-10 bg-brand-50 dark:bg-brand-900/40 text-brand-600 rounded-xl flex items-center justify-center hover:bg-brand-100 transition shadow-sm"
          >
            <Icons.Plus />
          </button>
        </div>

        <div className="grid gap-3">
          {(!user.commonDocuments || user.commonDocuments.length === 0) ? (
            <div className="py-8 text-center bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
              <i className="fas fa-folder-open text-slate-300 text-3xl mb-2"></i>
              <p className="text-xs text-slate-400 font-medium">Your locker is empty.</p>
            </div>
          ) : (
            user.commonDocuments.map(doc => (
              <div key={doc.id} className="group p-3 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center gap-4 hover:border-brand-200 transition overflow-hidden">
                <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg ${doc.type === 'PDF' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
                  }`}>
                  <i className={`fas ${doc.type === 'PDF' ? 'fa-file-pdf' : 'fa-file-image'}`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate text-slate-800 dark:text-slate-200">{doc.name}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 hover:text-brand-600 transition"
                    title="Download"
                  >
                    <i className="fas fa-download text-xs"></i>
                  </button>
                  <button
                    onClick={() => { setEditingDoc(doc); setNewDocName(doc.name); }}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-600 transition"
                    title="Rename"
                  >
                    <i className="fas fa-edit text-xs"></i>
                  </button>
                  <button
                    onClick={() => setDeletingDoc(doc)}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 transition"
                    title="Delete"
                  >
                    <i className="fas fa-trash-alt text-xs"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {
        deletingDoc && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={() => setDeletingDoc(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-8 lg:p-10 shadow-2xl animate-fade-in-up scrollbar-hide text-center" onClick={e => e.stopPropagation()}>
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                <i className="fas fa-trash-alt"></i>
              </div>
              <h3 className="text-xl font-bold mb-2">Remove from Locker?</h3>
              <p className="text-sm text-slate-500 mb-6">Are you sure you want to remove "<span className="font-bold">{deletingDoc.name}</span>"? This will not affect shared files in your active journeys.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingDoc(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 transition hover:bg-gray-200">Cancel</button>
                <button onClick={handleDeleteConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 active:scale-95 transition">Remove</button>
              </div>
            </div>
          </div>
        )
      }

      {
        editingDoc && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => { setEditingDoc(null); setNewDocName(''); }}>
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-8 lg:p-10 shadow-2xl animate-fade-in-up scrollbar-hide" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Rename Document</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                  placeholder="New label..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button onClick={() => { setEditingDoc(null); setNewDocName(''); }} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-bold transition hover:bg-gray-200">Cancel</button>
                  <button onClick={handleUpdateDocName} className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold active:scale-95 transition">Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        isAddDocOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => { setIsAddDocOpen(false); setNewDocName(''); setSelectedFile(null); }}>
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-fade-in-up scrollbar-hide" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">Add to Locker</h3>
              <div className="space-y-4">
                <div onClick={() => fileInputRef.current?.click()} className="w-full border-4 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl p-8 text-center cursor-pointer hover:border-brand-500 transition bg-gray-50/50 dark:bg-slate-900/50 group">
                  <i className="fas fa-cloud-upload-alt text-3xl text-brand-200 group-hover:text-brand-500 transition mb-3 block"></i>
                  {selectedFile ? <div className="text-xs font-bold text-brand-600 truncate">{selectedFile.name}</div> : <div className="text-xs text-slate-400 font-medium">Click to select file (Image or PDF)</div>}
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf,image/*" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Label</label>
                  <input type="text" value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="e.g. Resume, ID Card" className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setIsAddDocOpen(false); setNewDocName(''); setSelectedFile(null); }} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-bold transition hover:bg-gray-200">Cancel</button>
                  <button onClick={handleUploadDoc} disabled={!selectedFile} className="flex-1 py-3 bg-brand-600 text-white rounded-xl font-bold active:scale-95 transition disabled:opacity-50">Upload</button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        isEditProfileOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsEditProfileOpen(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 md:p-10 shadow-2xl animate-fade-in-up scrollbar-hide relative flex flex-col" onClick={e => e.stopPropagation()}>
              <button onClick={() => setIsEditProfileOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition">
                <i className="fas fa-times text-xl"></i>
              </button>

              <div className="mb-8 shrink-0">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Edit Profile</h3>
                <p className="text-sm text-slate-500 font-medium">Keep your information up to date for better matches.</p>
              </div>

              <div className="space-y-8 flex-grow">
                {/* Basic Info */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-2">Basic Information</h4>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input type="text" value={editFullName} onChange={e => setEditFullName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white" />
                    </div>

                  {/* Nationality Single-select */}
                  <div className="space-y-1.5 relative search-container">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nationality</label>
                    <div className="relative">
                      <i className="fas fa-flag absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      <input
                        type="text"
                        placeholder="Search countries..."
                        value={activeSearchField === 'home' ? searchQuery : (editHomeCountries[0] || '')}
                        onFocus={() => { setActiveSearchField('home'); setSearchQuery(''); }}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                      />
                      {activeSearchField === 'home' && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                          {filteredItems.map(c => (
                            <div key={c} onClick={() => toggleEditHomeCountry(c)} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm flex justify-between items-center text-slate-700 dark:text-slate-200">
                              {c} {editHomeCountries.includes(c) && <i className="fas fa-check text-brand-600"></i>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 relative search-container">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Residency</label>
                    <div className="relative">
                      <i className="fas fa-map-marker-alt absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      <input
                        type="text"
                        value={activeSearchField === 'current' ? searchQuery : editCurrentLocation}
                        onFocus={() => { setActiveSearchField('current'); setSearchQuery(''); }}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search residency country..."
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                      />
                      {activeSearchField === 'current' && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                          {filteredItems.map(c => (
                            <div key={c} onClick={() => { setEditCurrentLocation(c); setActiveSearchField(null); setSearchQuery(''); }} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-200">
                              {c}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Languages Spoken */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-2">Communication</h4>
                  <div className="space-y-1.5 relative search-container">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Languages Spoken</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {editLanguages.map(l => (
                        <span key={l} className="text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200 px-2 py-1 rounded-md flex items-center gap-1 border border-brand-100 dark:border-brand-800/50">
                          {l} <button onClick={() => toggleEditLanguage(l)} className="hover:text-red-500"><i className="fas fa-times"></i></button>
                        </span>
                      ))}
                    </div>
                    <div className="relative">
                      <i className="fas fa-language absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      <input
                        type="text"
                        placeholder="Search languages..."
                        value={activeSearchField === 'languages' ? searchQuery : ''}
                        onFocus={() => { setActiveSearchField('languages'); setSearchQuery(''); }}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                      />
                      {activeSearchField === 'languages' && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                          {filteredItems.map(l => (
                            <div key={l} onClick={() => toggleEditLanguage(l)} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm flex justify-between items-center text-slate-700 dark:text-slate-200">
                              {l} {editLanguages.includes(l) && <i className="fas fa-check text-brand-600"></i>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Academic Background */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-2">Academic Background</h4>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Educational Institute (Current or Completed)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={tempStudy}
                        onChange={e => setTempStudy(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && tempStudy.trim()) {
                            e.preventDefault();
                            handleSetSingleTag('studies', tempStudy);
                          }
                        }}
                        placeholder="Type institution name"
                        className="w-full px-4 pr-12 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                      {/* Selected checkmark removed for cleaner UI */}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Highest Academic Qualification</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={tempEdu}
                        onChange={e => setTempEdu(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && tempEdu.trim()) {
                            e.preventDefault();
                            handleSetSingleTag('education', tempEdu);
                          }
                        }}
                        placeholder="Type degree"
                        className="w-full px-4 pr-12 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                      {/* Selected checkmark removed for cleaner UI */}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Interested Area of Study</label>
                    <div className="relative">
                      <input
                        id="profileInterestAreaInput"
                        type="text"
                        value={tempArea}
                        onChange={e => setTempArea(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && tempArea.trim()) {
                            e.preventDefault();
                            setEditInterestAreas(prev => [...prev, tempArea.trim().charAt(0).toUpperCase() + tempArea.trim().slice(1)]);
                            setTempArea('');
                          }
                        }}
                        placeholder="Type area"
                        className="w-full px-4 pr-12 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                      />
                      {tempArea.trim() && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                          <button
                            type="button"
                            onClick={() => {
                              if (tempArea.trim()) {
                                setEditInterestAreas(prev => [...prev, tempArea.trim().charAt(0).toUpperCase() + tempArea.trim().slice(1)]);
                                setTempArea('');
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition shadow-lg shadow-brand-500/20"
                          >
                            <i className="fas fa-arrow-right text-xs"></i>
                          </button>
                        </div>
                      )}
                    </div>
                    {editInterestAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {editInterestAreas.map((a, i) => (
                          <span key={a} className="text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200 px-2 py-1 rounded-md flex items-center gap-1 border border-brand-100 dark:border-brand-800/50">
                            {a} <button onClick={() => setEditInterestAreas(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500"><i className="fas fa-times"></i></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Degree</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={tempTargetDegree}
                        onChange={e => setTempTargetDegree(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && tempTargetDegree.trim()) {
                            e.preventDefault();
                            handleSetSingleTag('targetDegree', tempTargetDegree);
                          }
                        }}
                        placeholder="Type degree (e.g. Master's)"
                        className="w-full px-4 pr-12 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                      />
                      {/* Selected checkmark removed for cleaner UI */}
                    </div>
                  </div>
                </section>

                {/* Targets */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700 pb-2">
                    {isExpert || isAdmin ? 'Expertise Areas' : 'Admission Targets'}
                  </h4>
                  <div className="space-y-1.5 relative search-container">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {isExpert || isAdmin ? 'Target Expertise Countries' : 'Countries you want to apply to'}
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {editTargetCountries.map(c => (
                        <span key={c} className="text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200 px-2 py-1 rounded-md flex items-center gap-1 border border-brand-100 dark:border-brand-800/50">
                          {c} <button onClick={() => toggleTargetCountry(c)} className="hover:text-red-500"><i className="fas fa-times"></i></button>
                        </span>
                      ))}
                    </div>
                    <div className="relative">
                      <i className="fas fa-globe absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      <input
                        type="text"
                        placeholder="Search countries..."
                        value={activeSearchField === 'targets' ? searchQuery : ''}
                        onFocus={() => { setActiveSearchField('targets'); setSearchQuery(''); }}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                      />
                      {activeSearchField === 'targets' && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                          {filteredItems.map(c => (
                            <div key={c} onClick={() => toggleTargetCountry(c)} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm flex justify-between items-center text-slate-700 dark:text-slate-200">
                              {c} {editTargetCountries.includes(c) && <i className="fas fa-check text-brand-600"></i>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <div className="pt-6 flex gap-4 shrink-0">
                  <button
                    onClick={() => setIsEditProfileOpen(false)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-slate-700 rounded-2xl font-bold text-slate-600 dark:text-slate-300 transition hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-xl shadow-brand-500/20 active:scale-95 transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
              {/* Dynamic Mobile Overscroll Spacer: guarantees we can always scroll bottom inputs into the center of the view when keyboard is open */}
              <div style={{ height: `var(--keyboard-offset, 0px)` }} className="w-full shrink-0 transition-all duration-300 pointer-events-none" />
            </div>
          </div>
        )
      }

      {
        viewAppDetail && (
          <ApplicationDetailModal
            application={viewAppDetail}
            onClose={() => setViewAppDetail(null)}
            onDownload={handleDownload}
          />
        )
      }

      {isIOSNative === false && (
        <ExpertApplicationModal
          user={user}
          isOpen={isExpertModalOpen}
          onClose={() => setExpertModalOpen(false)}
          onConfirm={async (data) => {
            setExpertModalOpen(false);
            setIsApplying(true);
            try {
              await onApplyExpert(data);
            } finally {
              setIsApplying(false);
            }
          }}
        />
      )}
      {isExpertInfoModalOpen && (
        <BecomeExpertInfoModal onClose={() => setExpertInfoModalOpen(false)} />
      )}
      <ShareProfileModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        user={user}
      />

      <SecurityWarningModal
        isOpen={showSecurityWarning}
        onClose={() => setShowSecurityWarning(false)}
      />
      <ForceSubModal
        isOpen={isForceSubModalOpen}
        onClose={() => setIsForceSubModalOpen(false)}
        onConfirm={() => {
          setIsForceSubModalOpen(false);
          onSubscribe(true);
        }}
        isLoading={isSubscribing}
      />

      <PaymentResultModal
        isOpen={showResumeSuccess}
        onClose={() => setShowResumeSuccess(false)}
        type="success"
        title="Subscription Resumed!"
        message="Your Premium subscription has been successfully resumed and your access is fully restored."
      />
    </div >
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