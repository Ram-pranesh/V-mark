const features = [
  {
    title: "Multi-Satellite Detection",
    description:
      "Real-time fire hotspot detection using MODIS Terra/Aqua, VIIRS SNPP, and VIIRS NOAA-20 satellite feeds with confidence scoring.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" height="28" viewBox="0 -960 960 960" width="28" fill="currentColor">
        <path d="M560-32v-80q117 0 198.5-81.5T840-392h80q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T560-32Zm0-160v-80q50 0 85-35t35-85h80q0 83-58.5 141.5T560-192Z" />
      </svg>
    ),
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Atmospheric Analysis",
    description:
      "Real-time monitoring of CO, CO2, NO2, PM2.5 levels, wind speed, temperature, and CAPE values for fire risk assessment.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    title: "3-Stage Verification",
    description:
      "Progressive fire confirmation: Stage 1 (Satellite), Stage 2 (Atmospheric), Stage 3 (Drone) verification pipeline.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
  },
  {
    title: "Drone Telemetry",
    description:
      "Autonomous drone deployment from docking stations with live video feeds, thermal imaging, and real-time flight data.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" height="28" viewBox="0 -960 960 960" width="28" fill="currentColor">
        <path d="M160-160q0-75 41-134.5T307-381l-10-99H160v-240H40v-80h320v80H240v160h48l-8-80h400l-8 80h48v-160H600v-80h321v80H801v240H664l-10 99q65 27 105.5 86.5T800-160h-80q0-66-47-113t-113-47H400q-66 0-113 47t-47 113h-80Z" />
      </svg>
    ),
    color: "text-chart-4",
    bgColor: "bg-chart-4/10",
  },
  {
    title: "Weather Intelligence",
    description:
      "Click-to-scan atmospheric composition with AQI, historical weather data, hourly forecasts, and exportable statistics.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
  {
    title: "Interactive Tools",
    description:
      "Area measurement with fire hotspot counting, route planning with OSRM routing, terrain views, and data export to CSV/XLSX.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
            Mission-Critical Capabilities
          </h2>
          <p className="mx-auto max-w-2xl text-balance text-muted-foreground">
            A comprehensive fire detection and monitoring platform with real-time
            satellite data, atmospheric analysis, and drone operations.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg ${feature.bgColor} ${feature.color}`}
              >
                {feature.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
