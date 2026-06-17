import type { RelationshipCategoryScope } from "@/types";

export interface PredefinedRelationshipCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  appliesTo: RelationshipCategoryScope;
}

export const PREDEFINED_RELATIONSHIP_CATEGORIES = [
  { id: "home", name: "Home", color: "mint", icon: "home", appliesTo: "both" },
  { id: "trip", name: "Trip", color: "accent2", icon: "palm", appliesTo: "group" },
  { id: "food", name: "Food", color: "orange", icon: "utensils", appliesTo: "both" },
  { id: "rent", name: "Rent", color: "accent", icon: "building", appliesTo: "both" },
  { id: "utilities", name: "Utilities", color: "yellow", icon: "bolt", appliesTo: "both" },
  { id: "office", name: "Office", color: "cyan", icon: "briefcase", appliesTo: "both" },
  { id: "couple", name: "Couple", color: "pink", icon: "heart", appliesTo: "direct" },
  { id: "friends", name: "Friends", color: "accent2", icon: "users", appliesTo: "both" },
  { id: "family", name: "Family", color: "mint", icon: "family", appliesTo: "both" },
  { id: "flatmates", name: "Flatmates", color: "coral", icon: "key", appliesTo: "both" },
  { id: "other", name: "Other", color: "muted", icon: "tag", appliesTo: "both" },
] as const satisfies readonly PredefinedRelationshipCategory[];

export function predefinedRelationshipCategory(
  id: string,
): PredefinedRelationshipCategory | undefined {
  return PREDEFINED_RELATIONSHIP_CATEGORIES.find((category) => category.id === id);
}

export function directPairKey(a: string, b: string): string {
  return [a, b].sort().join("__");
}
