export function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/5] bg-surface-container-low rounded-xl mb-6" />
      <div className="space-y-2">
        <div className="h-3 bg-surface-container rounded w-1/3" />
        <div className="h-5 bg-surface-container rounded w-3/4" />
        <div className="h-4 bg-surface-container rounded w-1/4" />
      </div>
    </div>
  );
}

