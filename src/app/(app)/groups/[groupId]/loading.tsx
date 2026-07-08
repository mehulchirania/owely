export default function GroupDetailLoading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/10"></div>
          <div className="h-6 w-32 rounded-full bg-white/10"></div>
        </div>
        <div className="h-8 w-8 rounded-full bg-white/10"></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/6 pb-3">
        <div className="h-4 w-20 rounded-full bg-white/10"></div>
        <div className="h-4 w-28 rounded-full bg-white/10"></div>
        <div className="h-4 w-16 rounded-full bg-white/10"></div>
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-6 mt-4">
        {[1, 2].map((group) => (
          <div key={group}>
            {/* Date header */}
            <div className="h-3 w-20 rounded-full bg-white/10 mb-3"></div>
            
            <ul className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <li key={i} className="flex gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-white/10"></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="h-4 w-32 rounded-full bg-white/10"></div>
                      <div className="h-4 w-16 rounded-full bg-white/10"></div>
                    </div>
                    <div className="h-3 w-24 rounded-full bg-white/10 mb-2"></div>
                    <div className="h-6 w-20 rounded-[8px] bg-white/10"></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
