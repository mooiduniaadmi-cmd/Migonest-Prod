
import React from 'react';
import { HomeView } from '../pages/HomeView';
import { ProfileView } from '../pages/ProfileView';
import { AdmissionView } from '../pages/AdmissionView';
import { FindExpertView } from '../pages/FindExpertView';
import { SearchStudentsView } from '../pages/SearchStudentsView';
import { ChatView } from '../pages/ChatView';
import { WalletView } from '../pages/WalletView';
import { SettingsView } from '../pages/SettingsView';
import { ConnectionsView } from '../pages/ConnectionsView';
import { SearchView } from '../pages/SearchView';
import { ExpertReviewsView } from '../pages/ExpertReviewsView';
import { JourneyHistoryView } from '../pages/JourneyHistoryView';
import { ResetPasswordView } from '../pages/ResetPasswordView';
import { TransactionHistoryView } from '../pages/TransactionHistoryView';
import { AdminWithdrawalView } from '../pages/AdminWithdrawalView';
import { PrivacyView } from '../pages/PrivacyView';
import { TermsView } from '../pages/TermsView';
import { PromoBannerView } from '../pages/PromoBannerView';
import { SupportView } from '../pages/SupportView';
import { api } from '../services/api';

export const ViewRouter: React.FC<any> = (props) => {
  const {
    view,
    currentUser,
    posts,
    handleCreatePost,
    navigateTo,
    setPosts,
    handleToggleConnect,
    setSelectedProfile,
    handleViewProfile,
    expertApplications,
    setIsSubModalOpen,
    setExpertApplications,
    serviceRequests,
    setCurrentUser,
    setServiceRequests,
    setActiveChatId,
    activeRequestId,
    setActiveRequestId,
    expertsList,
    studentsList,
    recommendedProfiles,
    activeChatId,
    messages,
    setMessages,
    handleLogout,
    handleEditPost,
    handleDeletePost,
    likedPostIds,
    repostedPostIds,
    selectedProfile,
    handleMarkMessagesAsRead,
    handleUpdateProfile,
    hasMorePosts,
    isFetchingMorePosts,
    handleLoadMorePosts,
    searchExpertsPage,
    searchStudentsPage,
    hasMoreSearch,
    isSearching,
    isFetchingMoreSearch,
    handleLoadMoreSearch,
    hasMoreExperts,
    isFetchingMoreExperts,
    handleLoadMoreExperts,
    hasMoreStudents,
    isFetchingMoreStudents,
    handleLoadMoreStudents,
    hasMoreConnections,
    isFetchingMoreConnections,
    handleLoadMoreConnections,
    connectedProfiles,
    hasMoreReviews,
    isFetchingMoreReviews,
    handleLoadMoreReviews,
    handleSendMessage,
    admissionYear,
    setAdmissionYear,
    transactionsHistory,
    transactionQuery,
    transactionYear,
    hasMoreTransactions,
    isFetchingTransactions,
    isFetchingMoreTransactions,
    handleSearchTransactions,
    handleFilterTransactionsByYear,
    handleLoadMoreTransactions,
    refreshUserProfileInLists,
    setReferralSourceId,
    isSubscribing,
    isResumingPayment,
    recoveryTokens,
    setAuthError,
    clearAuthError,
    handleSubscribe,
    isIOSNative,
    isNative,
    profileTargetSection,
    setProfileTargetSection,
    handleViewMembership,
    handleOpenCustomerCenter
  } = props;


  switch (view) {
    case 'RESET_PASSWORD':
      return <ResetPasswordView 
        onSuccess={() => navigateTo('HOME')} 
        onCancel={() => navigateTo('HOME')} 
        authError={props.authError} 
        isLoading={props.isLoading}
        recoveryTokens={recoveryTokens}
        setAuthError={setAuthError}
        clearAuthError={clearAuthError}
      />;
    case 'HOME':
      return <HomeView user={currentUser} posts={posts} onPost={handleCreatePost} setView={navigateTo} onDeletePost={handleDeletePost} onEditPost={handleEditPost} onToggleConnect={handleToggleConnect} onViewProfile={handleViewProfile} experts={expertsList} students={studentsList} admin={expertsList.find(e => e.role === 'ADMIN')} defaultStudent={studentsList[0]} likedPostIds={likedPostIds || []} repostedPostIds={repostedPostIds || []} recommendedProfiles={recommendedProfiles} hasMorePosts={hasMorePosts} isFetchingMorePosts={isFetchingMorePosts} onLoadMorePosts={handleLoadMorePosts} />;
    case 'ADMIN_WITHDRAWALS':
      return <AdminWithdrawalView admin={currentUser} setView={navigateTo} isIOSNative={isIOSNative} />;
    case 'PROFILE':
      return <ProfileView
        user={selectedProfile || currentUser}
        currentUser={currentUser} // Pass session user for PostCard context
        posts={posts} // Pass global posts
        onPost={handleCreatePost}
        onDeletePost={handleDeletePost}
        onEditPost={handleEditPost}
        onToggleConnect={handleToggleConnect}
        likedPostIds={likedPostIds || []}
        repostedPostIds={repostedPostIds || []}
        expertApplications={expertApplications}
        setView={navigateTo}
        onSubscribe={(force = false) => {
          if (selectedProfile && selectedProfile.id !== currentUser.id) {
            setReferralSourceId(selectedProfile.id);
          }
          handleSubscribe(force);
        }}

        onApplyExpert={async (data) => {
          try {
            const newApp = await api.createExpertApplication({
              studentId: currentUser.id,
              studentName: currentUser.fullName,
              studentAvatarUrl: currentUser.avatarUrl,
              data: data
            });
            setExpertApplications([newApp, ...expertApplications]);
          } catch (err) {
            console.error('Failed to submit application:', err);
            alert('Failed to submit application. Please try again.');
          }
        }}
        serviceRequests={serviceRequests}
        onViewProfile={handleViewProfile}
        onUpdateProfile={handleUpdateProfile}
        onAddCommonDoc={async (doc) => {
          const newDoc = { ...doc, id: `doc-${Date.now()}`, timestamp: Date.now(), uploadedBy: currentUser.id };
          const updatedDocs = [...(currentUser.commonDocuments || []), newDoc];
          setCurrentUser({ ...currentUser, commonDocuments: updatedDocs });
          try {
            await api.updateProfile(currentUser.id, { commonDocuments: updatedDocs });
          } catch (err) {
            console.error('Failed to save document:', err);
          }
        }}
        onDeleteCommonDoc={async (id) => {
          const updatedDocs = (currentUser.commonDocuments || []).filter((d: any) => d.id !== id);
          setCurrentUser({ ...currentUser, commonDocuments: updatedDocs });
          try {
            await api.updateProfile(currentUser.id, { commonDocuments: updatedDocs });
          } catch (err) {
            console.error('Failed to delete document:', err);
          }
        }}
        onEditCommonDoc={async (id, name) => {
          const updatedDocs = (currentUser.commonDocuments || []).map((d: any) => d.id === id ? { ...d, name } : d);
          setCurrentUser({ ...currentUser, commonDocuments: updatedDocs });
          try {
            await api.updateProfile(currentUser.id, { commonDocuments: updatedDocs });
          } catch (err) {
            console.error('Failed to rename document:', err);
          }
        }}
        experts={expertsList}
        students={studentsList}
        isSubscribing={isSubscribing}
        isIOSNative={isIOSNative}
        targetSection={profileTargetSection}
        onClearTargetSection={() => setProfileTargetSection(null)}
        onOpenCustomerCenter={handleOpenCustomerCenter}
      />;
    case 'ADMISSION':
      return (
        <AdmissionView
          user={currentUser}
          serviceRequests={props.admissionJourneys || []}
          activeRequestId={activeRequestId}
          setActiveRequestId={setActiveRequestId}
          experts={expertsList || []}
          students={studentsList || []}
          onMarkMilestone={(rid, notes, file) => props.handleMarkMilestone(rid, notes, file)}
          onRejectMilestone={(rid, message, file) => props.handleRejectMilestone(rid, message, file)}
          onReportVisaRejection={(rid, file) => props.handleReportVisaRejection(rid, file)}
          onExpertVerifyRejection={(rid) => props.handleExpertVerifyRejection(rid)}
          onApproveMilestone={(rid, nextStep) => props.handleApproveMilestone(rid, nextStep)}
          onAddDocument={props.handleAddDocument}
          onEditDocument={props.handleEditDocument}
          onDeleteDocument={props.handleDeleteDocument}
          onOpenChat={(p) => { navigateTo('MESSAGES'); setActiveChatId(p.id); }}
          onSeeMoreHistory={() => navigateTo('HISTORY')}
          onRedirectToDiscover={() => navigateTo(currentUser?.role === 'STUDENT' ? 'FIND' : 'FIND_STUDENTS')}
          onViewProfile={handleViewProfile}
          onPostFeedback={props.handlePostFeedback}
          onLoadMoreAdmission={props.handleLoadMoreAdmission}
          onSearchAdmission={props.handleSearchAdmission}
          hasMoreAdmission={props.hasMoreAdmission}
          isFetchingMoreAdmission={props.isFetchingMoreAdmission}
          admissionSearchQuery={props.admissionSearchQuery}
          admissionYear={admissionYear}
          setAdmissionYear={setAdmissionYear}
          admissionPage={props.admissionPage}
          onResumePayment={props.handleResumePayment}
          onCancelPending={props.handleCancelPendingHire}
          isResumingPayment={isResumingPayment}
          isIOSNative={isIOSNative}
        />

      );
    case 'FIND':
      return (
        <FindExpertView
          experts={expertsList}
          recommended={recommendedProfiles}
          user={currentUser}
          onHire={props.setHiringExpert}
          onChat={(e) => { navigateTo('MESSAGES'); setActiveChatId(e.id); }}
          onToggleConnect={handleToggleConnect}
          onViewProfile={handleViewProfile}
          hasMore={hasMoreExperts}
          isFetchingMore={isFetchingMoreExperts}
          onLoadMore={handleLoadMoreExperts}
          isIOSNative={isIOSNative}
        />
      );
    case 'FIND_STUDENTS':
      return (
        <SearchStudentsView
          students={studentsList}
          recommended={recommendedProfiles}
          user={currentUser}
          onChat={(s) => { navigateTo('MESSAGES'); setActiveChatId(s.id); }}
          onToggleConnect={handleToggleConnect}
          onViewProfile={handleViewProfile}
          hasMore={hasMoreStudents}
          isFetchingMore={isFetchingMoreStudents}
          onLoadMore={handleLoadMoreStudents}
        />
      );
    case 'MESSAGES':
      return <ChatView
        user={currentUser}
        experts={expertsList}
        students={studentsList}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        messages={messages}
        onSendMessage={handleSendMessage}
        isSubscribed={currentUser.isSubscribed}
        serviceRequests={serviceRequests}
        setView={navigateTo}
        onViewProfile={handleViewProfile}
        onMarkMessagesAsRead={handleMarkMessagesAsRead}
        onEditMessage={props.handleEditMessage}
        onDeleteMessage={props.handleDeleteMessage}
        onClearChatHistory={props.handleClearChatHistory}
        setReferralSourceId={setReferralSourceId}
        onSubscribe={(rid) => {
          if (rid) setReferralSourceId(rid);
          setIsSubModalOpen(true);
        }}
        isSubscribing={isSubscribing}
        onViewMembership={handleViewMembership}
        isIOSNative={isIOSNative}
        isNative={isNative}
      />;
    case 'WALLET':
      return <WalletView 
        user={currentUser} 
        onBack={() => navigateTo('PROFILE')} 
        onNavigate={navigateTo} 
        onViewProfile={handleViewProfile} 
        onRefreshProfile={async () => {
          const freshProfile = await api.getSessionProfile(currentUser.id);
          if (freshProfile) setCurrentUser(freshProfile);
        }} 
        paymentResult={props.paymentResult}
        setPaymentResult={props.setPaymentResult}
        setIsResetStripeModalOpen={props.setIsResetStripeModalOpen}
        isIOSNative={isIOSNative}
      />;
    case 'TRANSACTIONS':
      return (
        <TransactionHistoryView
          userId={currentUser.id}
          transactions={transactionsHistory}
          isLoading={isFetchingTransactions}
          isFetchingMore={isFetchingMoreTransactions}
          hasMore={hasMoreTransactions}
          query={transactionQuery}
          year={transactionYear}
          onSearch={handleSearchTransactions}
          onYearChange={handleFilterTransactionsByYear}
          onLoadMore={handleLoadMoreTransactions}
          onProfileClick={handleViewProfile}
          onBack={() => navigateTo('WALLET')}
          isIOSNative={isIOSNative}
        />
      );
    case 'SETTINGS':
      return <SettingsView
        user={currentUser}
        setView={navigateTo}
        onLogout={handleLogout}
        onBack={() => navigateTo('PROFILE')}
      />;
    case 'CONNECTIONS':
      return <ConnectionsView
        user={currentUser}
        experts={expertsList}
        students={studentsList}
        recommended={recommendedProfiles}
        connectedProfiles={connectedProfiles}
        totalCount={props.totalConnectionsCount}
        hasMoreConnections={hasMoreConnections}
        isFetchingMoreConnections={isFetchingMoreConnections}
        onLoadMoreConnections={handleLoadMoreConnections}
        onChat={(p) => { navigateTo('MESSAGES'); setActiveChatId(p.id); }}
        onToggleConnect={handleToggleConnect}
        onViewProfile={handleViewProfile}
        setView={navigateTo}
      />;
    case 'SEARCH':
      return (
        <SearchView
          results={props.searchResults}
          query={props.searchQuery}
          user={currentUser}
          onHire={props.setHiringExpert}
          onChat={(p) => { navigateTo('MESSAGES'); setActiveChatId(p.id); }}
          onToggleConnect={handleToggleConnect}
          onViewProfile={handleViewProfile}
          searchExpertsPage={searchExpertsPage}
          searchStudentsPage={searchStudentsPage}
          hasMoreSearch={hasMoreSearch}
          isSearching={isSearching}
          isFetchingMoreSearch={isFetchingMoreSearch}
          onLoadMoreSearch={handleLoadMoreSearch}
          isIOSNative={isIOSNative}
        />
      );
    case 'EXPERT_REVIEWS':
      if (currentUser.role !== 'ADMIN') {
        navigateTo('HOME');
        return null;
      }
      return <ExpertReviewsView
        applications={expertApplications}
        onBack={() => navigateTo('PROFILE')}
        onReview={async (aid, status) => {
          try {
            await api.updateExpertApplication(aid, status);
            setExpertApplications(prev => prev.map(a => a.id === aid ? { ...a, status } : a));
            if (status === 'APPROVED') {
              const app = expertApplications.find(a => a.id === aid);
              if (app) refreshUserProfileInLists(app.studentId);
            }
          } catch (err) {
            console.error('Failed to update application status:', err);
            alert('Failed to update status.');
          }
        }}
        onViewProfile={handleViewProfile}
        experts={expertsList}
        students={studentsList}
        hasMore={hasMoreReviews}
        isFetchingMore={isFetchingMoreReviews}
        onLoadMore={handleLoadMoreReviews}
      />;
    case 'HISTORY':
      return <JourneyHistoryView user={currentUser} requests={serviceRequests.filter(r => r.status === 'COMPLETED')} onBack={() => navigateTo('ADMISSION')} onViewFullRoadmap={(rid) => { setActiveRequestId(rid); navigateTo('ADMISSION'); }} onViewProfile={setSelectedProfile} experts={expertsList} students={studentsList} />;
    case 'SEMINAR_PROMO':
      return <PromoBannerView onBack={() => navigateTo('HOME')} />;
    case 'SUPPORT':
      return <SupportView onBack={() => navigateTo('HOME')} isIOSNative={isIOSNative} />;
    default:
      return null;
  }
};
