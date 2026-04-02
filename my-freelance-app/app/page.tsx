import Hero from '@/components/sections/Hero'
import SocialProof from '@/components/sections/SocialProof'
import ProblemSolution from '@/components/sections/ProblemSolution'
import ServicesShowcase from '@/components/sections/ServicesShowcase'
import ValuePropositions from '@/components/sections/ValuePropositions'
import PortfolioShowcase from '@/components/sections/PortfolioShowcase'
import Testimonials from '@/components/sections/Testimonials'
import PricingCalculator from '@/components/sections/PricingCalculator'
import HowItWorks from '@/components/sections/HowItWorks'
import LimitedOffer from '@/components/sections/LimitedOffer'
import IndustriesCovered from '@/components/sections/IndustriesCovered'
import FAQ from '@/components/sections/FAQ'
import FinalCTA from '@/components/sections/FinalCTA'

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      <Hero />
      <SocialProof />
      <ProblemSolution />
      <ServicesShowcase />
      <ValuePropositions />
      <PortfolioShowcase />
      <Testimonials />
      <PricingCalculator />
      <HowItWorks />
      <LimitedOffer />
      <IndustriesCovered />
      <FAQ />
      <FinalCTA />
    </div>
  )
}

