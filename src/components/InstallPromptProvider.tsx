"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// The BeforeInstallPromptEvent is not natively typed in standard TS yet.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPromptContextType {
  isInstallable: boolean;
  promptInstall: () => void;
  hasDismissed: boolean;
  dismissPrompt: () => void;
}

const InstallPromptContext = createContext<InstallPromptContextType>({
  isInstallable: false,
  promptInstall: () => {},
  hasDismissed: true,
  dismissPrompt: () => {},
});

export function InstallPromptProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hasDismissed, setHasDismissed] = useState(true);
  const [sessionCount, setSessionCount] = useState(0);

  useEffect(() => {
    // Session tracking for heuristic (after ~2 sessions)
    const count = parseInt(sessionStorage.getItem("owely_session_started") ? localStorage.getItem("owely_session_count") || "0" : (parseInt(localStorage.getItem("owely_session_count") || "0", 10) + 1).toString(), 10);
    
    if (!sessionStorage.getItem("owely_session_started")) {
      localStorage.setItem("owely_session_count", count.toString());
      sessionStorage.setItem("owely_session_started", "true");
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionCount(count);

    const dismissed = localStorage.getItem("owely_install_dismissed") === "true";
    setHasDismissed(dismissed);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const dismissPrompt = () => {
    localStorage.setItem("owely_install_dismissed", "true");
    setHasDismissed(true);
    setDeferredPrompt(null);
  };

  // Only consider installable if they haven't dismissed and they've visited at least twice
  const isInstallable = !!deferredPrompt && !hasDismissed && sessionCount >= 2;

  return (
    <InstallPromptContext.Provider value={{ isInstallable, promptInstall, hasDismissed, dismissPrompt }}>
      {children}
    </InstallPromptContext.Provider>
  );
}

export function useInstallPrompt() {
  return useContext(InstallPromptContext);
}
