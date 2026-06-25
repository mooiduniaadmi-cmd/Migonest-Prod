
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Profile } from '../types';
import { Icons } from './Icons';
import { api } from '../services/api';
import { containsContactInfo } from '../utils/postValidation';
import { SecurityWarningModal } from '../components/SecurityWarningModal';
import { Capacitor } from '@capacitor/core';
import { openExternalUrl } from '../utils/openExternalUrl';

interface Props {
  user: Profile;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
}

interface FileListState {
  files: File[];
  error: string | null;
  uploading: boolean;
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
  "Urdu", "Italian", "Yue Chinese", "Thai", "Gujarati", "Jin Chinese", "Southern Min", "Persian", "Polish", "Pashto",
  "Kannada", "Xiang Chinese", "Malayalam", "Sundanese", "Hausa", "Odia", "Burmese", "Hakka Chinese", "Ukrainian", "Bhojpuri",
  "Tagalog", "Yoruba", "Maithili", "Uzbek", "Sindhi", "Amharic", "Fula", "Romanian", "Oromo", "Igbo", "Azerbaijani",
  "Awadhi", "Gan Chinese", "Cebuano", "Dutch", "Kurdish", "Serbo-Croatian", "Malagasy", "Saraiki", "Nepali", "Sinhala",
  "Chittagonian", "Zhuang", "Khmer", "Turkmen", "Assamese", "Madurese", "Somali", "Marwari", "Magahi", "Haryanvi",
  "Hungarian", "Chhattisgarhi", "Greek", "Chewa", "Deccan", "Akan", "Kazakh", "Min Bei", "Sylheti", "Zulu",
  "Czech", "Kinyarwanda", "Dhundhari", "Haitian Creole", "Eastern Min", "Ilocano", "Quechua", "Kirundi", "Swedish", "Hmong",
  "Shona", "Hiligaynon", "Uyghur", "Balochi", "Belarusian", "Mossi", "Xhosa", "Konkani"
];

