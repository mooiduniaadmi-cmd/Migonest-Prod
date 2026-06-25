
import React from 'react';
import { ProfileDetailModal } from './ProfileDetailModal';
import { HiringWizardModal } from './HiringWizardModal';
import { SubscriptionModal } from './SubscriptionModal';
import { QuickProfileSheet } from './QuickProfileSheet';
import { PaymentResultModal } from './PaymentResultModal';
import { CancelHireModal } from './CancelHireModal';
import { ResetStripeModal } from './ResetStripeModal';
import { PrivacyModal } from './PrivacyModal';
import { TermsModal } from './TermsModal';

export const AppModals: React.FC<any> = (props) => {
  const { 
    selectedProfile, setSelectedProfile, currentUser, posts, serviceRequests, 
    navigateTo, setActiveChatId, setHiringExpert, handleToggleConnect, 
    handleViewProfile, hiringExpert, handleHiringComplete, isSubModalOpen, 
    setIsSubModalOpen, setCurrentUser, expertsList, studentsList, 
    recommendedProfiles, isProfileSheetOpen, setIsProfileSheetOpen, 
    handleSubscribe, isCancelModalOpen, setIsCancelModalOpen, handleConfirmCancelHire,
    isCancelingAdmission, isSubscribing, isHiring, isIOSNative,
    isPrivacyOpen, setIsPrivacyOpen, isTermsOpen, setIsTermsOpen
  } = props;

  return (
    <>
      {selectedProfile && (
        <ProfileDetailModal
          isOpen={!!selectedProfile} onClose={() => setSelectedProfile(null)} user={selectedProfile} currentUser={currentUser} posts={posts} serviceRequests={serviceRequests}
          onChat={(p) => { setSelectedProfile(null); navigateTo('MESSAGES'); setActiveChatId(p.id); }}
          onHire={(p) => { setHiringExpert(p); setSelectedProfile(null); }}
          onToggleConnect={handleToggleConnect} onViewProfile={handleViewProfile}
          experts={expertsList} students={studentsList}
          isIOSNative={isIOSNative}
          onSubscribe={handleSubscribe}
        />
      )}

      {hiringExpert && isIOSNative === false && (
        <HiringWizardModal 
          expert={hiringExpert} 
          user={currentUser} 
          onClose={() => setHiringExpert(null)} 
          onConfirm={handleHiringComplete} 
          isSubmittingExternal={isHiring}
          isIOSNative={isIOSNative}
        />
      )}

      <SubscriptionModal
        isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} role={currentUser.role}
        onSubscribe={props.handleSubscribe}
        isLoading={props.isSubscribing}
        referrerId={props.referralSourceId}
        isIOSNative={isIOSNative}
      />

      <QuickProfileSheet
        isOpen={isProfileSheetOpen}
        onClose={() => setIsProfileSheetOpen(false)}
        user={currentUser}
        posts={posts}
        setView={navigateTo}
        onToggleConnect={handleToggleConnect}
        onViewProfile={handleViewProfile}
        experts={expertsList}
        students={studentsList}
        recommended={recommendedProfiles}
      />

      {props.paymentResult && (
        <PaymentResultModal
          isOpen={props.paymentResult.isOpen}
          onClose={() => props.setPaymentResult({ ...props.paymentResult, isOpen: false })}
          type={props.paymentResult.type}
          title={props.paymentResult.title}
          message={props.paymentResult.message}
          actionLabel={props.paymentResult.actionLabel}
          onAction={props.paymentResult.onAction}
          isIOSNative={isIOSNative}
        />
      )}

      {isIOSNative === false && (
        <>
          <CancelHireModal
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            onConfirm={handleConfirmCancelHire}
            isLoading={isCancelingAdmission}
          />

          <ResetStripeModal
            isOpen={props.isResetStripeModalOpen}
            onClose={() => props.setIsResetStripeModalOpen(false)}
            onConfirm={props.handleConfirmResetStripe}
            isLoading={props.isResettingStripe}
          />
        </>
      )}

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </>
  );
};
