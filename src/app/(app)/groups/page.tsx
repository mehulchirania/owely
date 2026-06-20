import type { Metadata } from "next";
import { requireSession } from "@/features/auth/session";
import { fetchStandardGroups } from "@/features/groups/queries";
import { fetchRelationshipCategories } from "@/features/groups/category-queries";
import { CreateGroupForm } from "@/components/CreateGroupForm";
import { FilteredGroupsList } from "@/components/FilteredGroupsList";

export const metadata: Metadata = { title: "Groups — Owely" };

export default async function GroupsPage() {
  const user = await requireSession();

  const [groups, customCategories] = await Promise.all([
    fetchStandardGroups(user.uid),
    fetchRelationshipCategories(user.uid),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[22px] font-bold tracking-tight text-hi">
          Groups
        </h1>
        <CreateGroupForm />
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-white/10 px-6 py-12 text-center">
          <span className="text-3xl" role="img" aria-label="empty">
            🪹
          </span>
          <p className="font-medium text-strong">No groups yet</p>
          <p className="text-[12.5px] text-dim">
            Create a group for your trip, flat, or crew — then add an expense.
          </p>
          <div className="mt-2">
            <CreateGroupForm />
          </div>
        </div>
      ) : (
        <FilteredGroupsList
          groups={groups}
          userId={user.uid}
          customCategories={customCategories}
        />
      )}
    </div>
  );
}
