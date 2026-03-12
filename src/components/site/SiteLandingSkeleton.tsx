import { Skeleton } from "@/components/ui/skeleton";

export function SiteLandingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/30" />
        <nav className="relative z-10 flex items-center justify-between p-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-10 w-28 rounded-md" />
        </nav>
        <div className="relative z-10 text-center py-24 px-6 max-w-3xl mx-auto">
          <Skeleton className="h-14 w-full max-w-xl mx-auto mb-6" />
          <Skeleton className="h-6 w-3/4 mx-auto mb-8" />
          <Skeleton className="h-14 w-48 mx-auto rounded-md" />
        </div>
      </header>

      {/* Services skeleton */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <Skeleton className="h-9 w-64 mx-auto mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </section>

      {/* Team skeleton */}
      <section className="py-20 px-6 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-9 w-48 mx-auto mb-12" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-20 w-20 rounded-full mx-auto mb-4" />
                <Skeleton className="h-4 w-24 mx-auto mb-2" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA skeleton */}
      <section className="py-20 px-6 max-w-2xl mx-auto text-center">
        <Skeleton className="h-9 w-56 mx-auto mb-4" />
        <Skeleton className="h-4 w-full mb-8" />
        <Skeleton className="h-14 w-40 mx-auto rounded-md" />
      </section>

      {/* Footer skeleton */}
      <footer className="py-12 px-6 border-t border-border text-center">
        <Skeleton className="h-4 w-48 mx-auto" />
      </footer>
    </div>
  );
}
