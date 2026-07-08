export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse max-w-md mx-auto">
      <div className="h-6 w-24 rounded-full bg-white/10"></div>
      
      {/* Profile Section */}
      <div className="rounded-2xl border border-white/6 bg-card p-4 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/10"></div>
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-4 w-32 rounded-full bg-white/10"></div>
            <div className="h-3 w-24 rounded-full bg-white/10"></div>
          </div>
        </div>
        <div className="h-10 w-full rounded-xl bg-white/10"></div>
      </div>

      {/* Plan Section */}
      <div className="rounded-2xl border border-white/6 bg-card p-4">
        <div className="h-4 w-20 rounded-full bg-white/10 mb-3"></div>
        <div className="h-3 w-full rounded-full bg-white/10 mb-2"></div>
        <div className="h-3 w-4/5 rounded-full bg-white/10"></div>
      </div>

      {/* Currency Section */}
      <div className="rounded-2xl border border-white/6 bg-card p-4">
        <div className="h-4 w-28 rounded-full bg-white/10 mb-3"></div>
        <div className="h-12 w-full rounded-xl bg-white/10"></div>
      </div>

      {/* Logout */}
      <div className="h-12 w-full rounded-xl bg-white/10 mt-4"></div>
    </div>
  );
}
