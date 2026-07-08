"use client";

import { useMemo, useState } from "react";
import { formatPaise } from "@/lib/money";
import { categoryStyle } from "@/lib/categories";
import type { ExpenseCategory } from "@/types";
import type { MonthlyInsight } from "@/features/insights/queries";

interface Props {
  insights: MonthlyInsight[];
}

export function InsightsPanel({ insights }: Props) {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);

  const selectedMonth = insights[selectedMonthIndex];

  const chartData = useMemo(() => {
    if (!selectedMonth) return [];
    
    // Sort categories by amount descending
    const entries = Object.entries(selectedMonth.byCategory)
      .map(([cat, amount]) => ({ category: cat as ExpenseCategory, amount }))
      .sort((a, b) => b.amount - a.amount);
    
    const maxAmount = Math.max(...entries.map(e => e.amount), 1);
    
    return entries.map(e => {
      const style = categoryStyle(e.category);
      const rawColor = (() => {
        switch (e.category) {
          case "food": return "var(--color-cat-orange)";
          case "groceries": return "var(--color-mint)";
          case "utilities": return "var(--color-cat-yellow)";
          case "transport": return "var(--color-cat-cyan)";
          case "entertainment": return "var(--color-cat-pink)";
          case "travel": return "var(--color-mint)";
          case "shopping": return "var(--color-cat-pink)";
          case "health": return "var(--color-coral)";
          case "other": return "var(--color-accent2)";
          default: return "var(--color-accent)";
        }
      })();

      return {
        ...e,
        percent: (e.amount / maxAmount) * 100,
        color: rawColor,
        emoji: style.emoji
      };
    });
  }, [selectedMonth]);

  if (insights.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-3xl border border-white/8 bg-surface text-center">
        <p className="text-[14px] font-medium text-dim">No data available for insights.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {insights.map((insight, i) => {
          const isSelected = i === selectedMonthIndex;
          
          // Parse "2026-06" to "Jun 2026"
          const [year, month] = insight.month.split("-");
          const dateStr = new Date(parseInt(year, 10), parseInt(month, 10) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
          
          return (
            <button
              key={insight.month}
              onClick={() => setSelectedMonthIndex(i)}
              className={`flex-none rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${isSelected ? "bg-accent text-white" : "bg-card text-dim hover:bg-elevated hover:text-hi"}`}
            >
              {dateStr}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-5 rounded-3xl border border-white/8 bg-card p-5 shadow-sm">
        <div className="flex flex-col">
          <p className="text-[13px] font-medium text-dim uppercase tracking-wider">Total Spent</p>
          <p className="font-display text-3xl font-bold tracking-tight text-hi mt-1">
            {formatPaise(selectedMonth.total)}
          </p>
        </div>

        <div className="flex flex-col gap-3 mt-2">
          {chartData.map((item) => (
            <div key={item.category} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-end text-[13px]">
                <span className="font-medium text-hi flex items-center gap-1.5">
                  <span className="text-[15px]">{item.emoji}</span>
                  <span className="capitalize">{item.category}</span>
                </span>
                <span className="font-semibold text-strong">{formatPaise(item.amount)}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface">
                <div 
                  className="h-full rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${item.percent}%`, backgroundColor: item.color }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
