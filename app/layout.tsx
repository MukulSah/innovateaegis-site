import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { CursorGlow } from "@/components/cursor-effects";
import { DevToolsBlocker } from "@/components/dev-tools-blocker";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Innovative Aegis",
    template: "%s | Innovative Aegis",
  },
  description:
    "Innovative Aegis builds silent, intelligent systems — from AI-powered security to smart infrastructure solutions.",
  metadataBase: new URL("https://innovativeaegis.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Innovative Aegis",
    title: "Innovative Aegis — Silent systems. Relentless intelligence.",
    description:
      "Innovative Aegis builds silent, intelligent systems — from AI-powered security to smart infrastructure solutions.",
    url: "https://innovativeaegis.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Innovative Aegis — Silent systems. Relentless intelligence.",
    description:
      "Innovative Aegis builds silent, intelligent systems — from AI-powered security to smart infrastructure solutions.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full bg-[#050510] text-white/90">
        <CursorGlow />
        <DevToolsBlocker />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
