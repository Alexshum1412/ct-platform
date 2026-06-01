/**
 * Lightweight loading skeletons that mirror the real layouts, so pages don't
 * flash plain «Загрузка…» text. Self-contained (no external Skeleton dep).
 */

function Bar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

/** Mimics a QuestionCard (badges, prompt, options, CTA). */
export function QuestionSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5" aria-hidden="true">
      <div className="flex gap-2">
        <Bar className="h-6 w-20" />
        <Bar className="h-6 w-24" />
      </div>
      <div className="space-y-2.5">
        <Bar className="h-5 w-3/4" />
        <Bar className="h-5 w-1/2" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => <Bar key={i} className="h-14 w-full rounded-xl" />)}
      </div>
      <Bar className="h-12 w-full rounded-xl" />
    </div>
  );
}

/** A stack of rounded rows — for topic/subtopic lists. */
export function CardRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => <Bar key={i} className="h-16 w-full rounded-xl" />)}
    </div>
  );
}

/** Mimics a theory article card. */
export function TheoryArticleSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4" aria-hidden="true">
      <Bar className="h-7 w-2/3" />
      <Bar className="h-16 w-full rounded-xl" />
      <div className="space-y-2.5">
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-3/4" />
      </div>
      <div className="flex gap-2">
        <Bar className="h-9 w-36 rounded-lg" />
        <Bar className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  );
}
