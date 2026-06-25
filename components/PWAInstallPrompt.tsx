import React, { useState, useEffect } from 'react';

export const PWAInstallPrompt: React.FC = () => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        console.log('PWAInstallPrompt: Initializing...');

        // Check if iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        // Check if already installed (Running in standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        console.log('PWAInstallPrompt Status:', { isIOSDevice, isStandalone });

        if (isStandalone) {
            console.log('PWAInstallPrompt: App is already in standalone mode.');
            return;
        }

        const handler = (e: Event) => {
            console.log('PWAInstallPrompt: beforeinstallprompt event captured');
            e.preventDefault();
            setInstallPrompt(e);

            // Show if not dismissed persistently
            const isDismissed = localStorage.getItem('pwa-prompt-dismissed-v2');
            if (!isDismissed) {
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // For iOS or browsers that don't fire beforeinstallprompt
        if (isIOSDevice && !isStandalone) {
            const isDismissed = localStorage.getItem('pwa-prompt-dismissed-v2');
            if (!isDismissed) {
                console.log('PWAInstallPrompt: Showing iOS specific guide');
                const timer = setTimeout(() => setIsVisible(true), 2000);
                return () => clearTimeout(timer);
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!installPrompt) {
            console.warn('PWAInstallPrompt: No deferred prompt available on Android');
            return;
        }

        setIsVisible(false);
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        console.log(`PWAInstallPrompt: User outcome: ${outcome}`);
        setInstallPrompt(null);
        // If they chose to install, we also treat it as a dismissal for the browser session
        localStorage.setItem('pwa-prompt-dismissed-v2', 'true');
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('PWAInstallPrompt: User dismissed prompt (hidden permanently)');
        setIsVisible(false);
        // Per user request "Show the popup just once", we use localStorage now
        localStorage.setItem('pwa-prompt-dismissed-v2', 'true');
    };

    if (!isVisible) return null;

    return (
        <div
            className="fixed bottom-24 lg:bottom-8 left-4 right-4 lg:left-auto lg:right-8 lg:w-96 z-[70] animate-fade-in-up"
            style={{ touchAction: 'manipulation' }}
        >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-brand-100 dark:border-slate-700 p-5 overflow-hidden relative">
                {/* Background Accent */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/20 flex-shrink-0">
                        M
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">Install Migonest App</h3>
                            <button
                                onClick={handleDismiss}
                                className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-transparent border-none outline-none cursor-pointer"
                                aria-label="Close"
                            >
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed pr-2">
                            {isIOS
                                ? "Tap the share button and select 'Add to Home Screen' to install."
                                : "Get the app for a faster, better experience with offline access."}
                        </p>

                        {!isIOS ? (
                            <button
                                onClick={handleInstallClick}
                                className="mt-4 w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-md shadow-brand-500/20 active:scale-95 cursor-pointer"
                            >
                                Install Now
                            </button>
                        ) : (
                            <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-brand-50 dark:bg-slate-700/50 border border-brand-100 dark:border-slate-600">
                                <i className="fas fa-share text-brand-600 text-base"></i>
                                <span className="text-[11px] font-bold text-brand-700 dark:text-brand-400 uppercase tracking-widest leading-snug">
                                    TAP SHARE ICON IN TOP BAR
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
