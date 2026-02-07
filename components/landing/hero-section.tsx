"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,107,53,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,107,53,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,107,53,0.08)_0%,transparent_70%)]" />

      {/* Scanning line effect */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute left-0 h-px w-full bg-primary/20 transition-transform duration-1000 ${
            mounted ? "animate-scan" : ""
          }`}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-sm font-medium text-primary">
            Real-time Monitoring Active
          </span>
        </div>

        {/* Main heading */}
        <h1 className="mb-6 text-balance text-5xl font-bold leading-tight tracking-tight text-foreground md:text-7xl">
          Satellite Telemetry
          <br />
          <span className="text-primary">Fire Detection</span> System
        </h1>

        {/* Description */}
        <p className="mx-auto mb-10 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground md:text-xl">
          Multi-stage fire detection powered by MODIS, VIIRS, and Sentinel-2
          satellite data with atmospheric verification and autonomous drone
          confirmation.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/satellite"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="20"
              viewBox="0 -960 960 960"
              width="20"
              fill="currentColor"
            >
              <path d="M560-32v-80q117 0 198.5-81.5T840-392h80q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T560-32Z" />
            </svg>
            Launch Map
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-8 text-base font-semibold text-foreground transition-all hover:border-primary/50 hover:bg-card/80"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            View Dashboard
          </Link>
        </div>

        {/* Tech badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
          {["MODIS", "VIIRS SNPP", "VIIRS NOAA-20", "Sentinel-2", "Open-Meteo"].map(
            (tech) => (
              <span
                key={tech}
                className="rounded-md border border-border bg-card/50 px-3 py-1 font-mono text-xs text-muted-foreground"
              >
                {tech}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  );
}
