import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { FirebaseInit } from "@/components/FirebaseInit";

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Owely — Split expenses, settle over UPI or cash",
  description:
    "India-first expense splitting. Split group and 1:1 bills, then settle up over UPI or cash.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${grotesk.variable} ${jakarta.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-ink text-hi">
        <FirebaseInit />
        {children}
      </body>
    </html>
  );
}
