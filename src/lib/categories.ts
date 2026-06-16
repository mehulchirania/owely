/**
 * Category presentation map — emoji + a color-forward tint for the tile behind
 * it. Pure (no React, no Firebase) so it can be shared by the expense feed, the
 * add-expense form, and any future surface. Tints reference the design-system
 * category colors (see Owely.dc.html); the `tint` class is a Tailwind arbitrary
 * background using the token color at low opacity.
 */

import type { ExpenseCategory } from "@/types";

interface CategoryStyle {
  emoji: string;
  /** Background tint class for the 40-46px rounded tile. */
  tile: string;
  /** Matching text/accent color class for the emoji-less contexts. */
  text: string;
}

const STYLES: Record<ExpenseCategory, CategoryStyle> = {
  general: { emoji: "🧾", tile: "bg-accent/15", text: "text-accent" },
  food: { emoji: "🍽️", tile: "bg-cat-orange/15", text: "text-cat-orange" },
  groceries: { emoji: "🛒", tile: "bg-mint/15", text: "text-mint" },
  rent: { emoji: "🏠", tile: "bg-accent/15", text: "text-accent" },
  utilities: { emoji: "💡", tile: "bg-cat-yellow/15", text: "text-cat-yellow" },
  transport: { emoji: "🚕", tile: "bg-cat-cyan/15", text: "text-cat-cyan" },
  entertainment: { emoji: "🎉", tile: "bg-cat-pink/15", text: "text-cat-pink" },
  travel: { emoji: "🌴", tile: "bg-mint/15", text: "text-mint" },
  shopping: { emoji: "🛍️", tile: "bg-cat-pink/15", text: "text-cat-pink" },
  health: { emoji: "💊", tile: "bg-coral/15", text: "text-coral" },
  other: { emoji: "✨", tile: "bg-accent2/15", text: "text-accent2" },
};

export function categoryStyle(category: ExpenseCategory): CategoryStyle {
  return STYLES[category] ?? STYLES.general;
}
