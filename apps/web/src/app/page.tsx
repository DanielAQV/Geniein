import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { BusinessOverview } from "@/components/business-overview"
import { AIInsights } from "@/components/ai-insights"
import { ContactFooter } from "@/components/contact-footer"
import { ScrollIndicator } from "@/components/scroll-indicator"
import { SectionDivider } from "@/components/section-divider"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#02040a]">
      <Header />
      <ScrollIndicator />
      
      <Hero />
      <SectionDivider />
      
      <BusinessOverview />
      <SectionDivider />
      
      <AIInsights />
      <SectionDivider />
      
      <ContactFooter />
    </main>
  )
}
