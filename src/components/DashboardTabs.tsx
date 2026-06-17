"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface TabOption {
  id: string;
  label: string;
}

interface DashboardTabsProps {
  tabs: readonly TabOption[];
  activeTab: string;
}

export function DashboardTabs({ tabs, activeTab }: DashboardTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function selectTab(tabId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="-mx-4 overflow-x-auto border-b border-white/6 px-4 pb-px">
      <nav className="flex min-w-max gap-5 sm:gap-6" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={`relative pb-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                isActive ? "text-hi" : "text-dim hover:text-strong"
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