export const ExpertApplicationModal: React.FC<Props> = ({ user, isOpen, onClose, onConfirm }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nationality: user.homeCountries || [],
    residency: user.currentLocation || '',
    languages: user.languages || [],
    currentStudies: user.currentStudies || [],
    education: user.highestQualifications || [],
    assistedCountries: [] as string[]
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [tempEdu, setTempEdu] = useState('');
  const [tempStudy, setTempStudy] = useState('');
  const [activeSearchField, setActiveSearchField] = useState<'home' | 'current' | 'languages' | 'assisted' | null>(null);

  const [passportFiles, setPassportFiles] = useState<FileListState>({ files: [], error: null, uploading: false });
  const [visaFiles, setVisaFiles] = useState<FileListState>({ files: [], error: null, uploading: false });
  const [residencyFiles, setResidencyFiles] = useState<FileListState>({ files: [], error: null, uploading: false });
  const [guidelineFiles, setGuidelineFiles] = useState<FileListState>({ files: [], error: null, uploading: false });

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreements, setAgreements] = useState({
    services: false,
    feeSplit: false,
    visaDenied: false,
    confidentiality: false,
    scope: false
  });
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setFormData({
        nationality: user.homeCountries || [],
        residency: user.currentLocation || '',
        languages: user.languages || [],
        currentStudies: user.currentStudies || [],
        education: user.highestQualifications || [],
        assistedCountries: [] as string[]
      });
      setTempEdu(user.highestQualifications?.[0] || '');
      setTempStudy(user.currentStudies?.[0] || '');
    } else {
      document.body.style.overflow = 'unset';
      setStep(1);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, user]);

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

  const filteredItems = useMemo(() => {
    const list = activeSearchField === 'languages' ? ALL_LANGUAGES : ALL_COUNTRIES;
    if (!searchQuery) return list.slice(0, 10);
    return list.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20);
  }, [searchQuery, activeSearchField]);

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSelection = (field: 'nationality' | 'languages' | 'assistedCountries', value: string) => {
    setFormData(prev => {
      if (field === 'nationality') return { ...prev, [field]: prev[field].includes(value) ? [] : [value] };
      return {
        ...prev,
        [field]: prev[field].includes(value)
          ? prev[field].filter(item => item !== value)
          : [...prev[field], value]
      };
    });
    setSearchQuery('');
    setActiveSearchField(null);
  };

  const isInputSelected = (field: 'education' | 'currentStudies') => {
    if (field === 'education') return tempEdu.trim() !== '' && tempEdu.trim() === (formData.education[0] || '').trim();
    if (field === 'currentStudies') return tempStudy.trim() !== '' && tempStudy.trim() === (formData.currentStudies[0] || '').trim();
    return false;
  };

  const handleSetSingleTag = (field: 'education' | 'currentStudies', val: string) => {
    if (val.trim()) {
      setFormData(prev => ({ ...prev, [field]: [val.trim().charAt(0).toUpperCase() + val.trim().slice(1)] }));
    }
  };

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
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
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

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<FileListState>>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    const validFiles = selectedFiles.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} exceeds the 10MB limit.`);
        return false;
      }
      return true;
    });
    setter(prev => ({ ...prev, files: [...prev.files, ...validFiles], error: null }));
  };

  const handleContinueStep1 = () => {
    if (containsContactInfo(tempEdu) || containsContactInfo(tempStudy)) {
      setShowSecurityWarning(true);
      return;
    }

    if (tempEdu.trim() && !isInputSelected('education')) {
      handleSetSingleTag('education', tempEdu);
    }
    if (tempStudy.trim() && !isInputSelected('currentStudies')) {
      handleSetSingleTag('currentStudies', tempStudy);
    }
    setStep(2);
  };

  const handleConfirm = async () => {
    // Validate free-text fields
    if (containsContactInfo(tempEdu) || containsContactInfo(tempStudy)) {
      setShowSecurityWarning(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // Helper to upload array of files sequentially
      const uploadFiles = async (files: File[], bucketContext: string) => {
        const results = [];
        for (const file of files) {
          try {
            const isImage = file.type.startsWith('image/');
            let fileToUpload: File | Blob = file;

            // Compress image if it's large (> 2MB)
            if (isImage && file.size > 2 * 1024 * 1024) {
              const compressedDataUrl = await compressImage(file);
              fileToUpload = dataURLtoBlob(compressedDataUrl);
            }

            const sanitizedName = sanitizeFileName(file.name);
            const fileName = `${user.id}/${bucketContext}-${Date.now()}-${sanitizedName}`;

            const url = await api.uploadFile('documents', fileName, fileToUpload);
            results.push({
              name: file.name,
              url: url,
              type: file.type.includes('pdf') ? 'PDF' : 'IMAGE'
            });
          } catch (e) {
            console.error('Failed to upload', file.name, e);
            throw new Error(`Failed to upload ${file.name}.`);
          }
        }
        return results;
      };

      // Sequential uploads for categories to avoid overwhelming mobile connections
      const passportDocs = await uploadFiles(passportFiles.files, 'passport');
      const visaDocs = await uploadFiles(visaFiles.files, 'visa');
      const academicDocs = await uploadFiles(residencyFiles.files, 'academic');
      const guidelineDocs = await uploadFiles(guidelineFiles.files, 'guideline');

      onConfirm({
        formData: {
          ...formData,
          nationality: formData.nationality.join(', '),
          languages: formData.languages.join(', '),
          assistedCountries: formData.assistedCountries.join(', '),
          currentStudies: formData.currentStudies.join(', '),
          education: formData.education.join(', ')
        },
        agreements,
        documents: {
          passport: passportDocs,
          visa: visaDocs,
          academic: academicDocs,
          guideline: guidelineDocs
        }
      });
    } catch (err: any) {
      console.error('Error processing application documents:', err);
      alert(err.message || "Error processing documents. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canContinueStep1 =
    formData.nationality.length > 0 &&
    formData.residency &&
    formData.languages.length > 0 &&
    (formData.education.length > 0 || tempEdu.trim()) &&
    (formData.currentStudies.length > 0 || tempStudy.trim()) &&
    formData.assistedCountries.length > 0;

  const canContinueStep2 =
    passportFiles.files.length > 0 &&
    visaFiles.files.length > 0 &&
    residencyFiles.files.length > 0 &&
    guidelineFiles.files.length > 0;

  const canSubmit =
    !isSubmitting &&
    Object.values(agreements).every(v => v === true);

  const handleSecureDownload = async (e: React.MouseEvent, url: string, filename: string, type: 'pdf' | 'docx') => {
    e.preventDefault();
    e.stopPropagation();
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

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed bottom-0 left-0 right-0 overflow-y-auto bg-black/60 backdrop-blur-md transition-all duration-300 flex justify-center items-start px-2 sm:px-4"
      style={{ zIndex: 99999, top: 'calc(env(safe-area-inset-top) + 4rem)', paddingBottom: 'max(env(safe-area-inset-bottom), 2.5rem)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-lg w-full p-6 sm:p-8 md:p-10 relative shadow-2xl animate-fade-in-up my-auto sm:my-0 flex flex-col h-auto"
      >
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 sm:top-6 sm:right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/50 p-2 rounded-full transition-all duration-200 z-10 active:scale-90 flex items-center justify-center w-10 h-10"
          aria-label="Close"
        >
          <i className="fas fa-times text-lg"></i>
        </button>

        <div className="mb-10">
          <div className="w-14 h-14 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">
            <i className="fas fa-user-graduate"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Become a Uni Expert</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Join our professional community of mentors.</p>

          <div className="flex gap-2 mt-6">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-brand-600' : 'bg-gray-100 dark:bg-slate-700'}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-fade-in-up">
            <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-slate-700 pb-2">Step 1: Background Questions</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5 relative search-container">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nationality</label>
                <div className="relative">
                  <i className="fas fa-flag absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={activeSearchField === 'home' ? searchQuery : (formData.nationality[0] || '')}
                    onFocus={() => { setActiveSearchField('home'); setSearchQuery(''); }}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white font-medium"
                  />
                  {activeSearchField === 'home' && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto scrollbar-hide">
                      {filteredItems.map(c => (
                        <div key={c} onClick={() => toggleSelection('nationality', c)} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm flex justify-between items-center text-slate-700 dark:text-slate-200">
                          {c} {formData.nationality.includes(c) && <i className="fas fa-check text-brand-600"></i>}
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
                    value={activeSearchField === 'current' ? searchQuery : formData.residency}
                    onFocus={() => { setActiveSearchField('current'); setSearchQuery(''); }}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search residency country..."
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white font-medium"
                  />
                  {activeSearchField === 'current' && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto scrollbar-hide">
                      {filteredItems.map(c => (
                        <div key={c} onClick={() => { handleInputChange('residency', c); setActiveSearchField(null); setSearchQuery(''); }} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-700 dark:text-slate-200">
                          {c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 relative search-container">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Languages Spoken</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.languages.map(l => (
                    <span key={l} className="text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200 px-2 py-1 rounded-md flex items-center gap-1 border border-brand-100">
                      {l} <button onClick={() => toggleSelection('languages', l)}><i className="fas fa-times"></i></button>
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
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white font-medium"
                  />
                  {activeSearchField === 'languages' && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto scrollbar-hide">
                      {filteredItems.map(l => (
                        <div key={l} onClick={() => toggleSelection('languages', l)} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm flex justify-between items-center text-slate-700 dark:text-slate-200">
                          {l} {formData.languages.includes(l) && <i className="fas fa-check text-brand-600"></i>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Highest Qualification</label>
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
                    placeholder="Type qualification"
                    className="w-full px-4 pr-12 py-3.5 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                  />
                  {/* Selected checkmark removed for cleaner UI */}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Studies / Institution</label>
                <div className="relative">
                  <input
                    type="text"
                    value={tempStudy}
                    onChange={e => setTempStudy(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && tempStudy.trim()) {
                        e.preventDefault();
                        handleSetSingleTag('currentStudies', tempStudy);
                      }
                    }}
                    placeholder="Type institution"
                    className="w-full px-4 pr-12 py-3.5 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                  />
                  {/* Selected checkmark removed for cleaner UI */}
                </div>
              </div>

              <div className="space-y-1.5 relative search-container">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Countries you will assist with</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.assistedCountries.map(c => (
                    <span key={c} className="text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200 px-2 py-1 rounded-md flex items-center gap-1 border border-brand-100">
                      {c} <button onClick={() => toggleSelection('assistedCountries', c)}><i className="fas fa-times"></i></button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <i className="fas fa-globe absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={activeSearchField === 'assisted' ? searchQuery : ''}
                    onFocus={() => { setActiveSearchField('assisted'); setSearchQuery(''); }}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white font-medium"
                  />
                  {activeSearchField === 'assisted' && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto scrollbar-hide">
                      {filteredItems.map(c => (
                        <div key={c} onClick={() => toggleSelection('assistedCountries', c)} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm flex justify-between items-center text-slate-700 dark:text-slate-200">
                          {c} {formData.assistedCountries.includes(c) && <i className="fas fa-check text-brand-600"></i>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleContinueStep1}
              disabled={!canContinueStep1}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition disabled:opacity-50 mt-4"
            >
              Continue to Uploads
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in-up">
            <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-slate-700 pb-2">Step 2: Document Verification</h3>
            <div className="space-y-6">
              <FileUploadSection label="Passport (Biography and Personal Data page)" state={passportFiles} onFileSelect={(e: any) => handleFileSelection(e, setPassportFiles)} onRemoveFile={(idx: number) => setPassportFiles(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }))} />
              <FileUploadSection label="Visa or Residence Permit" state={visaFiles} onFileSelect={(e: any) => handleFileSelection(e, setVisaFiles)} onRemoveFile={(idx: number) => setVisaFiles(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }))} />
              <FileUploadSection label="Academic Records (Transcript, Certificate or Admission Confirmation)" state={residencyFiles} onFileSelect={(e: any) => handleFileSelection(e, setResidencyFiles)} onRemoveFile={(idx: number) => setResidencyFiles(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }))} />
              <div className="-mt-3">
                <FileUploadSection 
                  label={
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center gap-1.5 inline-flex">
                        <span>Admission Guideline</span>
                        <div className="group relative flex items-center">
                          <i className="fas fa-info-circle text-brand-500 cursor-help transition-colors"></i>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-50 normal-case tracking-normal font-sans">
                            Provide the full steps how to guide students for university admission abroad e.g. from choosing university to visa process and help finding accomodation.
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] normal-case tracking-normal font-medium pl-1">
                        <button onClick={(e) => handleSecureDownload(e, 'https://gwengahnqgvwoletcovl.supabase.co/storage/v1/object/sign/documents/Canadian%20University%20Application%20Guide.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNmY2ZTJkZS05ZWExLTRjYWEtOGZkYy1mNjRlZWMzZDU3YmMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkb2N1bWVudHMvQ2FuYWRpYW4gVW5pdmVyc2l0eSBBcHBsaWNhdGlvbiBHdWlkZS5wZGYiLCJpYXQiOjE3Nzg5Nzc5NjgsImV4cCI6MjA5NDMzNzk2OH0.gGQ2fXpGoezX2lW2m31kSmnoLzNaBSr3JKFY5S7W9jw', 'Canadian University Application Guide.pdf', 'pdf')} disabled={isDownloadingPdf} className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 dark:text-brand-400 px-2.5 py-1.5 rounded-md transition-colors border border-brand-100 dark:border-brand-800 disabled:opacity-50 font-bold">
                          {isDownloadingPdf ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf text-lg"></i>} Template (PDF)
                        </button>
                        <button onClick={(e) => handleSecureDownload(e, 'https://gwengahnqgvwoletcovl.supabase.co/storage/v1/object/sign/documents/Canadian%20University%20Application%20Guide.docx?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iNmY2ZTJkZS05ZWExLTRjYWEtOGZkYy1mNjRlZWMzZDU3YmMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJkb2N1bWVudHMvQ2FuYWRpYW4gVW5pdmVyc2l0eSBBcHBsaWNhdGlvbiBHdWlkZS5kb2N4IiwiaWF0IjoxNzc4OTc3OTE3LCJleHAiOjIwOTQzMzc5MTd9.uwMpej91tYs94vxUh81PPt9V9zUGi1BWALjd_XSKhZk', 'Canadian University Application Guide.docx', 'docx')} disabled={isDownloadingDocx} className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 dark:text-brand-400 px-2.5 py-1.5 rounded-md transition-colors border border-brand-100 dark:border-brand-800 disabled:opacity-50 font-bold">
                          {isDownloadingDocx ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-word text-lg"></i>} Template (DOCX)
                        </button>
                      </div>
                    </div>
                  } 
                  state={guidelineFiles} 
                  onFileSelect={(e: any) => handleFileSelection(e, setGuidelineFiles)} 
                  onRemoveFile={(idx: number) => setGuidelineFiles(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }))} 
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex-1 py-4 bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-xs uppercase tracking-widest">Back</button>
              <button
                onClick={() => setStep(3)}
                disabled={!canContinueStep2}
                className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition disabled:opacity-50"
              >
                Review Conditions
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in-up">
            <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-slate-700 pb-2">Step 3: Expert Commitment</h3>
            <div className="space-y-4">
              <ConditionToggle checked={agreements.services} onChange={() => setAgreements({ ...agreements, services: !agreements.services })} label="I commit to providing course finding, SOP review, and visa preparation guidance." />
              <ConditionToggle checked={agreements.feeSplit} onChange={() => setAgreements({ ...agreements, feeSplit: !agreements.feeSplit })} label="I accept the 40/40/20 payout structure (40% immediate, 40% on success, 20% Migonest fee)." />
              <ConditionToggle checked={agreements.visaDenied} onChange={() => setAgreements({ ...agreements, visaDenied: !agreements.visaDenied })} label="Accept 60% total payout logic in case of visa denial." />
              <ConditionToggle checked={agreements.confidentiality} onChange={() => setAgreements({ ...agreements, confidentiality: !agreements.confidentiality })} label="I will keep all student documents and personal data strictly confidential." />
              <ConditionToggle checked={agreements.scope} onChange={() => setAgreements({ ...agreements, scope: !agreements.scope })} label="I will assist with applications for a maximum of 4 universities or countries per student." />
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                <i className="fas fa-info-circle mr-1"></i> Your application will be manually reviewed by our admin team. You will be notified via email once approved.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(2)} className="flex-1 py-4 bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-xs uppercase tracking-widest transition">Back</button>
              <button
                onClick={handleConfirm}
                disabled={!canSubmit || isSubmitting}
                className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <><i className="fas fa-circle-notch fa-spin"></i> Submitting...</>
                ) : (
                  <><i className="fas fa-paper-plane"></i> Submit Application</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <SecurityWarningModal
        isOpen={showSecurityWarning}
        onClose={() => setShowSecurityWarning(false)}
      />
    </div>,
    document.body
  );
};

const FileUploadSection = ({ label, state, onFileSelect, onRemoveFile }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="flex flex-col gap-2">
      <div className="relative group">
        <input
          type="file"
          multiple
          onChange={onFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          accept="application/pdf,image/*,.doc,.docx"
        />
        <div className="w-full py-3 px-4 bg-gray-50 dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-3 group-hover:border-brand-500 transition-colors">
          <i className="fas fa-cloud-upload-alt text-slate-400 group-hover:text-brand-600 transition-colors"></i>
          <span className="text-xs font-bold text-slate-500 group-hover:text-brand-600 transition-colors">Click to select files</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {state.files.map((file: any, idx: number) => (
          <span key={idx} className="text-[9px] font-black bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 px-2.5 py-1.5 rounded-lg border border-brand-100 dark:border-brand-800 flex items-center gap-2 animate-fade-in-up">
            <i className="fas fa-paperclip text-[10px]"></i> {file.name}
            {onRemoveFile && (
              <button
                onClick={(e) => { e.preventDefault(); onRemoveFile(idx); }}
                className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </span>
        ))}
        {state.files.length === 0 && <p className="text-[10px] text-slate-400 italic ml-1">Required: .PDF or .JPG/.PNG (Max 10MB)</p>}
      </div>
    </div>
  </div>
);

const ConditionToggle = ({ checked, onChange, label }: any) => (
  <div className="flex gap-4 items-start cursor-pointer group p-3 rounded-2xl bg-gray-50/50 dark:bg-slate-900/30 border border-transparent hover:border-brand-100 dark:hover:border-brand-900 transition-all" onClick={onChange}>
    <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all ${checked ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700'}`}>
      {checked && <i className="fas fa-check text-[10px]"></i>}
    </div>
    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed select-none group-hover:text-slate-900 dark:group-hover:text-slate-200">{label}</span>
  </div>
);
