"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

const stats = [
  { value: "3", label: "Satellite Sources", suffix: "" },
  { value: "24/7", label: "Real-time Monitoring", suffix: "" },
  { value: "5", label: "Day History", suffix: "-day" },
  { value: "Multi", label: "Stage Detection", suffix: "" },
]

function AnimatedStat({
  value,
  label,
  suffix,
  delay,
}: {
  value: string
  label: string
  suffix: string
  delay: number
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (!visible) {
    return (
      <div className="text-center">
        <Skeleton className="mx-auto mb-2 h-9 w-20" />
        <Skeleton className="mx-auto h-4 w-28" />
      </div>
    )
  }

  return (
    <div className="text-center animate-fade-in-up">
      <div className="text-3xl font-bold text-primary">
        {value}
        {suffix && <span className="text-xl text-muted-foreground">{suffix}</span>}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

export function Stats() {
  return (
    <section className="border-y border-border bg-card/50 py-12">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
        {stats.map((stat, i) => (
          <AnimatedStat key={stat.label} {...stat} delay={200 + i * 150} />
        ))}
      </div>
    </section>
  )
}
