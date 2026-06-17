"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import { PREDEFINED_RELATIONSHIP_CATEGORIES } from "@/lib/relationship-categories";
import type { RelationshipCategory, RelationshipCategoryScope } from "@/types";

interface Props {
  initialCategories: RelationshipCategory[];
}

const COLORS = [
  "accent", "accent2", "mint", "coral", "pink", "cyan", "yellow", "orange", "muted",
] as const;

export function CustomCategoriesManager({ initialCategories }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form states for creating/editing custom categories
  const [name, setName] = useState("");
  const [color, setColor] = useState<typeof COLORS[number]>("accent");
  const [icon, setIcon] = useState("🏷️");
  const [appliesTo, setAppliesTo] = useState<RelationshipCategoryScope>("both");
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;

    startTransition(async () => {
      let res;
      if (editingId) {
        res = await updateCategory({
          categoryId: editingId,
          name: name.trim(),
          color,
          icon: icon.trim(),
          appliesTo,
        });
      } else {
        res = await createCategory({
          name: name.trim(),
          color,
          icon: icon.trim(),
          appliesTo,
        });
      }

      if (!res.ok) {
        setError(res.error);
        return;
      }

      // Reset
      setName("");
      setColor("accent");
      setIcon("🏷️");
      setAppliesTo("both");
      setEditingId(null);
      router.refresh();
    });
  }

  function handleStartEdit(cat: RelationshipCategory) {
    setEditingId(cat.id);
    setName(cat.name);
    setColor(cat.color as any);
    setIcon(cat.icon);
    setAppliesTo(cat.appliesTo);
  }

  function handleDelete(categoryId: string) {
    if (!confirm("Are you sure you want to delete this custom category? All groups/people tagged with it will lose their category tag.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteCategory({ categoryId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/6 bg-surface p-4">
      <div>
        <h2 className="font-display text-lg font-bold text-hi">Relationship Categories</h2>
        <p className="text-xs text-dim">Used to organize your groups and 1:1 direct ledgers.</p>
      </div>

      {/* Add / Edit Form */}
      <form onSubmit={handleSubmit} className="border border-white/6 bg-card rounded-xl p-3 flex flex-col gap-3">
        <h3 className="font-semibold text-hi text-xs uppercase tracking-[0.08em]">
          {editingId ? "Edit Custom Category" : "Create Custom Category"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            required
            placeholder="Category name (e.g. Goa Trip, Flat)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            className="rounded-lg border border-white/8 bg-surface px-3 py-1.5 text-sm text-hi placeholder-dim outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Emoji Icon (e.g. 🌴)"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              disabled={pending}
              className="w-24 rounded-lg border border-white/8 bg-surface px-3 py-1.5 text-center text-sm text-hi outline-none focus:border-accent"
            />
            <select
              value={appliesTo}
              onChange={(e) => setAppliesTo(e.target.value as RelationshipCategoryScope)}
              disabled={pending}
              className="flex-1 rounded-lg border border-white/8 bg-surface px-2 py-1.5 text-sm text-hi outline-none focus:border-accent"
            >
              <option value="both">Groups & People</option>
              <option value="group">Groups Only</option>
              <option value="direct">People Only</option>
            </select>
          </div>
        </div>

        {/* Color picker */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-dim font-medium mr-1">Color:</span>
          {COLORS.map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => setColor(col)}
              disabled={pending}
              className={`w-6 h-6 rounded-full border transition-transform ${
                color === col ? "scale-110 border-white" : "border-transparent"
              }`}
              style={{
                backgroundColor:
                  col === "accent" ? "#8b7bff" :
                  col === "accent2" ? "#45e0c8" :
                  col === "mint" ? "#54e0a0" :
                  col === "coral" ? "#ff7a8a" :
                  col === "pink" ? "#ff6fb5" :
                  col === "cyan" ? "#45d0e0" :
                  col === "yellow" ? "#ffc24b" :
                  col === "orange" ? "#ff8a5b" : "#56536a"
              }}
            />
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setName("");
                setColor("accent");
                setIcon("🏷️");
                setAppliesTo("both");
              }}
              className="rounded-lg border border-white/10 bg-surface px-3.5 py-1.5 text-xs font-semibold text-strong transition-colors hover:bg-elevated"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
          >
            {pending ? "Saving..." : editingId ? "Save Changes" : "Create"}
          </button>
        </div>
        {error && <span className="text-xs text-coral-soft">{error}</span>}
      </form>

      {/* Categories lists */}
      <div className="flex flex-col gap-4">
        {/* Predefined read-only */}
        <div>
          <h4 className="text-xs font-semibold text-dim uppercase tracking-[0.08em] mb-2">Standard Categories (System)</h4>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_RELATIONSHIP_CATEGORIES.map((cat) => (
              <span
                key={cat.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-card px-3 py-1 text-xs text-strong"
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <span className="text-[10px] text-faint uppercase font-semibold">
                  {cat.appliesTo === "both" ? "" : cat.appliesTo === "group" ? "Group" : "1:1"}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Custom editable */}
        <div>
          <h4 className="text-xs font-semibold text-dim uppercase tracking-[0.08em] mb-2">My Custom Categories</h4>
          {initialCategories.length === 0 ? (
            <p className="text-xs text-dim italic">No custom categories created yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {initialCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 rounded-full border border-white/8 bg-card pl-3 pr-1.5 py-1 text-xs text-hi"
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className="text-[9px] text-muted-soft bg-white/5 rounded px-1 capitalize">
                    {cat.appliesTo === "both" ? "All" : cat.appliesTo === "group" ? "Groups" : "1:1s"}
                  </span>
                  <div className="flex gap-1 ml-1 border-l border-white/10 pl-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat)}
                      className="text-[10px] text-accent hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      className="text-[10px] text-coral hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
