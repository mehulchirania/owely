"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Props {
  children: React.ReactNode;
}

export function PullToRefresh({ children }: Props) {
  const router = useRouter();
  const [startY, setStartY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 70; // How far to pull before refresh triggers

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow pull to refresh if we are at the very top of the page
    if (window.scrollY > 0 || refreshing) return;
    setStartY(e.touches[0].clientY);
    setPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pulling || refreshing) return;

    const y = e.touches[0].clientY;
    const distance = y - startY;

    // Only pull down
    if (distance > 0) {
      // Add resistance
      const resistedDistance = distance * 0.4;
      setPullDistance(Math.min(resistedDistance, THRESHOLD + 20));
      
      // Prevent default scrolling when pulling down
      if (e.cancelable) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = useCallback(() => {
    if (!pulling || refreshing) return;

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD); // Hold it at threshold while refreshing
      
      // Trigger Next.js refresh
      router.refresh();
      
      // Simulate network wait so the UI doesn't snap back instantly if cached
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, 800);
    } else {
      setPullDistance(0);
    }
    
    setPulling(false);
  }, [pulling, refreshing, pullDistance, router]);

  // Handle cleanup
  useEffect(() => {
    // Optional: add passive=false to a ref element if we need native event blocking
    const el = containerRef.current;
    if (!el) return;

    const touchMovePassive = (e: TouchEvent) => {
      if (pulling && pullDistance > 0 && e.cancelable) {
        e.preventDefault();
      }
    };

    el.addEventListener("touchmove", touchMovePassive, { passive: false });
    return () => el.removeEventListener("touchmove", touchMovePassive);
  }, [pulling, pullDistance]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div 
        className="absolute left-0 right-0 top-0 flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{
          height: pullDistance > 0 ? pullDistance : 0,
          opacity: pullDistance > 20 ? 1 : 0,
        }}
        aria-hidden="true"
      >
        <div 
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-surface shadow-md border border-white/6 ${
            refreshing ? "animate-spin" : ""
          }`}
          style={{
            transform: `rotate(${Math.min(pullDistance * 2, 180)}deg)`,
          }}
        >
          {refreshing ? (
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
               <path d="M21 12a9 9 0 1 1-6.219-8.56" />
             </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {/* Content wrapper */}
      <div 
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
