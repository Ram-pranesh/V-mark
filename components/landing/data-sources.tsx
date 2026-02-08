import Link from "next/link"
import { ArrowRight } from "lucide-react"

const sources = [
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
]

export function DataSources() {
  return (
    <section id="sources" className="border-t border-border bg-card/30 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Data Sources
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            V-mark integrates with leading satellite and weather data providers
            for comprehensive monitoring.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <div
              key={source.name}
              className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
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
  )
}

export function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 text-center">
      <h2 className="mb-4 text-3xl font-bold text-foreground">
        Ready to Monitor?
      </h2>
      <p className="mb-8 text-muted-foreground">
        Access real-time satellite telemetry and fire detection data.
      </p>
      <Link
        href="/map"
        className="group inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/25"
      >
        Open Satellite Dashboard
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </Link>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
        V-mark Satellite Telemetry System. Data sourced from NASA FIRMS, ESA,
        and Open-Meteo.
      </div>
    </footer>
  )
}
