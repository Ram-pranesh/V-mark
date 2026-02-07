import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="16"
                viewBox="0 -960 960 960"
                width="16"
                fill="white"
              >
                <path d="M560-32v-80q117 0 198.5-81.5T840-392h80q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T560-32Z" />
              </svg>
            </div>
            <span className="font-bold text-foreground">V-mark</span>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/satellite"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Satellite Map
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/drone"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Drone Telemetry
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            Built with v0.app + Next.js
          </p>
        </div>
      </div>
    </footer>
  );
}
