import { Skeleton } from "@/components/ui/skeleton"

export function MapSkeleton() {
  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar Skeleton */}
      <div className="flex w-[clamp(100px,18vw,300px)] flex-col border-r border-border bg-card">
        {/* Sidebar Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-5 w-36" />
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          {/* Satellite Feeds Group */}
          <div className="rounded-lg bg-accent p-4">
            <div className="mb-3 flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <Skeleton className="h-3 w-28 mb-2" />
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          </div>

          {/* Atmospheric Group */}
          <div className="rounded-lg bg-accent p-4">
            <div className="mb-3 flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>

          {/* Tools Group */}
          <div className="rounded-lg bg-accent p-4">
            <div className="mb-3 flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-14 flex-1 rounded-lg" />
              <Skeleton className="h-14 flex-1 rounded-lg" />
            </div>
          </div>

          {/* System Group */}
          <div className="rounded-lg bg-accent p-4">
            <div className="mb-3 flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Map Area Skeleton */}
      <div className="relative flex-1">
        {/* Map placeholder with animated gradient */}
        <div className="h-full w-full bg-accent">
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="relative">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="h-8 w-8 animate-spin text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Initializing Satellite Telemetry
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Loading map engine and data feeds...
              </p>
            </div>
          </div>
        </div>

        {/* Coordinates bar skeleton */}
        <div className="absolute left-4 top-5">
          <Skeleton className="h-7 w-44 rounded" />
        </div>

        {/* Time controls skeleton */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
          <Skeleton className="h-12 w-72 rounded-full" />
        </div>
      </div>
    </div>
  )
}
