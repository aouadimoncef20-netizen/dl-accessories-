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

export function PageSkeleton() {
  return (
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <div className="animate-pulse space-y-12">
        <div className="h-12 bg-surface-container-low rounded w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <div className="animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/5] bg-surface-container-low rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-square bg-surface-container-low rounded-2xl" />
            <div className="aspect-square bg-surface-container-low rounded-2xl" />
          </div>
        </div>
        <div className="lg:col-span-5 space-y-6">
          <div className="h-6 bg-surface-container-low rounded w-1/4" />
          <div className="h-10 bg-surface-container-low rounded w-3/4" />
          <div className="h-8 bg-surface-container-low rounded w-1/3" />
          <div className="h-24 bg-surface-container-low rounded" />
          <div className="h-14 bg-surface-container-low rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="material-symbols-outlined text-5xl text-error mb-4">error_outline</span>
      <p className="font-headline-sm text-on-surface-variant mb-2">Something went wrong</p>
      <p className="font-body-md text-secondary mb-6">{message || "Unable to load data."}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-8 py-3 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "inventory_2", title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="material-symbols-outlined text-5xl text-outline mb-4">{icon}</span>
      <p className="font-headline-sm text-on-surface-variant mb-2">{title || "Nothing here yet"}</p>
      <p className="font-body-md text-secondary mb-6">{message}</p>
      {action}
    </div>
  );
}
