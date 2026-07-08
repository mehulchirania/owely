"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/features/auth/actions";

export function DeleteAccountButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (
      !window.confirm(
        "Are you absolutely sure? This will delete your personal data permanently. Your name in shared groups will be anonymized to 'Deleted User'."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await deleteAccount();
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.push("/login");
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="flex h-[38px] items-center justify-center rounded-[10px] border border-coral/20 bg-coral/10 px-4 text-[13px] font-bold text-coral transition-colors hover:bg-coral/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral disabled:opacity-50"
    >
      {isPending ? "Deleting..." : "Delete account"}
    </button>
  );
}
