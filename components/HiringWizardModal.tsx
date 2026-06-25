import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Profile } from '../types';
import { Icons } from './Icons';
import { SERVICE_FEE } from '../constants';
import { openExternalUrl } from '../utils/openExternalUrl';

interface Props {
  expert: Profile;
  user: Profile;
  onClose: () => void;
  onConfirm: (data: { formData: any, agreements: any, uploadedFiles: { passport: File[], residency: File[], education: File[] } }) => void;
  isSubmittingExternal?: boolean;
  isIOSNative?: boolean;
}

interface FileListState {
  files: File[];
  error: string | null;
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

export const HiringWizardModal: React.FC<Props> = ({ expert, user, onClose, onConfirm, isSubmittingExternal, isIOSNative }) => {
  if (isIOSNative) return null;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nationality: user.homeCountries || [],
    residency: user.currentLocation || '',
    languages: user.languages || [],
    lastEducation: user.highestQualifications || [],
    targetCountries: expert.targetCountries || [],
    targetUnis: [] as string[],
    targetDegree: user.targetDegree || []
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [tempEdu, setTempEdu] = useState(user.highestQualifications?.[0] || '');
  const [tempUni, setTempUni] = useState('');
  const [tempTargetDegree, setTempTargetDegree] = useState(user.targetDegree?.[0] || '');
  const [activeSearchField, setActiveSearchField] = useState<'home' | 'current' | 'languages' | 'targets' | null>(null);

  const [agreements, setAgreements] = useState({
    maxLimit: false,
    noResponsibility: false,
    refundPolicy: false
  });

  const [passportFiles, setPassportFiles] = useState<FileListState>({ files: [], error: null });
  const [residencyFiles, setResidencyFiles] = useState<FileListState>({ files: [], error: null });
  const [educationFiles, setEducationFiles] = useState<FileListState>({ files: [], error: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    console.log('[HiringWizard] Component mounted');
    return () => { 
      document.body.style.overflow = 'unset'; 
      console.log('[HiringWizard] Component unmounted');
    };
  }, []);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSelection = (field: 'nationality' | 'languages' | 'targetCountries', value: string) => {
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

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<FileListState>>) => {
    e.preventDefault();
    e.stopPropagation();
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

  const canContinueStep1 =
    formData.nationality.length > 0 &&
    formData.residency &&
    formData.languages.length > 0 &&
    (formData.lastEducation.length > 0 || tempEdu.trim()) &&
    formData.targetCountries.length > 0 &&
    (formData.targetDegree.length > 0 || tempTargetDegree.trim());

  const canContinueStep2 = true; // Documents are now optional as they can be shared later.

  const isInputSelected = (field: 'lastEducation' | 'targetDegree') => {
    if (field === 'lastEducation') return tempEdu.trim() !== '' && tempEdu.trim() === (formData.lastEducation[0] || '').trim();
    if (field === 'targetDegree') return tempTargetDegree.trim() !== '' && tempTargetDegree.trim() === (formData.targetDegree[0] || '').trim();
    return false;
  };

  const handleSetSingleTag = (field: 'lastEducation' | 'targetDegree', val: string) => {
    if (val.trim()) {
      setFormData(prev => ({ ...prev, [field]: [val.trim().charAt(0).toUpperCase() + val.trim().slice(1)] }));
    }
  };
  const canSubmit =
    agreements.maxLimit &&
    agreements.noResponsibility &&
    agreements.refundPolicy;

  const handleContinueStep1 = () => {
    if (tempEdu.trim() && !isInputSelected('lastEducation')) {
      handleSetSingleTag('lastEducation', tempEdu);
    }
    if (tempTargetDegree.trim() && !isInputSelected('targetDegree')) {
      handleSetSingleTag('targetDegree', tempTargetDegree);
    }
    if (tempUni.trim()) {
      setFormData(prev => ({ ...prev, targetUnis: [...prev.targetUnis, tempUni.trim().charAt(0).toUpperCase() + tempUni.trim().slice(1)] }));
      setTempUni('');
    }
    setStep(2);
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    const data = {
      formData: {
        ...formData,
        nationality: formData.nationality.join(', '),
        languages: formData.languages.join(', '),
        targetCountries: formData.targetCountries.join(', '),
        lastEducation: formData.lastEducation.join(', '),
        targetUnis: formData.targetUnis.join(', '),
        targetDegree: formData.targetDegree.join(', ')
      },
      agreements,
      uploadedFiles: {
        passport: passportFiles.files,
        residency: residencyFiles.files,
        education: educationFiles.files
      }
    };
    console.log('[HiringWizard] Initiating confirm with data:', data);
    try {
      await onConfirm(data);
    } catch (err: any) {
      console.error('[HiringWizard] Submission failed:', err);
      let errorMsg = err.message || 'Hiring expert failed. Please try again.';
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        errorMsg = 'Connection Error: Secure connection to payment gateway failed (CORS/Network). Please refresh and try again. Origin: ' + window.location.origin;
      }
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[1000] overflow-y-auto bg-black/60 backdrop-blur-md transition-all duration-300 flex justify-center items-start pt-4 sm:pt-10 pb-10 px-2 sm:px-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-lg w-full p-6 sm:p-8 md:p-10 relative shadow-2xl animate-fade-in-up my-auto sm:my-0 flex flex-col h-auto"
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
          <div className="w-14 h-14 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm">
            <i className="fas fa-user-tie"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Hire {expert.fullName}</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Full admission assistance service setup.</p>

          <div className="flex gap-2 mt-6">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-brand-600' : 'bg-gray-100 dark:bg-slate-700'}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-fade-in-up overflow-y-auto pr-2">
            <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-slate-700 pb-2">Step 1: Your Goals</h3>
            <div className="grid grid-cols-1 gap-4">

              {/* Nationality Single-select */}
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

              {/* Residency Single Selection */}
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

              {/* Communication Languages Multi-select */}
              <div className="space-y-1.5 relative search-container">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Communication Languages</label>
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

              {/* Tag-based Education Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Completed Education</label>
                <div className="relative">
                  <input
                    type="text"
                    value={tempEdu}
                    onChange={e => setTempEdu(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && tempEdu.trim()) {
                        e.preventDefault();
                        handleSetSingleTag('lastEducation', tempEdu);
                      }
                    }}
                    placeholder="Type qualification"
                    className="w-full px-4 pr-12 py-3.5 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Target Countries Multi-select */}
              <div className="space-y-1.5 relative search-container">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Countries</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.targetCountries.map(c => (
                    <span key={c} className="text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200 px-2 py-1 rounded-md flex items-center gap-1 border border-brand-100">
                      {c} <button onClick={() => toggleSelection('targetCountries', c)}><i className="fas fa-times"></i></button>
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
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white font-medium"
                  />
                  {activeSearchField === 'targets' && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto scrollbar-hide">
                      {filteredItems.map(c => (
                        <div key={c} onClick={() => toggleSelection('targetCountries', c)} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm flex justify-between items-center text-slate-700 dark:text-slate-200">
                          {c} {formData.targetCountries.includes(c) && <i className="fas fa-check text-brand-600"></i>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tag-based Target Degree Input */}
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
                    placeholder="e.g. Master's in Computer Science"
                    className="w-full px-4 pr-12 py-3.5 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Tag-based Target Universities Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Universities (if any)</label>
                <div className="relative">
                  <input
                    id="targetUniInput"
                    type="text"
                    value={tempUni}
                    onChange={e => setTempUni(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && tempUni.trim()) {
                        e.preventDefault();
                        setFormData(prev => ({ ...prev, targetUnis: [...prev.targetUnis, tempUni.trim().charAt(0).toUpperCase() + tempUni.trim().slice(1)] }));
                        setTempUni('');
                      }
                    }}
                    placeholder="Type university name"
                    className="w-full px-4 pr-12 py-3.5 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                  />
                  {tempUni.trim() && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                      <button
                        type="button"
                        onClick={() => {
                          if (tempUni.trim()) {
                            setFormData(prev => ({ ...prev, targetUnis: [...prev.targetUnis, tempUni.trim().charAt(0).toUpperCase() + tempUni.trim().slice(1)] }));
                            setTempUni('');
                          }
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition shadow-lg shadow-brand-500/20"
                      >
                        <i className="fas fa-arrow-right text-xs"></i>
                      </button>
                    </div>
                  )}
                </div>
                {formData.targetUnis.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.targetUnis.map((item, idx) => (
                      <span key={idx} className="text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200 px-2 py-1 rounded-md flex items-center gap-1 border border-brand-100">
                        {item} <button onClick={() => setFormData(prev => ({ ...prev, targetUnis: prev.targetUnis.filter((_, i) => i !== idx) }))}><i className="fas fa-times"></i></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleContinueStep1}
              disabled={!canContinueStep1}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition disabled:opacity-50 mt-4"
            >
              Continue to Document Uploads
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in-up overflow-y-auto pr-2">
            <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-slate-700 pb-2">Step 2: Share Documents (Optional)</h3>
            <p className="text-xs text-slate-500 italic">These are optional. You can also share these documents later during your admission journey.</p>
            <div className="space-y-6">
              <FileUploadSection label="Passport or ID" state={passportFiles} onFileSelect={(e: any) => handleFileSelection(e, setPassportFiles)} onRemoveFile={(idx: number) => setPassportFiles(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }))} />
              <FileUploadSection label="Academic Records (Transcript/Degree)" state={residencyFiles} onFileSelect={(e: any) => handleFileSelection(e, setResidencyFiles)} onRemoveFile={(idx: number) => setResidencyFiles(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }))} />
              <FileUploadSection label="Test scores e.g. IELTS, TOEFL, GRE, GMAT" state={educationFiles} onFileSelect={(e: any) => handleFileSelection(e, setEducationFiles)} onRemoveFile={(idx: number) => setEducationFiles(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }))} />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex-1 py-4 bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-xs uppercase tracking-widest">Back</button>
              <button
                onClick={() => setStep(3)}
                disabled={!canContinueStep2}
                className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition disabled:opacity-50"
              >
                Review Conditions & Pay
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in-up overflow-y-auto pr-2">
            <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-slate-700 pb-2">Step 3: Service Terms</h3>

            <div className="bg-blue-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 mb-6">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">Financial Transparency:</p>
              <p className="text-[10px] text-blue-600 dark:text-blue-500 leading-relaxed">
                From your <b>${SERVICE_FEE}</b> payment: 20% is Migonest's fee, 40% is released to the expert immediately, and 40% stays in <b>Escrow</b> until your visa outcome.
              </p>
            </div>

            {/* Document Review Section */}
            <div className="space-y-2 mb-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Review Attached Documents</h4>
              <div className="flex flex-wrap gap-2">
                {[...passportFiles.files, ...residencyFiles.files, ...educationFiles.files].map((file, idx) => (
                  <a
                    key={idx}
                    href={URL.createObjectURL(file)}
                    download={file.name}
                    className="text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 flex items-center gap-2 hover:border-brand-500 hover:text-brand-600 transition-colors"
                  >
                    <i className="fas fa-file-alt text-brand-500"></i> {file.name} <i className="fas fa-download ml-1 opacity-50"></i>
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <ConditionToggle checked={agreements.maxLimit} onChange={() => setAgreements({ ...agreements, maxLimit: !agreements.maxLimit })} label="I understand this assistance covers a maximum of 4 universities/countries." />
              <ConditionToggle checked={agreements.noResponsibility} onChange={() => setAgreements({ ...agreements, noResponsibility: !agreements.noResponsibility })} label="I agree that while guidance is professional, the final visa/admission result is decided by authorities." />
              <ConditionToggle checked={agreements.refundPolicy} onChange={() => setAgreements({ ...agreements, refundPolicy: !agreements.refundPolicy })} label={`I accept the 20% ($${(SERVICE_FEE * 0.2).toFixed(2)}) automatic refund policy in case of a documented visa denial.`} />
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(2)} className="flex-1 py-4 bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-xs uppercase tracking-widest transition">Back</button>
              {isIOSNative === false ? (
                <button
                  onClick={handleFinalConfirm}
                  disabled={!canSubmit || isSubmitting || isSubmittingExternal}
                  className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-brand-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isSubmitting || isSubmittingExternal ? (
                    <><i className="fas fa-circle-notch fa-spin"></i> Processing...</>
                  ) : (
                    <><i className="fas fa-credit-card"></i> Pay ${SERVICE_FEE} via Stripe</>
                  )}
                </button>
              ) : (
                <div className="flex-[2] p-5 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 text-center">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed mb-4">
                    Expert hiring is managed through our web platform.
                  </p>
                  <button
                    onClick={() => openExternalUrl('https://migonest.com/discover/')}
                    className="w-full py-3 bg-brand-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95"
                  >
                    Hire on Website
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl text-[10px] text-red-600 dark:text-red-400 font-bold text-center animate-shake">
                <i className="fas fa-exclamation-circle mr-1"></i> {error}
              </div>
            )}
            <p className="text-[10px] text-center text-slate-400 font-medium">Secured by Migonest Stripe Connect</p>
          </div>
        )}
      </div>
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
          onChange={onFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          accept="application/pdf,image/*"
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
        {state.files.length === 0 && <p className="text-[10px] text-slate-400 italic ml-1">Optional: .PDF or .JPG/.PNG (Max 10MB)</p>}
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