import React, { useState } from 'react';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  details: string[];
}

export const PromoBannerView: React.FC<{ onBack?: () => void; isIOSNative?: boolean }> = ({ onBack, isIOSNative }) => {
  const [universityName, setUniversityName] = useState('Your University');
  const [selectedFeature, setSelectedFeature] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<'BANNER' | 'ROADMAP' | 'DOWNLOAD'>('BANNER');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const features: FeatureCardProps[] = [
    {
      icon: 'fa-user-graduate',
      title: 'Verified Global Experts',
      description: 'Connect directly with current students & alumni studying at your dream destinations.',
      badge: 'Peer-to-Peer',
      details: [
        'Real-world experiences from people already on-campus',
        'Direct 1-on-1 private chat sessions',
        'Culturally aligned guidance matched to your background',
        'Authentic, unbiased answers about university life and costs'
      ]
    },
    {
      icon: 'fa-shield-halved',
      title: 'Escrow-Secured Journey',
      description: 'Total safety for your funds. Milestone-based release & standardized refund policy.',
      badge: '100% Protected',
      details: [
        'Service fees held securely in Escrow',
        'Funds released only upon your approval of milestone',
        'Clear, predefined 8-step admission roadmap',
        'Secure payment methods and transaction history in your wallet'
      ]
    },
    {
      icon: 'fa-map-location-dot',
      title: 'Complete Visa Assistance',
      description: 'Comprehensive, step-by-step guidance on Visa and Residence Permit applications.',
      badge: 'Visa & Permit',
      details: [
        'Document checklist tailored to country-specific guidelines',
        'Expert proofreading of visa justification letters',
        '20% safety refund guarantee in case of visa denial',
        'Live milestones for tracking embassy submission status'
      ]
    },
    {
      icon: 'fa-comments-dollar',
      title: 'Monetize Your Experience',
      description: 'Are you already studying abroad? Guide future students and earn secure income.',
      badge: 'For Experts',
      details: [
        'Set your profile live and receive admission inquiry requests',
        'Earn $399 per student journey with 40% immediate release',
        'Built-in secure withdrawal request system to local bank',
        'Create professional brand authority as a verified Uni Expert'
      ]
    }
  ];

  const roadmapSteps = [
    {
      step: '01',
      title: 'Requirements',
      desc: 'Evaluation of academic eligibility and test scores',
      icon: 'fa-folder-open',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      step: '02',
      title: 'Documents',
      desc: 'Preparation of SOP, LORs and Transcripts',
      icon: 'fa-file-signature',
      color: 'from-indigo-500 to-purple-600'
    },
    {
      step: '03',
      title: 'Application Fee',
      desc: 'Payment of university processing fees',
      icon: 'fa-credit-card',
      color: 'from-purple-500 to-pink-600'
    },
    {
      step: '04',
      title: 'Applied',
      desc: 'Official submission of application to target universities',
      icon: 'fa-paper-plane',
      color: 'from-pink-500 to-rose-600'
    },
    {
      step: '05',
      title: 'Acceptance Letter',
      desc: 'Receipt of official offer letter from university',
      icon: 'fa-award',
      color: 'from-rose-500 to-amber-600'
    },
    {
      step: '06',
      title: 'Visa',
      desc: 'Embassy appointment and visa documentation',
      icon: 'fa-passport',
      color: 'from-amber-500 to-orange-600'
    },
    {
      step: '07',
      title: 'Admitted',
      desc: 'Final enrollment and tuition deposit confirmed',
      icon: 'fa-user-check',
      color: 'from-orange-500 to-emerald-600'
    },
    {
      step: '08',
      title: 'Accommodation',
      desc: 'Securing student housing and travel prep',
      icon: 'fa-campground',
      color: 'from-emerald-500 to-teal-600'
    }
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://www.migonest.com');
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className={`min-h-screen bg-slate-900 text-white font-sans transition-all duration-500 ${isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto px-4 py-8 md:p-12' : ''}`}>
      
      {/* Header controls */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center border-b border-slate-800 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-brand-600 text-white px-2 py-0.5 rounded-md text-xs font-black uppercase tracking-widest">Seminar Mode</span>
            <span className="text-slate-400 text-xs">V1.0.9 Interactive Toolkit</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <i className="fas fa-presentation text-brand-500"></i> Migonest Seminar Presentation
          </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {onBack && !isFullscreen && (
            <button
              onClick={onBack}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              <i className="fas fa-arrow-left mr-2"></i> Exit
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
          >
            <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
            {isFullscreen ? 'Exit Fullscreen' : 'Project On Screen'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Controls & Interactive Customization (Hidden in fullscreen if desired, but kept for active adjustment) */}
        <div className={`space-y-6 ${isFullscreen ? 'lg:col-span-1' : ''}`}>
          
          {/* 1. Live Banner Header Customizer */}
          <div className="bg-slate-800/80 border border-slate-700/50 backdrop-blur-md p-6 rounded-2xl shadow-xl">
            <h3 className="text-xs font-black text-brand-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fas fa-sliders text-sm"></i> Seminar Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Institution Name</label>
                <input
                  type="text"
                  value={universityName}
                  onChange={(e) => setUniversityName(e.target.value)}
                  placeholder="e.g. Harvard University"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                />
                <p className="text-[10px] text-slate-500 mt-1">Updates the live interactive presentation header instantly.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Showcase Navigation</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setActiveTab('BANNER')}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'BANNER' ? 'bg-brand-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'}`}
                  >
                    Hero Promo
                  </button>
                  <button
                    onClick={() => setActiveTab('ROADMAP')}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ROADMAP' ? 'bg-brand-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'}`}
                  >
                    Roadmap
                  </button>
                  <button
                    onClick={() => setActiveTab('DOWNLOAD')}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'DOWNLOAD' ? 'bg-brand-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'}`}
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Interactive Feature Details Panel */}
          <div className="bg-slate-800/80 border border-slate-700/50 backdrop-blur-md p-6 rounded-2xl shadow-xl">
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fas fa-circle-info"></i> Feature Deep Dive
            </h3>
            
            {selectedFeature !== null ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-900/50 border border-indigo-700/30 rounded-xl flex items-center justify-center text-indigo-400 text-lg">
                    <i className={`fas ${features[selectedFeature].icon}`}></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{features[selectedFeature].title}</h4>
                    <span className="text-[9px] font-black uppercase tracking-widest bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full">
                      {features[selectedFeature].badge}
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed">
                  {features[selectedFeature].description}
                </p>

                <div className="border-t border-slate-700/50 pt-4 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Why it matters to students:</p>
                  <ul className="space-y-2">
                    {features[selectedFeature].details.map((detail, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <i className="fas fa-check text-green-500 mt-0.5"></i>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Click on any feature card in the main banner to inspect details live.</p>
            )}
          </div>
          
          {/* 3. Fast Promo Copy */}
          <div className="bg-slate-800/80 border border-slate-700/50 backdrop-blur-md p-6 rounded-2xl shadow-xl">
            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <i className="fas fa-share-nodes"></i> Share with Audience
            </h3>
            <p className="text-xs text-slate-400 mb-4">Provide these links to college students so they can join right now.</p>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 bg-slate-900 border border-slate-700 hover:border-slate-500 text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <i className={`fas ${copiedText ? 'fa-check text-green-400' : 'fa-copy'}`}></i>
                {copiedText ? 'Copied URL!' : 'Copy Portal URL'}
              </button>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The Interactive Live Canvas */}
        <div className={`lg:col-span-2 space-y-6 ${isFullscreen ? 'lg:col-span-2' : ''}`}>
          
          {/* Tab 1: Hero Interactive Banner */}
          {activeTab === 'BANNER' && (
            <div className="bg-gradient-to-tr from-brand-900 via-brand-950 to-indigo-950 border border-brand-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[580px] group">
              {/* Background ambient glows */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
              
              {/* Top branding */}
              <div className="flex justify-between items-start z-10 w-full relative">
                {/* Left: Text Branding */}
                <div className="flex flex-col text-left justify-start">
                  <h1 className="text-xl font-black tracking-tight text-white">Migonest</h1>
                  <p className="text-[9px] font-black uppercase tracking-widest text-brand-400">Study Abroad Made Simple</p>
                </div>

                {/* Center: Logo (Absolute to remove empty space below) */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-2 flex justify-center items-start pointer-events-none z-20">
                  <img src="/assets/Migonest-Primary-Logo.png" alt="Migonest Logo" className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-2xl" />
                </div>

                {/* Right: Badge */}
                <div className="flex justify-end items-start">
                  <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-300 border border-white/5 whitespace-nowrap">
                    Live Presentation
                  </span>
                </div>
              </div>

              {/* Main Banner Headline Content */}
              <div className="my-10 z-10 space-y-4 max-w-xl text-left">
                <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 px-3 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-ping"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-300">Proudly Welcoming {universityName}</span>
                </div>
                
                <h2 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight text-white">
                  Where <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-300 to-indigo-400">Aspirations</span> Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-brand-400">Experience</span> at <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-indigo-400 to-indigo-300">{universityName}</span>
                </h2>
                
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
                  Connect with real international students and verified alumni already living the dream at your dream university. Safe escrows, 100% genuine guidance, and step-by-step visa assistance.
                </p>
              </div>

              {/* Grid of Interactive Key Feature Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 z-10">
                {features.map((feat, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedFeature(idx)}
                    className={`flex items-center gap-4 p-4 rounded-2xl text-left border transition-all duration-300 ${selectedFeature === idx ? 'bg-indigo-600/30 border-brand-500 shadow-lg shadow-brand-500/10' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors ${selectedFeature === idx ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      <i className={`fas ${feat.icon}`}></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">{feat.title}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{feat.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Interactive Roadmap View */}
          {activeTab === 'ROADMAP' && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl min-h-[580px] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white">Interactive Admission Roadmap</h3>
                    <p className="text-xs text-slate-400">Walk your seminar audience through the entire step-by-step process of going abroad.</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                    Guaranteed Transparency
                  </span>
                </div>

                {/* 8-Step Grid Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                  {roadmapSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/90 border border-slate-800/80 hover:border-brand-500/40 p-5 rounded-2xl flex flex-col justify-between hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-500/5 transition-all duration-300 group cursor-pointer"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-black text-slate-500 group-hover:text-brand-400 transition-colors uppercase tracking-widest">Step {step.step}</span>
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${step.color} flex items-center justify-center text-white text-sm shadow-lg shadow-brand-500/10`}>
                            <i className={`fas ${step.icon}`}></i>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <h4 className="font-black text-[15px] text-white group-hover:text-brand-300 transition-colors tracking-tight leading-snug">{step.title}</h4>
                          <p className="text-[12px] text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escrow note block */}
              <div className="bg-brand-600/10 border border-brand-500/20 rounded-2xl p-4 mt-4 flex flex-col sm:flex-row items-center gap-4 text-left">
                <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white text-lg flex-shrink-0">
                  <i className="fas fa-handshake"></i>
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase tracking-widest text-brand-300 mb-0.5">Double Handshake Security</h4>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Student pays up front, but funds remain locked in secure escrows. Funds are released step-by-step only when the Student clicks **Approve Milestone** at each step. In case of official visa refusal, the student gets a secure 20% refund!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Interactive Phone / App Mockup & QR Portal */}
          {activeTab === 'DOWNLOAD' && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl min-h-[580px] flex flex-col justify-between animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center my-auto">
                
                {/* Left: Mobile App mockup with Migonest_Mobile.png */}
                <div className="flex justify-center">
                  <div className="w-[265px] h-[540px] bg-slate-950 border-[8px] border-slate-800 rounded-[38px] shadow-2xl relative overflow-hidden group">
                    {/* Speaker/Camera notch */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-5 bg-slate-800 rounded-b-xl z-20"></div>
                    
                    {/* Full-bleed Migonest Mobile Screen Image */}
                    <img 
                      src="/assets/Migonest_Mobile.png" 
                      className="w-full h-full object-cover rounded-[28px]" 
                      alt="Migonest Mobile App" 
                    />
                  </div>
                </div>

                {/* Right: Scan to download block */}
                <div className="space-y-6 text-left">
                  <div className="space-y-2">
                    <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      Join the Community
                    </span>
                    <h3 className="text-2xl font-black text-white">Scan to Download</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Open your mobile camera and scan this code to install Migonest and begin your study abroad journey today!
                    </p>
                  </div>

                  {/* Proper QR Code pointing directly to https://www.migonest.com/ */}
                  <div className="inline-block bg-white p-4 rounded-3xl shadow-xl shadow-brand-500/5">
                    <div className="w-40 h-40 bg-white rounded-2xl flex items-center justify-center overflow-hidden">
                      <img 
                        src="/assets/Migonest_QR_Code_New.png" 
                        className="w-full h-full object-contain" 
                        alt="QR Link: https://www.migonest.com/" 
                      />
                    </div>
                  </div>



                  {/* Social Links */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center gap-4">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Follow Us:</span>
                    <div className="flex items-center gap-3">
                      <a
                        href="https://www.facebook.com/profile.php?id=61572250709240"
                        target="_blank"
                        rel="noreferrer"
                        className="w-10 h-10 bg-slate-900 border border-slate-800 hover:border-brand-500 hover:text-brand-500 rounded-xl flex items-center justify-center text-slate-400 transition-all text-base"
                        title="Facebook"
                      >
                        <i className="fab fa-facebook-f"></i>
                      </a>
                      
                      <a
                        href="https://www.linkedin.com/company/migonest/"
                        target="_blank"
                        rel="noreferrer"
                        className="w-10 h-10 bg-slate-900 border border-slate-800 hover:border-brand-500 hover:text-brand-500 rounded-xl flex items-center justify-center text-slate-400 transition-all text-base"
                        title="LinkedIn"
                      >
                        <i className="fab fa-linkedin-in"></i>
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
