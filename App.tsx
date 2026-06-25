import React from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { useAppLogic } from './hooks/useAppLogic';

// Component Imports
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { AuthShell } from './components/AuthShell';
import { ViewRouter } from './components/ViewRouter';
import { AppModals } from './components/AppModals';

export default function App() {
  const logic = useAppLogic();
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    console.log('[App] Auth Slays v1.0.6 | Auth:', logic.isAuthenticated, 'Loading:', logic.isLoading, 'View:', logic.view);
    
    // Android 15 EdgeToEdge pushes the WebView behind the system status bar.
    // Use DOM measurement to safely get the inset, or fallback to 28px.
    if (logic.isNative && !logic.isIOSNative) {
      const div = document.createElement('div');
      div.style.paddingTop = 'env(safe-area-inset-top)';
      document.body.appendChild(div);
      const safeTop = parseInt(window.getComputedStyle(div).paddingTop, 10);
      document.body.removeChild(div);
      
      if (isNaN(safeTop) || safeTop === 0) {
        document.documentElement.style.setProperty('--safe-top', '0px');
      } else {
        document.documentElement.style.setProperty('--safe-top', `${safeTop}px`);
      }
    }
  }, [logic.isAuthenticated, logic.isLoading, logic.view, logic.isNative, logic.isIOSNative]);

  React.useEffect(() => {
    let showSub: any;
    let hideSub: any;

    Keyboard.addListener('keyboardWillShow', (info) => {
      setIsKeyboardVisible(true);
      // Only apply manual offset on iOS; Android handles resizing via OS-level adjustResize
      if (logic.isIOSNative) {
        document.documentElement.style.setProperty('--keyboard-offset', `${info.keyboardHeight}px`);
      } else {
        document.documentElement.style.setProperty('--keyboard-offset', '0px');
      }
    }).then(handle => showSub = handle).catch(() => { /* Web wrapper ignore */ });

    Keyboard.addListener('keyboardWillHide', () => {
      setIsKeyboardVisible(false);
      document.documentElement.style.setProperty('--keyboard-offset', '0px');
      // Delay to let keyboard animate out and avoid panning artifacts
      setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), 50);
    }).then(handle => hideSub = handle).catch(() => { /* Web wrapper ignore */ });

    Keyboard.addListener('keyboardDidHide', () => {
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        // Force layout update to clear any stuck 'empty space'
        const originalHeight = document.body.style.height;
        document.body.style.height = '100.1%';
        setTimeout(() => { document.body.style.height = originalHeight; }, 10);
      }, 150);
    }).then(handle => { /* handle */ }).catch(() => { /* Web wrapper ignore */ });
    
    // Hardened iOS Focus Auto-Scroll
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        // Delay ensures keyboard animation completes and WebView shrinks before scrolling
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };
    
    document.addEventListener('focusin', handleFocus);
    
    return () => {
      if (showSub) showSub.remove();
      if (hideSub) hideSub.remove();
      document.removeEventListener('focusin', handleFocus);
    };
  }, []);

  if (logic.view === 'RESET_PASSWORD' || logic.view === 'SEMINAR_PROMO') {
    return <ViewRouter {...logic} />;
  }

  if (!logic.isAuthenticated || !logic.currentUser || logic.view === 'ONBOARDING' || logic.view === 'ONBOARDING_BRIDGE' || (logic.isLoading && !logic.currentUser)) {
    // Aggressive Double-Lock: ensure modals are physically incapable of being 'open' if authenticated
    const hardenedLogic = {
      ...logic,
      isSignupModalOpen: logic.isAuthenticated ? false : logic.isSignupModalOpen,
      isLoginModalOpen: logic.isAuthenticated ? false : logic.isLoginModalOpen
    };
    
    if (logic.isLoading && !logic.currentUser) console.log('[App] Rendering AuthShell: IS LOADING AND NO USER');
    else if (!logic.isAuthenticated) console.log('[App] Rendering AuthShell: NOT AUTHENTICATED');
    else if (logic.isAuthenticated && !logic.currentUser) console.log('[App] Rendering AuthShell: AUTHENTICATED BUT NO USER (Loading Profile)');
    else if (logic.view === 'ONBOARDING') console.log('[App] Rendering AuthShell: ONBOARDING VIEW');
    
    return <AuthShell {...hardenedLogic} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Left Column: Fixed Width Sidebar */}
      <Sidebar
        currentView={logic.view}
        setView={logic.navigateTo}
        user={logic.currentUser}
        hasActiveAdmission={logic.serviceRequests.some(r => r.status === 'PAID')}
        isIOSNative={logic.isIOSNative}
      />

      {/* Right Column: Flex Content Area */}
      <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-900 border-x border-gray-100 dark:border-slate-800 transition-all duration-300 overflow-hidden">
        {(logic.view !== 'MESSAGES' || !logic.activeChatId) && (
          <Header
            toggleTheme={logic.toggleTheme}
            isDark={logic.isDark}
            currentUser={logic.currentUser}
            setView={logic.navigateTo}
            notifications={logic.notifications}
            posts={logic.posts}
            onMarkAllRead={logic.handleMarkMessagesAsRead}
            onNotificationClick={logic.handleNotificationClick}
            onToggleConnect={logic.handleToggleConnect}
            onViewProfile={logic.handleViewProfile}
            isNotifOpen={logic.isNotifOpen}
            setIsNotifOpen={logic.setIsNotifOpen}
            experts={logic.expertsList}
            students={logic.studentsList}
            onSearch={logic.handleSearch}
            searchQuery={logic.searchQuery}
            unreadMessageCount={logic.unreadMessageCount}
            onMarkNotificationsAsRead={logic.handleMarkNotificationsAsRead}
            isProfileSheetOpen={logic.isProfileSheetOpen}
            setIsProfileSheetOpen={logic.setIsProfileSheetOpen}
            currentView={logic.view}
          />
        )}

        {/* Scrollable Main Body */}
        <main id="main-scroll-container" className={`flex-1 min-h-0 ${logic.view === 'MESSAGES' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'} px-safe`} style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className={`${logic.view === 'MESSAGES' ? 'h-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
            <ViewRouter {...logic} key={logic.view} />
          </div>
        </main>

        {!isKeyboardVisible && (logic.view !== 'MESSAGES' || !logic.activeChatId) && (
          <BottomNav setView={logic.navigateTo} currentView={logic.view} role={logic.currentUser.role} />
        )}
      </div>

      <AppModals {...logic} />
    </div>
  );
}
