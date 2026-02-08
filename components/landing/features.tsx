"use client"

import { useEffect, useState } from "react"
import { Satellite, Flame, Wind, Radar, Ruler, Map } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

const features = [
  {
    icon: Satellite,
    title: "Multi-Source Satellite Feeds",
    description:
      "ArcGIS World Imagery and ESA Sentinel-2 satellite feeds with real-time switching and boundary overlays.",
  },
  {
    icon: Flame,
    title: "FIRMS Fire Detection",
    description:
      "MODIS Terra/Aqua, VIIRS SNPP, and VIIRS NOAA-20 fire data with confidence filtering and severity classification.",
  },
  {
    icon: Wind,
    title: "Atmospheric Monitoring",
    description:
      "Wind speed, global temperature overlays, and detailed weather data including humidity, precipitation, and soil moisture.",
  },
  {
    icon: Radar,
    title: "Multi-Stage Verification",
    description:
      "Advanced multi-stage fire verification combining satellite cross-referencing with atmospheric anomaly detection.",
  },
  {
    icon: Map,
    title: "Drone Telemetry",
    description:
      "Integrated drone mode with autonomous patrol routes, thermal imaging, and real-time communication nodes.",
  },
  {
    icon: Ruler,
    title: "Measurement Tools",
    description:
      "Built-in area measurement, route planning, and terrain visualization with 2D/3D map toggle support.",
  },
]

function FeatureCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <Skeleton className="mb-4 h-10 w-10 rounded-lg" />
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-5/6" />
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  delay: number
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (!visible) return <FeatureCardSkeleton />

  return (
    <div className="group relative rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 animate-fade-in-up">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-12 text-center">
        <h2 className="mb-4 text-3xl font-bold text-foreground">
          Core Capabilities
        </h2>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Comprehensive fire detection and monitoring powered by NASA FIRMS, ESA
          Sentinel-2, and advanced atmospheric analysis.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <FeatureCard key={feature.title} {...feature} delay={400 + i * 100} />
        ))}
      </div>
    </section>
  )
}
