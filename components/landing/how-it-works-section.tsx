const stages = [
  {
    stage: "Stage 1",
    title: "Satellite Detection",
    description:
      "MODIS and VIIRS satellites detect thermal anomalies across the globe. Hotspots are classified by confidence level and Fire Radiative Power (FRP).",
    color: "border-primary",
    dotColor: "bg-primary",
    glowColor: "shadow-primary/30",
  },
  {
    stage: "Stage 2",
    title: "Atmospheric Verification",
    description:
      "Atmospheric sensors validate detections by analyzing CO, CO2, PM2.5, and AOD levels. High carbon monoxide levels confirm active combustion.",
    color: "border-accent",
    dotColor: "bg-accent",
    glowColor: "shadow-accent/30",
  },
  {
    stage: "Stage 3",
    title: "Drone Confirmation",
    description:
      "Autonomous drones deploy from docking stations near confirmed sites. Thermal and visual cameras provide ground-truth verification.",
    color: "border-chart-5",
    dotColor: "bg-chart-5",
    glowColor: "shadow-chart-5/30",
  },
];

export function HowItWorksSection() {
  return (
    <section className="border-t border-border bg-card/30 py-24">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Multi-Stage Verification Pipeline
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Each fire detection goes through a rigorous 3-stage confirmation
            process to minimize false positives and enable rapid response.
          </p>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border md:left-1/2" />

          <div className="flex flex-col gap-12">
            {stages.map((item, idx) => (
              <div
                key={item.stage}
                className={`relative flex items-start gap-6 md:gap-12 ${
                  idx % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Dot */}
                <div className="absolute left-6 z-10 -translate-x-1/2 md:left-1/2">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${item.color} bg-background shadow-lg ${item.glowColor}`}
                  >
                    <span className={`h-4 w-4 rounded-full ${item.dotColor}`} />
                  </div>
                </div>

                {/* Content */}
                <div className="ml-16 flex-1 md:ml-0 md:w-1/2">
                  <div
                    className={`rounded-xl border ${item.color} bg-card p-6 shadow-lg ${item.glowColor}`}
                  >
                    <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {item.stage}
                    </span>
                    <h3 className="mb-2 text-xl font-bold text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Spacer for opposite side */}
                <div className="hidden flex-1 md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
