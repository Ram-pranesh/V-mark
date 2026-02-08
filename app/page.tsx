import { Header, Hero } from "@/components/landing/hero"
import { Stats } from "@/components/landing/stats"
import { Features } from "@/components/landing/features"
import { DataSources, CTA, Footer } from "@/components/landing/data-sources"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Stats />
      <Features />
      <DataSources />
      <CTA />
      <Footer />
    </div>
  )
}
