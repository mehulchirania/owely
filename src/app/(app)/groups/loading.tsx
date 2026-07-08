export default function GroupsLoading() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-24 rounded-full bg-white/10"></div>
        <div className="h-8 w-8 rounded-full bg-white/10"></div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-hidden pb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-white/10"></div>
        ))}
      </div>

      {/* List */}
      <ul className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="flex items-center gap-3 rounded-2xl border border-white/6 bg-card p-3">
            {/* Avatar stack */}
            <div className="relative flex w-[60px] shrink-0">
              <div className="absolute left-0 h-10 w-10 rounded-full bg-white/10 border-2 border-card z-10"></div>
              <div className="absolute left-5 h-10 w-10 rounded-full bg-white/10 border-2 border-card"></div>
            </div>
            
            {/* Details */}
            <div className="min-w-0 flex-1 ml-4">
              <div className="mb-1.5 h-4 w-32 rounded-full bg-white/10"></div>
              <div className="h-3 w-20 rounded-full bg-white/10"></div>
            </div>
            
            {/* Net */}
            <div className="shrink-0 flex flex-col items-end">
              <div className="mb-1 h-3 w-10 rounded-full bg-white/10"></div>
              <div className="h-4 w-16 rounded-full bg-white/10"></div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
