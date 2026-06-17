import { getAdminDb } from "@/lib/firebase/admin";
import { Collections } from "@/lib/firebase/collections";
import { isAdminAuthenticated, logoutAdmin } from "@/actions/admin";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminUserRow } from "@/components/AdminUserRow";

export const metadata = {
  title: "Admin Panel — Owely",
};

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminLoginForm />;
  }

  const db = getAdminDb();

  // Fetch all users, newest first to keep the most recent in case of duplicates
  const usersSnap = await db.collection(Collections.users).orderBy("createdAt", "desc").get();
  
  const allUsersMap = new Map();
  usersSnap.docs.forEach((doc) => {
    const data = doc.data();
    const phone = data.phone || doc.id; // fallback to ID if no phone
    if (!allUsersMap.has(phone)) {
      allUsersMap.set(phone, {
        uid: doc.id,
        displayName: data.displayName || "Owely user",
        phone: data.phone || null,
        tier: (data.tier as "free" | "paid") || "free",
      });
    }
  });
  const allUsers = Array.from(allUsersMap.values());

  const totalUsers = allUsers.length;
  const freeUsers = allUsers.filter((u) => u.tier === "free").length;
  const paidUsers = allUsers.filter((u) => u.tier === "paid").length;

  const total = totalUsers || 1;
  const pctFree = totalUsers ? Math.round((freeUsers / totalUsers) * 100) : 0;
  const pctPaid = totalUsers ? Math.round((paidUsers / totalUsers) * 100) : 0;

  // Donut chart variables
  const circ = 2 * Math.PI * 50; // ~314.16
  const freeStroke = (freeUsers / total) * circ;
  const paidStroke = (paidUsers / total) * circ;

  async function handleLogout() {
    "use server";
    await logoutAdmin();
  }

  return (
    <div className="min-h-screen bg-ink text-hi px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl flex flex-col gap-8">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/6 pb-5">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-hi flex items-center gap-2">
              <span>🦉</span> Admin Dashboard
            </h1>
            <p className="text-sm text-dim mt-0.5">Manage user accounts and tiers.</p>
          </div>
          <form action={handleLogout}>
            <button
              type="submit"
              className="rounded-lg border border-white/10 bg-card px-4 py-2 text-sm font-semibold text-strong transition-colors hover:bg-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Sign out
            </button>
          </form>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-start">
          
          {/* Sidebar / Stats Panel */}
          <section className="flex flex-col gap-6">
            <h2 className="font-display text-lg font-bold text-hi">Overview</h2>
            
            {/* Stats Cards */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-white/6 bg-card p-5">
                <span className="text-xs text-muted font-medium uppercase tracking-[0.08em]">Total Users</span>
                <div className="mt-1 font-display text-3xl font-bold text-hi">{totalUsers}</div>
              </div>

              {/* Donut Chart Card */}
              <div className="rounded-2xl border border-white/6 bg-card p-5 flex flex-col items-center gap-5">
                <span className="text-xs text-muted font-medium uppercase tracking-[0.08em] self-start">Tier Distribution</span>
                
                {/* SVG Donut Chart */}
                <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="transparent"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="12"
                    />
                    {totalUsers > 0 && (
                      <>
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="transparent"
                          stroke="#10b981" // mint
                          strokeWidth="12"
                          strokeDasharray={`${freeStroke} ${circ}`}
                          strokeDashoffset={0}
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="transparent"
                          stroke="#8b5cf6" // accent/purple
                          strokeWidth="12"
                          strokeDasharray={`${paidStroke} ${circ}`}
                          strokeDashoffset={-freeStroke}
                        />
                      </>
                    )}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="font-display text-2xl font-bold text-hi">{totalUsers}</span>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-faint">Users</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="w-full flex flex-col gap-2 border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-strong">
                      <span className="w-2.5 h-2.5 rounded-full bg-mint" />
                      <span>Free</span>
                    </span>
                    <span className="font-semibold text-hi">
                      {freeUsers} ({pctFree}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-strong">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />
                      <span>Paid</span>
                    </span>
                    <span className="font-semibold text-hi">
                      {paidUsers} ({pctPaid}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Users List Panel */}
          <section className="flex flex-col gap-6">
            <h2 className="font-display text-lg font-bold text-hi">Users Database</h2>
            <div className="overflow-hidden rounded-2xl border border-white/6 bg-card shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/6 bg-white/2">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-dim">Name</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-dim">Phone</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-dim">Tier</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-dim">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-dim">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      allUsers.map((user) => (
                        <AdminUserRow key={user.uid} user={user} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
