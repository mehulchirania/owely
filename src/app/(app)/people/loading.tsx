export default function PeopleLoading() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-20 rounded-full bg-white/10"></div>
        <div className="h-8 w-28 rounded-full bg-white/10"></div>
      </div>

      {/* Filter chips / tabs */}
      <div className="flex gap-2 pb-1 border-b border-white/6 mb-2">
        <div className="h-8 w-20 rounded-full bg-white/10"></div>
        <div className="h-8 w-16 rounded-full bg-white/10"></div>
      </div>

      {/* List */}
      <ul className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <li key={i} className="flex items-center gap-[10px] rounded-[14px] border border-white/6 bg-card px-[13px] py-[11px]">
            {/* Avatar */}
            <div className="h-9 w-9 shrink-0 rounded-full bg-white/10"></div>
            
            {/* Details */}
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 h-3 w-28 rounded-full bg-white/10"></div>
              <div className="h-2 w-24 rounded-full bg-white/10"></div>
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
