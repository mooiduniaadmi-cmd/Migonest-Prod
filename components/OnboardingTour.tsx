
import React from 'react';
import { UserRole } from '../types';
import { Icons } from './Icons';

interface Props {
  view: string;
  role: UserRole;
  onClose: () => void;
}

export const OnboardingTour: React.FC<Props> = ({ view, role, onClose }) => {
  const getTourContent = () => {
    switch (view) {
      case 'HOME':
        if (role === 'STUDENT') return {
          title: "Your Study Dashboard",
          desc: "Welcome to Migonest! Here you can post updates about your journey & see profile suggestions.",
          icon: <Icons.Home />
        };
        if (role === 'EXPERT') return {
          title: "Expert Command Center",
          desc: "Manage your professional presence. Share insights with the student community, track suggested connections, and oversee your active mentorships.",
          icon: <Icons.Home />
        };
        return {
          title: "System Overview",
          desc: "Monitor global platform activity, community engagement, and system health from your admin dashboard.",
          icon: <Icons.Home />
        };

      case 'ADMISSION':
        if (role === 'STUDENT') return {
          title: "The Milestone Roadmap",
          desc: "Once you hire a Uni Expert, a verified 8-stage roadmap will appear here. Track every step from document preparation to your final visa approval.",
          icon: <Icons.Admission />
        };
        if (role === 'EXPERT') return {
          title: "Client Management",
          desc: "Your active admission journeys are tracked here. Upload shared files, mark milestones as complete, and collaborate with your students on their roadmaps.",
          icon: <Icons.Admission />
        };
        return {
          title: "Platform Governance",
          desc: "Audit active admission journeys to ensure quality standards and professional guidance are being met across the platform.",
          icon: <Icons.Admission />
        };

      case 'FIND':
      case 'FIND_STUDENTS':
        if (role === 'STUDENT') return {
          title: "Discover Uni Experts",
          desc: "Search for vetted experts by name or target country. Connect with someone who has actually lived and studied where you want to go.",
          icon: <Icons.Search />
        };
        return {
          title: "Student Discovery",
          desc: "Browse aspiring international students looking for guidance. Use filters to find students matching your expertise countries and academic focus.",
          icon: <Icons.Search />
        };

      case 'MESSAGES':
        return {
          title: "Secure Communication",
          desc: "Chat directly with your connections. Admission partners always have free priority messaging.",
          icon: <Icons.Chat />
        };

      case 'WALLET':
        if (role === 'STUDENT') return {
          title: "Student Protection",
          desc: "Your service fees are held in Escrow and only released as milestones are completed. If your visa is denied, you're protected by our 20% refund policy.",
          icon: <Icons.Money />
        };
        return {
          title: "Financial Center",
          desc: "Track your earnings and milestone releases. Withdraw your funds safely via our Stripe integration once they clear Escrow.",
          icon: <Icons.Money />
        };

      case 'CONNECTIONS':
        return {
          title: "Your Global Network",
          desc: "View everyone you've connected with. Networking is the fastest way to gain insights and find the right mentorship for your study goals.",
          icon: <Icons.User />
        };

      case 'EXPERT_REVIEWS':
        return {
          title: "Applicant Verification",
          desc: "Review pending applications from students who want to become Uni Experts. Verify their documents and credentials before granting status.",
          icon: <i className="fas fa-user-shield"></i>
        };

      default:
        return null;
    }
  };

  const content = getTourContent();
  if (!content) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl border border-brand-100 dark:border-brand-900/50 animate-fade-in-up">
        <div className="w-16 h-16 bg-brand-600 text-white rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6 shadow-xl shadow-brand-500/20">
          {content.icon}
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-3">
          {content.title}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-center text-sm leading-relaxed mb-8">
          {content.desc}
        </p>
        <button 
          onClick={onClose}
          className="w-full py-4 bg-brand-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 transition active:scale-95"
        >
          Got it, let's explore!
        </button>
      </div>
    </div>
  );
};
