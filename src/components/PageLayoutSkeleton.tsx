export function PageLayoutSkeleton({ tabsCount = 3 }: { tabsCount?: number }) {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex flex-col items-start sm:items-center sm:flex-row gap-4">
            <div className="h-4 w-16 bg-slate-200 rounded" />
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-slate-200 hidden sm:block" />
              <div className="space-y-2">
                <div className="h-4 w-40 bg-slate-200 rounded" />
                <div className="h-3 w-28 bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 -mb-px">
            {Array.from({ length: tabsCount }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-3 border-b-2 border-transparent"
              >
                <div className="w-4 h-4 bg-slate-200 rounded" />
                <div className="h-4 w-16 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-4">
        <div className="h-40 w-full bg-slate-200 rounded-2xl" />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="h-28 bg-slate-200 rounded-2xl" />
          <div className="h-28 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}