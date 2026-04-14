import LandingHeader from "@/components/landing/LandingHeader";
import Hero         from "@/components/landing/Hero";
import HowItWorks   from "@/components/landing/HowItWorks";
import Architecture from "@/components/landing/Architecture";
import FAQ          from "@/components/landing/FAQ";
import Footer       from "@/components/landing/Footer";
import GettingStarted from "@/components/landing/GettingStarted";
import TrustedBy from "@/components/landing/TrustedBy";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white font-inter overflow-x-hidden">
      <LandingHeader />
      <Hero />
      <TrustedBy />
      <HowItWorks />
      <Architecture />
      <GettingStarted />
      <FAQ />
      <Footer />
    </div>
  );
}
