import type { Metadata } from "next";
import LandingMotion from "@/components/landing/LandingMotion";
import Nav from "@/components/landing/Nav";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";
import { LoginModal } from "@/components/LoginModal";

export const metadata: Metadata = { title: "Pricing — Owely" };

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const showLogin = params?.login === "true";

  return (
    <LandingMotion>
      {showLogin && <LoginModal />}
      <div className="fixed inset-x-0 top-0 z-[200] h-[3px] bg-transparent">
        <div
          data-progress
          className="h-full w-0 rounded-r-[3px]"
          style={{ background: "linear-gradient(90deg,var(--color-accent),var(--color-accent2))" }}
        />
      </div>
      <Nav />
      <div className="pt-[72px]">
        <Pricing />
      </div>
      <Footer />
    </LandingMotion>
  );
}
