export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      {/* Header: greeting + avatar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-3 w-20 rounded-full bg-white/10 mb-2"></div>
          <div className="h-6 w-32 rounded-full bg-white/10"></div>
        </div>
        <div className="h-10 w-10 rounded-full bg-white/10"></div>
      </div>

      {/* Net balance card */}
      <div className="rounded-[18px] border border-white/8 bg-surface px-4 py-[14px]">
        <div className="mb-2 h-3 w-24 rounded-full bg-white/10"></div>
        <div className="h-10 w-40 rounded-full bg-white/10"></div>
        <div className="mt-2 h-3 w-32 rounded-full bg-white/10"></div>
      </div>

      {/* Settle up section */}
      <div>
        <div className="mb-[10px] flex items-center justify-between">
          <div className="h-4 w-16 rounded-full bg-white/10"></div>
          <div className="h-3 w-10 rounded-full bg-white/10"></div>
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-[10px] rounded-[14px] border border-white/7 bg-card px-[13px] py-[11px]"
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-white/10"></div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 h-3 w-24 rounded-full bg-white/10"></div>
                <div className="h-2 w-16 rounded-full bg-white/10"></div>
              </div>
              <div className="shrink-0 text-right flex flex-col items-end">
                <div className="mb-1.5 h-3 w-16 rounded-full bg-white/10"></div>
                <div className="h-6 w-14 rounded-[7px] bg-white/10"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="mb-[10px] flex items-center justify-between">
          <div className="h-4 w-24 rounded-full bg-white/10"></div>
          <div className="h-3 w-8 rounded-full bg-white/10"></div>
        </div>
        <ul className="flex flex-col">
          {[1, 2, 3].map((i) => (
            <li
              key={i}
              className="flex items-start gap-[10px] border-b border-white/4 py-[10px] last:border-0"
            >
              <div className="h-[30px] w-[30px] shrink-0 rounded-full bg-white/10"></div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 h-3 w-32 rounded-full bg-white/10"></div>
                <div className="h-2 w-20 rounded-full bg-white/10"></div>
              </div>
              <div className="h-3 w-12 rounded-full bg-white/10"></div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
