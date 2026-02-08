import { Satellite, Wind, Flame, Radar, ArrowRight } from "lucide-react"
import Link from "next/link"

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="group relative rounded-xl border border-border bg-card p-6 transition-colors hover:border-[hsl(var(--primary)/0.4)]">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--primary)/0.1)]">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-[hsl(var(--primary))]">
        {value}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
              <Satellite className="h-5 w-5 text-[hsl(var(--primary-foreground))]" />
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
              className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
            >
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Flame className="h-4 w-4 text-[hsl(var(--primary))]" />
            Real-time Wildfire Monitoring
          </div>
          <h1 className="mb-6 text-balance text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
            Satellite & Drone Telemetry for Fire Detection
          </h1>
          <p className="mb-10 text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
            V-mark combines multi-source satellite feeds, atmospheric data, and
            drone telemetry to detect and monitor wildfires with real-time
            precision.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-6 py-3 text-base font-medium text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
            >
              Launch Satellite Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-card"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/50 py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
          <StatCard value="3" label="Satellite Sources" />
          <StatCard value="24/7" label="Real-time Monitoring" />
          <StatCard value="5-day" label="Historical Analysis" />
          <StatCard value="Multi" label="Stage Detection" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Core Capabilities
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Comprehensive fire detection and monitoring powered by NASA FIRMS,
            ESA Sentinel-2, and advanced atmospheric analysis.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={
              <Satellite className="h-5 w-5 text-[hsl(var(--primary))]" />
            }
            title="Multi-Source Satellite Feeds"
            description="ArcGIS World Imagery and ESA Sentinel-2 satellite feeds with real-time switching and boundary overlays."
          />
          <FeatureCard
            icon={<Flame className="h-5 w-5 text-[hsl(var(--primary))]" />}
            title="FIRMS Fire Detection"
            description="MODIS Terra/Aqua, VIIRS SNPP, and VIIRS NOAA-20 fire data with confidence filtering and severity classification."
          />
          <FeatureCard
            icon={<Wind className="h-5 w-5 text-[hsl(var(--primary))]" />}
            title="Atmospheric Monitoring"
            description="Wind speed, global temperature overlays, and detailed weather data including humidity, precipitation, and soil moisture."
          />
          <FeatureCard
            icon={<Radar className="h-5 w-5 text-[hsl(var(--primary))]" />}
            title="Multi-Stage Verification"
            description="Advanced multi-stage fire verification combining satellite cross-referencing with atmospheric anomaly detection."
          />
          <FeatureCard
            icon={
              <svg
                className="h-5 w-5 text-[hsl(var(--secondary))]"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 -960 960 960"
                fill="currentColor"
              >
                <path d="M160-160q0-75 41-134.5T307-381l-10-99H160v-240H40v-80h320v80H240v160h48l-8-80h400l-8 80h48v-160H600v-80h321v80H801v240H664l-10 99q65 27 105.5 86.5T800-160h-80q0-66-47-113t-113-47H400q-66 0-113 47t-47 113h-80Z" />
              </svg>
            }
            title="Drone Telemetry"
            description="Integrated drone telemetry mode with autonomous patrol routes, thermal imaging, and real-time communication nodes."
          />
          <FeatureCard
            icon={
              <svg
                className="h-5 w-5 text-[hsl(var(--primary))]"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 -960 960 960"
                fill="currentColor"
              >
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z" />
              </svg>
            }
            title="Measurement Tools"
            description="Built-in area measurement, route planning, and terrain visualization with 2D/3D map toggle support."
          />
        </div>
      </section>

      {/* Data Sources */}
      <section
        id="sources"
        className="border-t border-border bg-card/30 py-24"
      >
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Data Sources
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              V-mark integrates with leading satellite and weather data
              providers for comprehensive monitoring.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "NASA FIRMS",
                desc: "Fire Information for Resource Management System",
              },
              {
                name: "MODIS Terra/Aqua",
                desc: "Moderate Resolution Imaging Spectroradiometer",
              },
              {
                name: "VIIRS SNPP/NOAA-20",
                desc: "Visible Infrared Imaging Radiometer Suite",
              },
              {
                name: "ESA Sentinel-2",
                desc: "European Space Agency optical imagery",
              },
              {
                name: "ArcGIS World Imagery",
                desc: "High-resolution global satellite imagery",
              },
              {
                name: "Open-Meteo",
                desc: "Weather, air quality, and atmospheric data",
              },
            ].map((source) => (
              <div
                key={source.name}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="font-medium text-foreground">{source.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {source.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="mb-4 text-3xl font-bold text-foreground">
          Ready to Monitor?
        </h2>
        <p className="mb-8 text-muted-foreground">
          Access real-time satellite telemetry and fire detection data.
        </p>
        <Link
          href="/map"
          className="inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-8 py-3 text-base font-medium text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
        >
          Open Satellite Dashboard
          <ArrowRight className="h-5 w-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
          V-mark Satellite Telemetry System. Data sourced from NASA FIRMS, ESA,
          and Open-Meteo.
        </div>
      </footer>
    </div>
  )
}
