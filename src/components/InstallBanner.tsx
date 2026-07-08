"use client";

import { useInstallPrompt } from "./InstallPromptProvider";

export function InstallBanner() {
  const { isInstallable, promptInstall, dismissPrompt } = useInstallPrompt();

  if (!isInstallable) return null;

  return (
    <div className="flex flex-col rounded-[22px] border border-accent/20 bg-accent/10 px-5 py-4 shadow-sm animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-[14px] font-bold text-accent">Install Owely App</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-dim">
            Add Owely to your home screen for a faster, app-like experience.
          </p>
        </div>
        <button
          onClick={dismissPrompt}
          className="ml-4 flex h-8 w-8 items-center justify-center rounded-full text-dim transition-colors hover:bg-white/10 hover:text-hi"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <button
        onClick={promptInstall}
        className="mt-4 flex h-11 items-center justify-center rounded-xl bg-accent text-[13.5px] font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
      >
        Add to Home Screen
      </button>
    </div>
  );
}
