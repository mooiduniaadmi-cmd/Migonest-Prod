import React, { useState } from 'react';
import { trackEvent } from '../services/analytics';
import { Icons } from '../components/Icons';
import { TermsModal } from '../components/TermsModal';
import { PrivacyModal } from '../components/PrivacyModal';

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  guestMessage?: string | null;
  error?: string | null;
  isIOSNative?: boolean;
  onShowPrivacy?: () => void;
  onShowTerms?: () => void;
  onShowAboutUs?: () => void;
  onShowHelpCenter?: () => void;
  onShowExpertGuidelines?: () => void;
  onShowRefundGuarantee?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onLogin, onSignup, isDark, toggleTheme, guestMessage, error, isIOSNative,
  onShowPrivacy, onShowTerms, onShowAboutUs, onShowHelpCenter, onShowExpertGuidelines, onShowRefundGuarantee
}) => {
  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-200">
      {/* Navbar Container - Always outside scrollable area */}
      <nav className="flex-none bg-white dark:bg-slate-900 z-50 pt-safe h-[calc(4rem+var(--safe-top))] border-b border-slate-100 dark:border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto h-16 px-6 flex justify-between items-center">
          <div 
            className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform" 
            onClick={() => {
              const main = document.querySelector('main');
              if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <img src="/assets/Migonest_ Logo_Icon.png?v=5" alt="Migonest" className="h-7 w-auto object-contain dark:bg-slate-100 dark:rounded-lg dark:p-1 sm:hidden" />
            <img src="/assets/Migonest-Primary-Logo.png" alt="Migonest" className="h-7 w-auto object-contain dark:brightness-110 hidden sm:block" />
          </div>
          <div className="flex items-center gap-2 sm:gap-8">
            <button
              onClick={toggleTheme}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-brand-600 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Icons.Sun /> : <Icons.Moon />}
            </button>
            <div className="flex items-center gap-3 sm:gap-8">
              <button onClick={() => { trackEvent('LOGIN_CLICK'); onLogin(); }} className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-brand-600 transition">Log in</button>
              <button onClick={onSignup} className="px-5 sm:px-8 py-2 sm:py-2.5 bg-brand-600 text-white rounded-full text-xs sm:text-sm font-black shadow-xl shadow-brand-500/20 hover:scale-105 transition active:scale-95 leading-none">Sign up</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Scrollable Area */}
      <main
        className="flex-1 overflow-y-auto font-sans overflow-x-hidden scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Error Banner (Stale Link/Auth Error) */}
        {error && (
          <div className="sticky top-0 z-[100] bg-red-600 text-white py-4 px-6 animate-fade-in text-center shadow-2xl flex items-center justify-center gap-3 border-b border-red-700">
            <i className="fas fa-exclamation-triangle"></i>
            <span className="text-sm font-black uppercase tracking-wider">{error}</span>
          </div>
        )}

        {/* Guest Messenger Banner */}
        {guestMessage && !error && (
          <div className="bg-brand-600 text-white py-3 px-6 animate-fade-in text-center shadow-lg flex items-center justify-center gap-3">
            <i className="fas fa-info-circle"></i>
            <span className="text-sm font-bold uppercase tracking-wider">{guestMessage}</span>
          </div>
        )}

        {/* Hero Section */}
        <header className="pt-8 pb-16 lg:pb-24 px-6 max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 rounded-full text-xs font-black uppercase tracking-widest border border-brand-100 dark:border-brand-800">
                <i className="fas fa-graduation-cap"></i> GUIDANCE BY THOSE Who've Been There!
              </div>
              <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] text-slate-900 dark:text-white uppercase">
                From Dream To Destination <br />
                <span className="text-brand-600 dark:text-brand-500">Study Abroad with Migonest</span>
              </h1>
              <p className="text-xl text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed font-medium">
                Connect with "Uni Experts" who have lived your dream and use Migonest-powered roadmaps to secure your future.
              </p>
              <div className="flex flex-col gap-6 pt-4">
                <button
                  onClick={onSignup}
                  className="px-10 py-5 bg-brand-600 text-white rounded-2xl text-lg font-black shadow-2xl shadow-brand-500/30 active:scale-95 transition-all hover:bg-brand-700 flex items-center justify-center gap-3 w-full sm:w-fit"
                >
                  Get Started Now <i className="fas fa-arrow-right"></i>
                </button>

                {!isIOSNative && (
                  <div className="flex items-center gap-4 pt-2">
                    <a 
                      href={['https://play.', 'google.com/store/apps/details?id=com.migonest.app'].join('')} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="transition-transform hover:scale-105 active:scale-95"
                    >
                      <img 
                        src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                        alt={['Get it on', 'Google', 'Play'].join(' ')} 
                        className="h-[48px]"
                      />
                    </a>
                    <div className="relative group">
                      <div className="opacity-50 grayscale cursor-not-allowed">
                        <img 
                          src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
                          alt="Download on the App Store" 
                          className="h-[48px]"
                        />
                      </div>
                      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black py-1 px-3 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        iOS APP COMING SOON
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="relative animate-fade-in-up flex justify-center lg:justify-end" style={{ animationDelay: '0.2s' }}>
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-400 rounded-full blur-[80px] opacity-20"></div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-400 rounded-full blur-[80px] opacity-20"></div>
              <img
                src="https://res.cloudinary.com/doyakzqtr/image/upload/v1766228933/Migonest_Illustration-01_ympe98.jpg"
                className="w-full max-w-xl relative z-10 drop-shadow-2xl rounded-3xl"
                alt="Male student studying abroad illustration"
              />
              {/* Floating Trust Card */}
              {isIOSNative === false && (
                <div className="absolute -bottom-6 lg:bottom-10 left-0 lg:-left-12 bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 z-20 max-w-[260px] animate-wiggle">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center overflow-hidden">
                      <img src="https://img.freepik.com/free-vector/safety-security-concept-illustration_114360-1413.jpg" className="w-full h-full object-contain" alt="Security Lock Illustration" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-white">Escrow Secured</p>
                      <p className="text-[9px] text-green-600 font-bold uppercase tracking-widest">Safe Payments</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Payments are only released upon your final milestone approval.</p>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* How It Works Section */}
        <section className="py-16 lg:py-24 px-6 bg-slate-50 dark:bg-slate-800/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-7 space-y-4">
              <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Your path to admission, simplified.</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">Migonest provides a structured environment where every document, payment, and milestone is tracked for your success.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureItem
                icon={<i className="fas fa-university text-3xl"></i>}
                title="University Selection"
                desc="Find the right university for you."
              />
              <FeatureItem
                icon={<i className="fas fa-file-alt text-3xl"></i>}
                title="Admission & SOP Support"
                desc="Expert help with applications & SOP."
              />
              <FeatureItem
                icon={<i className="fas fa-award text-3xl"></i>}
                title="Scholarship Guidance"
                desc="Find & apply for the best scholarships."
              />
              <FeatureItem
                icon={<i className="fas fa-passport text-3xl"></i>}
                title="Visa Assistance"
                desc="Complete support for student visa."
              />
              <FeatureItem
                icon={<i className="fas fa-home text-3xl"></i>}
                title="Accommodation & Part-Time Jobs"
                desc="Find accommodation & part-time jobs."
              />
            </div>
          </div>
        </section>

        {/* Dual Value Proposition Section */}
        <section className="py-16 lg:py-24 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12">
            {/* Student Ad */}
            <div className="bg-brand-600 rounded-[3rem] p-10 lg:p-14 text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-2xl shadow-brand-500/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-colors"></div>
              <div className="relative z-10 flex flex-col h-full">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 inline-block py-1.5 px-4 bg-white/20 rounded-full self-start">FOR PROSPECTIVE STUDENTS</span>
                <h3 className="text-4xl lg:text-5xl font-black mb-6 leading-tight">Hire your Expert. <br />Secure your future.</h3>
                <p className="text-brand-100 text-lg mb-8 font-medium leading-relaxed">
                  Connect with vetted Uni Experts who have successfully navigated the admission process. Get a personalized 8-stage roadmap, document reviews, and visa interview preparation.
                </p>
                <div className="mt-auto space-y-4">
                  {isIOSNative === false && (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><i className="fas fa-check text-xs"></i></div>
                        <span className="font-bold">Hire Expert with only $59.80</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><i className="fas fa-check text-xs"></i></div>
                        <span className="font-bold">Pay the rest in 4 Monthly Installments</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><i className="fas fa-check text-xs"></i></div>
                        <span className="font-bold">20% Money Back if Visa Rejected</span>
                      </div>
                    </>
                  )}
                  <button onClick={onSignup} className="w-full mt-6 py-5 bg-white text-brand-600 rounded-2xl font-black text-lg shadow-xl hover:bg-brand-50 transition active:scale-95">Start Your Journey</button>
                </div>
              </div>
            </div>

            {/* Expert Ad */}
            <div className="bg-slate-900 rounded-[3rem] p-10 lg:p-14 text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-2xl shadow-slate-900/20">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-500/10 rounded-full -ml-20 -mb-20 blur-3xl group-hover:bg-brand-500/20 transition-colors"></div>
              <div className="relative z-10 flex flex-col h-full">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 inline-block py-1.5 px-4 bg-brand-600 rounded-full self-start">BECOME A UNI EXPERT & EARN</span>
                <h3 className="text-4xl lg:text-5xl font-black mb-6 leading-tight">Once you move abroad, share your journey.</h3>
                <p className="text-slate-400 text-lg mb-8 font-medium leading-relaxed">
                  Earn money by guiding prospective students. Your knowledge brings value and your success brings income. You never lose the fee you paid; it gets back to you through earning!
                </p>
                <div className="mt-auto space-y-4">
                  {isIOSNative === false && (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-600/20 rounded-full flex items-center justify-center text-brand-400"><i className="fas fa-check text-xs"></i></div>
                        <span className="font-bold">Keep 80% of every service fee</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-600/20 rounded-full flex items-center justify-center text-brand-400"><i className="fas fa-check text-xs"></i></div>
                        <span className="font-bold">Automated milestone payouts</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-600/20 rounded-full flex items-center justify-center text-brand-400"><i className="fas fa-check text-xs"></i></div>
                        <span className="font-bold">Earn a $1.99 bonus whenever a user subscribes via your profile chat box.</span>
                      </div>
                    </>
                  )}
                  <button onClick={() => { trackEvent('EXPERT_SIGNUP_CLICK'); onSignup(); }} className="w-full mt-6 py-5 bg-brand-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-brand-700 transition active:scale-95">Become an Expert</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* destinations Section */}
        <section className="py-16 lg:py-24 px-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-5 gap-6">
            <div className="space-y-4 max-w-xl">
              <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-tight">Where can you study with us?</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg">We have experts in every corner of the world ready to guide you to top universities.</p>
            </div>
            <button onClick={onSignup} className="text-brand-600 font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:underline">
              View all destinations <i className="fas fa-arrow-right"></i>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <DestinationCard
              image="https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&q=80&w=800"
              label="GERMANY"
            />
            <DestinationCard
              image="https://images.unsplash.com/photo-1449034446853-66c86144b0ad?auto=format&fit=crop&q=80&w=800"
              label="USA"
            />
            <DestinationCard
              image="https://images.unsplash.com/photo-1517090504586-fde19ea6066f?auto=format&fit=crop&q=80&w=800"
              label="CANADA"
            />
            <DestinationCard
              image="https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&q=80&w=800"
              label="AUSTRALIA"
            />
          </div>
        </section>

        {/* Security & Trust - New Section */}
        <section className="py-16 lg:py-24 px-6 bg-[#021B33] text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10">
            <div className="space-y-12">
              <h2 className="text-4xl lg:text-5xl font-black leading-tight">Your trust is our <br /><span className="text-blue-400">top priority.</span></h2>
              <div className="space-y-8">
                {isIOSNative === false && (
                  <>
                    <div className="flex gap-6 items-start">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                        <i className="fas fa-lock-open text-2xl text-blue-400"></i>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">Platform Escrow System</h4>
                        <p className="text-slate-400 leading-relaxed">Your service fee is securely held by Migonest. 40% is released to your wallet once the student makes the payment, and the remaining 40% is released after the visa is granted.</p>
                      </div>
                    </div>
                    <div className="flex gap-6 items-start">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                        <i className="fas fa-hand-holding-dollar text-2xl text-green-400"></i>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold mb-2">20% Refund Guarantee</h4>
                        <p className="text-slate-400 leading-relaxed">If your visa application gets denied, we automatically refund 20% of the service fee back to your wallet. No questions asked.</p>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex gap-6 items-start">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                    <i className="fas fa-clipboard-check text-2xl text-purple-400"></i>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Verified Expert Docs</h4>
                    <p className="text-slate-400 leading-relaxed">Every Uni Expert must upload their ID and academic credentials. We verify them before they can assist any student.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-[3rem] shadow-2xl">
              <h3 className="text-2xl font-black mb-8 text-center">Admission Success Board</h3>
              <div className="space-y-6">
                {[
                  { name: 'Rahul G.', destination: 'Germany', status: 'Visa Granted', time: '2h ago' },
                  { name: 'Kenji S.', destination: 'USA', status: 'Visa Granted', time: '1d ago' },
                  { name: 'Marcus L.', destination: 'Canada', status: 'Admitted (UofT)', time: '5h ago' },
                  { name: 'Alex M.', destination: 'Australia', status: 'Interview Done', time: '2d ago' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition cursor-default">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">{item.name[0]}</div>
                      <div>
                        <p className="font-bold text-sm">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.destination}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-green-400 uppercase tracking-widest">{item.status}</p>
                      <p className="text-[9px] text-slate-500">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section - Hidden on iOS */}
        {isIOSNative === false && (
          <section className="py-11 px-6 bg-slate-50/50 dark:bg-slate-800/10">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-7 space-y-4">
                <div className="inline-block px-4 py-1.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">Transparent Pricing</div>
                <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white">Choose your level of support.</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed">Whether you need specific advice or a complete admission partner, we have the right plan for you.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
                <PricingCard
                  type="STUDENT_PLAN"
                  title="Premium Access"
                  price="9.99"
                  period="month"
                  features={[
                    "Unlimited direct messaging with all experts",
                    "Personalized profile recommendations",
                    "Digital Document Locker for applications",
                    "Advanced network discovery filters",
                    "Community Post sharing & interactions"
                  ]}
                  buttonText="Get Unlimited Chat"
                  onClick={onSignup}
                />
                <PricingCard
                  type="EXPERT_SERVICE"
                  title="Hire Expert"
                  price="59.80"
                  period="mo"
                  features={[
                    "Pay the rest in 4 monthly installments",
                    "End-to-end 1-on-1 expert mentorship",
                    "8-Stage admission & visa roadmap",
                    "20% Money back if Visa rejected",
                    "Secure payments & hassle-free process"
                  ]}
                  highlight
                  buttonText="Join Migonest"
                  onClick={onSignup}
                />
              </div>
            </div>
          </section>
        )}

        {/* Expert Section */}
        <section className="py-16 lg:py-24 px-6 max-w-7xl mx-auto mb-7">
          <div className="bg-brand-50/50 dark:bg-brand-900/10 rounded-[4rem] p-12 lg:p-24 flex flex-col lg:flex-row items-center gap-16 overflow-hidden border border-brand-50 dark:border-brand-900/30">
            <div className="flex-1 space-y-10 relative z-10 text-center lg:text-left">
              <h2 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white leading-tight uppercase">
                Become a Uni Expert <br />
                {isIOSNative === false ? (
                  <span className="text-brand-600 dark:text-brand-400">& Earn.</span>
                ) : (
                  <span className="text-brand-600 dark:text-brand-400">& Guide.</span>
                )}
              </h2>
              <div className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-medium space-y-4">
                <p>Once you move abroad, share your journey and guide prospective students.</p>
                <ul className="space-y-2 text-base text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2"><i className="fas fa-check-circle text-brand-500 mt-1"></i> Earn money by guiding students with their study abroad journey.</li>
                  <li className="flex items-start gap-2"><i className="fas fa-check-circle text-brand-500 mt-1"></i> Earn a <strong className="text-brand-600 dark:text-brand-400 font-black">$1.99 bonus</strong> whenever a user subscribes via your profile chat box.</li>
                  <li className="flex items-start gap-2"><i className="fas fa-check-circle text-brand-500 mt-1"></i> Your knowledge brings value. Your success brings income.</li>
                </ul>
                {isIOSNative === false && (
                  <div className="p-5 bg-brand-50 dark:bg-brand-900/20 rounded-2xl mt-6 border border-brand-100 dark:border-brand-800">
                    <p className="font-black text-brand-700 dark:text-brand-300 flex items-center gap-2 mb-1">
                      <i className="fas fa-coins"></i> You never lose the fee you paid.
                    </p>
                    <p className="text-sm">It gets back to you through earning that can help cover your living and educational expenses.</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                <button onClick={() => { trackEvent('EXPERT_SIGNUP_CLICK'); onSignup(); }} className="px-10 py-5 bg-brand-600 text-white rounded-2xl font-black shadow-2xl hover:bg-brand-700 transition active:scale-95 flex items-center justify-center gap-2">Become a Uni Expert <i className="fas fa-arrow-right"></i></button>
              </div>
            </div>
            <div className="relative shrink-0 w-full max-w-md animate-fade-in-up">
              <div className="absolute inset-0 bg-brand-500 rounded-full blur-[100px] opacity-10"></div>
              <img
                src="https://res.cloudinary.com/doyakzqtr/image/upload/v1766228933/Migonest_Illustration-02_mjsp63.png"
                className="w-full relative z-10 rounded-[2.5rem] shadow-2xl"
                alt="Successful male expert mentor illustration"
              />
            </div>
          </div>
        </section>



        {/* Footer Trust Banners */}
        <section className="bg-brand-700 text-white py-12">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/20">
            <div className="pt-8 md:pt-0 px-4">
              <i className="fas fa-users text-4xl mb-4 text-brand-300"></i>
              <h4 className="text-lg font-black uppercase tracking-wider mb-2">Real Students. Real Experience.</h4>
              <p className="text-brand-100">Learn from those who have done it.</p>
            </div>
            <div className="pt-8 md:pt-0 px-4">
              <i className="fas fa-shield-alt text-4xl mb-4 text-brand-300"></i>
              <h4 className="text-lg font-black uppercase tracking-wider mb-2">Trusted Guidance. Proven Success.</h4>
              <p className="text-brand-100">From application to arrival and beyond.</p>
            </div>
            <div className="pt-8 md:pt-0 px-4">
              <i className="fas fa-globe text-4xl mb-4 text-brand-300"></i>
              <h4 className="text-lg font-black uppercase tracking-wider mb-2">Global Community.</h4>
              <p className="text-brand-100">Join a network of students supporting students.</p>
            </div>
          </div>
          <div className="text-center mt-12 text-2xl font-black italic text-brand-200 font-serif">
            "Your Journey. Our Experience. Your Success."
          </div>
        </section>

        {/* Footer */}
        <footer className="py-7 bg-[#021B33] text-white text-center">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-12 text-left mb-7 border-b border-white/5 pb-7">
              <div className="col-span-2 space-y-6">
                <div 
                  className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform" 
                  onClick={() => {
                    const main = document.querySelector('main');
                    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <img src="/assets/Migonest_ Logo_Icon.png?v=5" alt="Migonest" className="h-8 w-auto object-contain dark:bg-slate-100 dark:rounded-lg dark:p-1 sm:hidden" />
                  <img src="/assets/Migonest-Primary-Logo.png" alt="Migonest" className="h-8 w-auto object-contain dark:brightness-110 hidden sm:block" />
                </div>
                <p className="text-slate-400 leading-relaxed max-w-sm font-medium italic">Building the world's most trusted ecosystem for international student mobility.</p>
              </div>
              <div className="space-y-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-brand-400">Links</h4>
                <ul className="space-y-4 text-slate-300 font-medium">
                  <li><button onClick={onShowAboutUs} className="hover:text-brand-400 transition text-left">About Us</button></li>
                  {/* <li><a href="#" onClick={scrollToTop} className="hover:text-brand-400 transition">Success Stories</a></li> */}
                  {/* <li><a href="#" onClick={scrollToTop} className="hover:text-brand-400 transition">Experts Hub</a></li> */}
                  <li><button onClick={onShowHelpCenter} className="hover:text-brand-400 transition text-left">Help Center</button></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-brand-400">Legal</h4>
                <ul className="space-y-4 text-slate-300 font-medium">
                  <li><button onClick={onShowPrivacy} className="hover:text-brand-400 transition text-left">Privacy Policy</button></li>
                  <li><button onClick={onShowTerms} className="hover:text-brand-400 transition text-left">Terms of Service</button></li>
                  <li><button onClick={onShowExpertGuidelines} className="hover:text-brand-400 transition text-left">Expert Guidelines</button></li>
                  <li><button onClick={onShowRefundGuarantee} className="hover:text-brand-400 transition text-left">Refund Guarantee</button></li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-sm text-slate-500 font-bold text-left space-y-1">
                <p>© {currentYear} MigoSky LLC. Migonest is a product of MigoSky LLC.</p>
                <p className="text-[11px] text-slate-500 font-medium">Business Address: 30 N GOULD ST STE 5342, SHERIDAN WY 82801</p>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Country of Operation: USA</p>
              </div>
              <div className="flex gap-6">
                <a href="https://www.facebook.com/profile.php?id=61572250709240" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition text-slate-400 hover:text-white"><i className="fab fa-facebook-f"></i></a>
                <a href="https://www.linkedin.com/company/109435202/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition text-slate-400 hover:text-white"><i className="fab fa-linkedin-in"></i></a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

const FeatureItem = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:-translate-y-2 hover:shadow-2xl group">
    <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-3xl flex items-center justify-center mb-8 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
      {icon}
    </div>
    <h3 className="text-2xl font-black mb-4 text-slate-900 dark:text-white">{title}</h3>
    <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{desc}</p>
  </div>
);

const DestinationCard = ({ image, label }: { image: string, label: string }) => (
  <div className="group relative h-72 rounded-[2.5rem] overflow-hidden cursor-pointer shadow-xl hover:shadow-brand-500/20 transition-all duration-500 border border-slate-100 dark:border-slate-800">
    <img src={image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={label} />
    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-black/20 to-transparent flex flex-col justify-end p-8">
      <h3 className="text-2xl font-black text-white tracking-[0.1em] mb-1">{label}</h3>
    </div>
  </div>
);

const PricingCard = ({ title, price, period, features, highlight, buttonText, onClick }: any) => (
  <div className={`p-10 rounded-[3rem] shadow-2xl transition-all hover:scale-[1.02] duration-300 flex flex-col ${highlight
    ? 'bg-brand-600 text-white border-4 border-brand-400/30'
    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700'
    }`}>
    {highlight && (
      <span className="bg-brand-400 text-brand-600 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full self-start mb-6">Most Popular</span>
    )}
    <h3 className="text-2xl font-black mb-2">{title}</h3>
    <div className="flex items-baseline gap-1 mb-8">
      <span className="text-5xl font-black">${price}</span>
      <span className={`${highlight ? 'text-brand-200' : 'text-slate-400'} font-bold uppercase text-xs tracking-widest`}>/ {period}</span>
    </div>
    <ul className="space-y-5 mb-12 flex-1">
      {features.map((f: string, i: number) => (
        <li key={i} className="flex gap-4 items-start">
          <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${highlight ? 'bg-brand-400 text-brand-600' : 'bg-brand-50 text-brand-600'}`}>
            <i className="fas fa-check text-[10px]"></i>
          </div>
          <span className={`text-sm font-medium ${highlight ? 'text-brand-50' : 'text-slate-500 dark:text-slate-400'}`}>{f}</span>
        </li>
      ))}
    </ul>
    <button
      onClick={onClick}
      className={`w-full py-5 rounded-2xl font-black text-lg transition shadow-xl active:scale-95 ${highlight
        ? 'bg-white text-brand-600 hover:bg-brand-50'
        : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
    >
      {buttonText}
    </button>
  </div>
);