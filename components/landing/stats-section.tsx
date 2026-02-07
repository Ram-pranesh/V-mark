"use client";

import { useEffect, useState } from "react";

const stats = [
  { label: "Satellites Monitored", value: 4, suffix: "", icon: "satellite_alt" },
  { label: "Detection Accuracy", value: 95, suffix: "%", icon: "target" },
  { label: "Response Time", value: 15, suffix: "min", icon: "speed" },
  { label: "Coverage Area", value: 100, suffix: "M km\u00b2", icon: "public" },
];

function AnimatedCounter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const stepValue = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <span className="text-4xl font-bold text-foreground md:text-5xl">
      {count}
      <span className="text-primary">{suffix}</span>
    </span>
  );
}

export function StatsSection() {
  return (
    <section className="border-y border-border bg-card/30 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-3 text-center">
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              <span className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
