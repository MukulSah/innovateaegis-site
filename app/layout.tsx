import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { CursorGlow } from "@/components/cursor-effects";
import { DevToolsBlocker } from "@/components/dev-tools-blocker";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Innovative Aegis",
    template: "%s | Innovative Aegis",
  },
  description:
    "Innovative Aegis builds production-grade AI products: CareerMate, Manavya AI, Aurora AI robotaxi, Sentra, FaceNova, and SAI.",
  metadataBase: new URL("https://innovativeaegis.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Innovative Aegis",
    title: "Innovative Aegis — a house of intelligence",
    description:
      "CareerMate is live. Manavya AI is coming. Aurora AI is being cooked for Indian streets.",
    url: "https://innovativeaegis.com",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Innovative Aegis — a house of intelligence",
    description:
      "CareerMate is live. Manavya AI is coming. Aurora AI is being cooked for Indian streets.",
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
  themeColor: "#08070b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${cormorant.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full bg-[#08070b] text-[#f6f1e8]/90">
        <CursorGlow />
        <DevToolsBlocker />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
