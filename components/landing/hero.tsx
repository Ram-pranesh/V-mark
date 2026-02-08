import Link from "next/link"
import { ArrowRight, Satellite } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-32">
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(20 95% 52% / 0.3), transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-5xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-accent px-4 py-1.5 text-sm text-muted-foreground animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Real-time Wildfire Monitoring
        </div>

        <h1 className="mb-6 text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl animate-fade-in-up">
          Satellite & Drone Telemetry
          <br />
          <span className="text-primary">for Fire Detection</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground animate-fade-in-up">
          V-mark combines multi-source satellite feeds, atmospheric data, and
          drone telemetry to detect and monitor wildfires with real-time
          precision.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up">
          <Link
            href="/map"
            className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/25"
          >
            Launch Dashboard
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Satellite className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">V-mark</span>
        </div>
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="#sources"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Data Sources
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
        {/* Mobile menu button */}
        <Link
          href="/map"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground md:hidden"
        >
          Dashboard
        </Link>
      </div>
    </header>
  )
}
