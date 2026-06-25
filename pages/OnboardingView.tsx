
import React, { useState, useMemo, useEffect } from 'react';
import { Profile } from '../types';
import { Icons } from '../components/Icons';
import { containsContactInfo } from '../utils/postValidation';
import { SecurityWarningModal } from '../components/SecurityWarningModal';

interface OnboardingViewProps {
  user: Profile;
  onSave: (data: Partial<Profile>) => Promise<void>;
  onComplete: () => void;
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
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan",
  "Vanuatu", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe"
];

const ALL_LANGUAGES = [
  "English", "Mandarin Chinese", "Spanish", "French", "Arabic", "Bengali", "Portuguese", "Russian", "Japanese", "Punjabi",
  "German", "Javanese", "Wu Chinese", "Hindi", "Malay", "Telugu", "Vietnamese", "Korean", "Marathi", "Tamil", "Turkish",
  "Urdu", "Italian", "Yue Chinese", "Thai", "Gujarati", "Jin Chinese", "Southern Min", "Persian", "Polish", "Pashto",
  "Kannada", "Xiang Chinese", "Malayalam", "Sundanese", "Hausa", "Odia", "Burmese", "Hakka Chinese", "Ukrainian", "Bhojpuri",
  "Tagalog", "Yoruba", "Maithili", "Uzbek", "Sindhi", "Amharic", "Fula", "Romanian", "Oromo", "Igbo", "Azerbaijani",
  "Awadhi", "Gan Chinese", "Cebuano", "Dutch", "Kurdish", "Serbo-Croatian", "Malagasy", "Saraiki", "Nepali", "Sinhala",
  "Chittagonian", "Zhuang", "Khmer", "Turkmen", "Assamese", "Madurese", "Somali", "Marwari", "Magahi", "Haryanvi",
  "Hungarian", "Chhattisgarhi", "Greek", "Chewa", "Deccan", "Akan", "Kazakh", "Min Bei", "Sylheti", "Zulu",
  "Czech", "Kinyarwanda", "Dhundhari", "Haitian Creole", "Eastern Min", "Ilocano", "Quechua", "Kirundi", "Swedish", "Hmong",
  "Shona", "Hiligaynon", "Uyghur", "Balochi", "Belarusian", "Mossi", "Xhosa", "Konkani"
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({ user, onSave, onComplete }) => {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [tempInput, setTempInput] = useState('');
  const [isListVisible, setIsListVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    homeCountries: [] as string[],
    currentLocation: '',
    languages: [] as string[],
    currentStudies: [] as string[],
    targetCountries: [] as string[],
    highestQualifications: [] as string[],
    interestAreas: [] as string[],
    targetDegree: [] as string[]
  });
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  const filteredItems = useMemo(() => {
    const list = step === 3 ? ALL_LANGUAGES : ALL_COUNTRIES;
    return list.filter(item =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, step]);

  useEffect(() => {
    if (step === 1) setSearchQuery(formData.homeCountries[0] || '');
    else if (step === 2) setSearchQuery(formData.currentLocation || '');
    else if (step === 3) setSearchQuery('');
    else if (step === 4) setTempInput(formData.currentStudies[0] || '');
    else if (step === 5) setSearchQuery('');
    else if (step === 6) setTempInput(formData.highestQualifications[0] || '');
    else if (step === 7) setTempInput('');
    else if (step === 8) setTempInput(formData.targetDegree[0] || '');
    setIsListVisible(false);
  }, [step]);

  const handleNext = async () => {
    if (step < 9) {
      if ((step === 4 || step === 6 || step === 7 || step === 8) && tempInput.trim()) {
        if (containsContactInfo(tempInput)) {
          setShowSecurityWarning(true);
          return;
        }
        if (step === 4 && !formData.currentStudies.length) handleAddTag('currentStudies');
        if (step === 6 && !formData.highestQualifications.length) handleAddTag('highestQualifications');
        if (step === 7) handleAddTag('interestAreas');
        if (step === 8 && !formData.targetDegree.length) handleAddTag('targetDegree');
      }

      if (step === 8) {
        setIsSaving(true);
        try {
          // COMPUTE FINAL DATA: Ensure latest tag from tempInput is included if not yet added
          const finalTargetDegree = (step === 8 && tempInput.trim() && !formData.targetDegree.length) 
            ? [tempInput.trim().charAt(0).toUpperCase() + tempInput.trim().slice(1)] 
            : formData.targetDegree;

          await onSave({
            homeCountries: formData.homeCountries,
            currentLocation: formData.currentLocation,
            languages: formData.languages,
            currentStudies: formData.currentStudies,
            highestQualifications: formData.highestQualifications,
            interestAreas: formData.interestAreas,
            targetCountries: formData.targetCountries,
            targetDegree: finalTargetDegree
          });
        } catch (error) {
          // Error handled in onSave (alert)
          setIsSaving(false);
          return;
        }
        setIsSaving(false);
      }

      setStep(step + 1);
    }
    else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleAddTag = (field: keyof typeof formData) => {
    if (!tempInput.trim()) return;

    if (containsContactInfo(tempInput)) {
      setShowSecurityWarning(true);
      return;
    }

    const formatted = tempInput.trim().charAt(0).toUpperCase() + tempInput.trim().slice(1);
    setFormData(prev => ({
      ...prev,
      [field]: (field === 'highestQualifications' || field === 'currentStudies' || field === 'targetDegree') ? [formatted] : [...(prev[field] as string[]), formatted]
    }));
    if (field === 'interestAreas') {
      setTempInput('');
    }
  };

  const handleEnterKey = (e: React.KeyboardEvent<HTMLInputElement>, field: 'currentStudies' | 'highestQualifications' | 'interestAreas' | 'targetDegree') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(field);
    }
  };

  const removeTag = (field: 'languages' | 'currentStudies' | 'highestQualifications' | 'interestAreas' | 'targetDegree', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const toggleHomeCountry = (country: string) => {
    const isAlreadySelected = formData.homeCountries.includes(country);
    setFormData(prev => ({
      ...prev,
      homeCountries: isAlreadySelected ? [] : [country]
    }));
    setSearchQuery(isAlreadySelected ? '' : country);
    if (!isAlreadySelected) setIsListVisible(false);
  };

  const toggleLanguage = (lang: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }));
    setIsListVisible(false);
  };

  const toggleTarget = (country: string) => {
    setFormData(prev => ({
      ...prev,
      targetCountries: prev.targetCountries.includes(country)
        ? prev.targetCountries.filter(t => t !== country)
        : [...prev.targetCountries, country]
    }));
    setSearchQuery('');
    setIsListVisible(false);
  };

  const isStepValid = () => {
    if (step === 1) return formData.homeCountries.length > 0;
    if (step === 2) return formData.currentLocation.length > 0;
    if (step === 3) return formData.languages.length > 0;
    if (step === 4) return formData.currentStudies.length > 0 || tempInput.trim() !== '';
    if (step === 5) return formData.targetCountries.length > 0;
    if (step === 6) return formData.highestQualifications.length > 0 || tempInput.trim() !== '';
    if (step === 7) return formData.interestAreas.length > 0 || tempInput.trim() !== '';
    if (step === 8) return formData.targetDegree.length > 0 || tempInput.trim() !== '';
    if (step === 9) return true;
    return false;
  };

  const isInputSelected = (field: 'currentStudies' | 'highestQualifications' | 'targetDegree') => {
    return tempInput.trim() !== '' && tempInput.trim() === (formData[field][0] || '').trim();
  };

  return (
    <div
      className="h-full min-h-full overflow-y-auto bg-white dark:bg-slate-900 flex flex-col p-2 sm:p-6 transition-colors duration-200"
    >
      <div className="max-w-md w-full animate-fade-in-up mx-auto shrink-0 pb-10 pt-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 text-white rounded-[1.5rem] flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl shadow-brand-500/30">
            {(step === 1 || step === 2) && <Icons.MapMarker />}
            {step === 3 && <i className="fas fa-language"></i>}
            {step === 4 && <Icons.GradCap />}
            {step === 5 && <Icons.Globe />}
            {step === 6 && <i className="fas fa-certificate"></i>}
            {step === 7 && <i className="fas fa-lightbulb"></i>}
            {step === 8 && <i className="fas fa-user-graduate"></i>}
            {step === 9 && <i className="fas fa-rocket"></i>}
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-brand-600' : 'w-2 bg-gray-200 dark:bg-slate-700'}`}
              />
            ))}
          </div>
          <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-2">Step {step} of 9</p>
          <h2 className="text-2xl font-black px-4 leading-tight text-slate-900 dark:text-white">
            {step === 1 && "What is your nationality?"}
            {step === 2 && "Where is your current residency?"}
            {step === 3 && "Which languages do you speak?"}
            {step === 4 && "Where are you currently studying? (or completed your last degree)"}
            {step === 5 && "Which country would you like to apply to?"}
            {step === 6 && "What is your highest academic qualification?"}
            {step === 7 && "Which area of study are you interested in?"}
            {step === 8 && "What is your target degree?"}
            {step === 9 && "Profile Setup Complete!"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm px-6">
            {step === 1 && "Choose countries based on your citizenships."}
            {step === 2 && "Choose country based on your residency."}
            {step === 3 && "Choose all the languages you speak."}
            {step === 4 && "Enter institution name."}
            {step === 5 && "Choose all the countries you want to apply to."}
            {step === 6 && "Enter the degree you have achieved."}
            {step === 7 && "Enter study areas you're interested in."}
            {step === 8 && "Enter your target degree (e.g. Master, PhD)."}
            {step === 9 && "You're all set! Here is what you can do next."}
          </p>
        </div>

        <div className="space-y-6">
          {(step === 1 || step === 2 || step === 3) && (
            <div className="space-y-4">
              <div className="relative">
                <i className={`fas ${step === 1 ? 'fa-flag' : step === 2 ? 'fa-map-marker-alt' : 'fa-language'} absolute left-4 top-1/2 -translate-y-1/2 text-slate-400`}></i>
                <input
                  type="text"
                  placeholder={step === 3 ? "Search languages..." : "Search countries..."}
                  value={isListVisible ? searchQuery : (
                    step === 1 ? (formData.homeCountries[0] || '') : 
                    step === 2 ? (formData.currentLocation || '') : 
                    searchQuery
                  )}
                  onFocus={() => { setIsListVisible(true); setSearchQuery(''); }}
                  onBlur={() => setTimeout(() => setIsListVisible(false), 200)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsListVisible(true);
                  }}
                  className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-transparent focus:border-brand-500 rounded-2xl outline-none transition text-sm font-bold"
                />
              </div>

              {(step === 3 && formData.languages.length > 0) && (
                <div className="flex flex-wrap gap-1.5 p-1">
                  {formData.languages.map(lang => (
                    <span key={lang} className="text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 px-2 py-1 rounded-md flex items-center gap-1 border border-brand-100 dark:border-brand-800/50 animate-fade-in-up">
                      {lang}
                      <button onClick={() => toggleLanguage(lang)} className="hover:text-red-500"><i className="fas fa-times"></i></button>
                    </span>
                  ))}
                </div>
              )}

              {isListVisible && (
                <div className="grid grid-cols-1 gap-2 max-h-[280px] overflow-y-auto p-2 scrollbar-hide border border-gray-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
                  {filteredItems.map(item => {
                    const isSelected = step === 1 ? formData.homeCountries.includes(item) :
                      step === 2 ? formData.currentLocation === item :
                        formData.languages.includes(item);
                    return (
                      <button
                        key={item}
                        onClick={() => {
                          if (step === 1) toggleHomeCountry(item);
                          else if (step === 2) {
                            const isAlreadySelected = formData.currentLocation === item;
                            setFormData({ ...formData, currentLocation: isAlreadySelected ? '' : item });
                            setSearchQuery(isAlreadySelected ? '' : item);
                            if (!isAlreadySelected) setIsListVisible(false);
                          } else {
                            toggleLanguage(item);
                          }
                          if (step === 3) setSearchQuery('');
                        }}
                        className={`py-4 px-6 rounded-xl text-sm font-bold border-2 transition-all text-left flex items-center justify-between ${isSelected
                          ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20'
                          : 'bg-white dark:bg-slate-900 border-transparent text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                          }`}
                      >
                        <span>{item}</span>
                        {isSelected && <i className="fas fa-check"></i>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. University of Sao Paulo"
                  value={tempInput}
                  onChange={e => setTempInput(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                  onKeyDown={e => handleEnterKey(e, 'currentStudies')}
                  className="w-full px-4 pr-12 py-3.5 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  type="text"
                  placeholder="Search target countries..."
                  value={searchQuery}
                  onFocus={() => { setIsListVisible(true); setSearchQuery(''); }}
                  onBlur={() => setTimeout(() => setIsListVisible(false), 200)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsListVisible(true);
                  }}
                  className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-transparent focus:border-brand-500 rounded-2xl outline-none transition text-sm font-bold"
                />
              </div>

              {formData.targetCountries.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-1">
                  {formData.targetCountries.map(t => (
                    <span key={t} className="text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 px-2 py-1 rounded-md flex items-center gap-1 border border-brand-100 dark:border-brand-800/50 animate-fade-in-up">
                      {t} <button onClick={(e) => { e.stopPropagation(); toggleTarget(t); }} className="hover:text-red-500"><i className="fas fa-times"></i></button>
                    </span>
                  ))}
                </div>
              )}

              {isListVisible && (
                <div className="grid grid-cols-1 gap-2 max-h-[35vh] overflow-y-auto p-2 scrollbar-hide border border-gray-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xl">
                  {filteredItems.map(country => (
                    <button
                      key={country}
                      onClick={() => toggleTarget(country)}
                      className={`py-4 px-6 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-between ${formData.targetCountries.includes(country)
                        ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20'
                        : 'bg-white dark:bg-slate-900 border-transparent text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      <span className="truncate">{country}</span>
                      {formData.targetCountries.includes(country) ? (
                        <i className="fas fa-check-circle"></i>
                      ) : (
                        <i className="far fa-circle text-slate-300"></i>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. BSc in Computer Science"
                  value={tempInput}
                  onChange={e => setTempInput(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                  onKeyDown={e => handleEnterKey(e, 'highestQualifications')}
                  className="w-full px-4 pr-12 py-3.5 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  id="interestAreasInput"
                  autoFocus
                  type="text"
                  placeholder="e.g. Artificial Intelligence"
                  value={tempInput}
                  onChange={e => setTempInput(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                  onKeyDown={e => handleEnterKey(e, 'interestAreas')}
                  className="w-full pl-6 pr-14 py-5 bg-gray-50 dark:bg-slate-800 text-slate-900 dark:text-white border-none rounded-[2rem] text-lg font-bold outline-none focus:ring-4 focus:ring-brand-500/10 text-center"
                />
                {tempInput.trim() && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                    <button
                      type="button"
                      onClick={() => handleAddTag('interestAreas')}
                      className="w-10 h-10 flex items-center justify-center bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-500/20"
                    >
                      <i className="fas fa-arrow-right text-xs"></i>
                    </button>
                  </div>
                )}
              </div>
              {formData.interestAreas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {formData.interestAreas.map((item, idx) => (
                    <span key={idx} className="text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 px-2 py-1 rounded-md flex items-center gap-1 border border-brand-100 dark:border-brand-800/50 animate-fade-in-up">
                      {item}
                      <button onClick={() => removeTag('interestAreas', idx)} className="hover:text-red-500">
                        <i className="fas fa-times"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Master's in Computer Science"
                  value={tempInput}
                  onChange={e => setTempInput(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))}
                  onKeyDown={e => handleEnterKey(e, 'targetDegree')}
                  className="w-full px-4 pr-12 py-3.5 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {step === 9 && (
            <div className="space-y-4 animate-fade-in-up text-center">
              <div className="bg-brand-50 dark:bg-slate-800 rounded-[2rem] p-6 border border-brand-100 dark:border-slate-700">
                <ul className="space-y-3 text-left">
                  <li className="flex gap-3 items-center">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 text-xs">
                      <i className="fas fa-share-nodes"></i>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Share your study journey</span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 text-xs">
                      <i className="fas fa-user-friends"></i>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Discover, connect or hire Uni Experts</span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 text-xs">
                      <i className="fas fa-route"></i>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Track your study journey</span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 text-xs">
                      <i className="fas fa-user-graduate"></i>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Apply to become a Uni Expert</span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 text-xs">
                      <i className="fas fa-chalkboard-teacher"></i>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Guide prospective students and earn money</span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 text-xs">
                      <i className="fas fa-comment-dots"></i>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Subscribe to unlock chat</span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 text-xs">
                      <i className="fas fa-hand-holding-dollar"></i>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Get 20% money back if Visa rejected</span>
                  </li>
                  <li className="flex gap-3 items-center">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center shrink-0 text-xs">
                      <i className="fas fa-wallet"></i>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Track finances in Wallet</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            {step > 1 && step < 9 && (
              <button
                onClick={handleBack}
                className="flex-1 py-5 bg-gray-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-[2rem] text-lg font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition active:scale-95"
              >
                Previous
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid() || isSaving}
              className={`${step > 1 && step < 9 ? 'flex-[2]' : 'w-full'} py-5 bg-brand-600 text-white rounded-[2rem] text-lg font-bold shadow-2xl shadow-brand-500/30 active:opacity-80 transition disabled:opacity-50 cursor-pointer touch-manipulation`}
            >
              {isSaving ? "Saving..." : step === 9 ? "Explore Migonest" : "Continue"}
            </button>
          </div>
        </div>
      </div>
      <SecurityWarningModal 
        isOpen={showSecurityWarning} 
        onClose={() => setShowSecurityWarning(false)} 
      />
    </div>
  );
};
