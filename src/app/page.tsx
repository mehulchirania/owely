import LandingMotion from "@/components/landing/LandingMotion";
import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import Marquee from "@/components/landing/Marquee";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import Simplify from "@/components/landing/Simplify";
import Compare from "@/components/landing/Compare";
import Pricing from "@/components/landing/Pricing";
import ValueBand from "@/components/landing/ValueBand";
import Cta from "@/components/landing/Cta";
import Footer from "@/components/landing/Footer";
import { LoginModal } from "@/components/LoginModal";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const showLogin = params?.login === "true";

  return (
    <LandingMotion>
      {showLogin && <LoginModal />}
      {/* scroll progress */}
      <div className="fixed inset-x-0 top-0 z-[200] h-[3px] bg-transparent">
        <div
          data-progress
          className="h-full w-0 rounded-r-[3px]"
          style={{ background: "linear-gradient(90deg,var(--color-accent),var(--color-accent2))" }}
        />
      </div>

      <Nav />
      <Hero />
      <Marquee />
      <HowItWorks />
      <Features />
      <Simplify />
      <Compare />
      <Pricing />
      <ValueBand />
      <Cta />
      <Footer />
    </LandingMotion>
  );
}
