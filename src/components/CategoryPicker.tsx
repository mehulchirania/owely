"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { setGroupCategory } from "@/actions/categories";
import { PREDEFINED_RELATIONSHIP_CATEGORIES } from "@/lib/relationship-categories";
import type { RelationshipCategory } from "@/types";

interface Props {
  groupId: string;
  currentCategoryId?: string;
  currentCategoryName?: string;
  scope: "group" | "direct";
  customCategories: RelationshipCategory[];
}

export function CategoryPicker({
  groupId,
  currentCategoryId,
  currentCategoryName,
  scope,
  customCategories,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter categories that apply to this scope
  const filteredPredefined = PREDEFINED_RELATIONSHIP_CATEGORIES.filter(
    (c) => c.appliesTo === "both" || c.appliesTo === scope,
  );
  const filteredCustom = customCategories.filter(
    (c) => c.appliesTo === "both" || c.appliesTo === scope,
  );

  const activeCategory =
    PREDEFINED_RELATIONSHIP_CATEGORIES.find((c) => c.id === currentCategoryId) ||
    customCategories.find((c) => c.id === currentCategoryId);

  function handleSelect(categoryId: string | null) {
    startTransition(async () => {
      await setGroupCategory({ groupId, categoryId });
      setOpen(false);
    });
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-card px-2.5 py-1 text-xs font-semibold text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      >
        <span>🏷️</span>
        <span>{activeCategory ? `${activeCategory.icon} ${activeCategory.name}` : "Tag category"}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`text-dim transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-56 max-h-60 overflow-y-auto rounded-xl border border-white/8 bg-surface p-1 shadow-2xl">
          {/* Clear Category option */}
          {currentCategoryId && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-coral hover:bg-coral/10"
            >
              Clear Category
            </button>
          )}

          {/* Standard system categories */}
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-faint">
            System
          </div>
          {filteredPredefined.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium hover:bg-card ${
                currentCategoryId === c.id ? "bg-accent/15 text-accent font-semibold" : "text-strong"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}

          {/* Custom user categories */}
          {filteredCustom.length > 0 && (
            <>
              <div className="px-2.5 py-1 mt-1 text-[10px] font-bold uppercase tracking-wider text-faint border-t border-white/5 pt-1.5">
                My Custom
              </div>
              {filteredCustom.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium hover:bg-card ${
                    currentCategoryId === c.id ? "bg-accent/15 text-accent font-semibold" : "text-strong"
              }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
