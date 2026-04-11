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
    default: "InnovateAegis",
    template: "%s | InnovateAegis",
  },
  description:
    "InnovateAegis is a product-focused AI software company building scalable systems for endpoint intelligence, face recognition attendance, and user productivity.",
  metadataBase: new URL("https://innovativeaegis.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "InnovateAegis",
    title: "InnovateAegis — Product-Grade AI Software Systems",
    description:
      "InnovateAegis builds production-grade software products including endpoint management, face recognition attendance, and resume builder platforms.",
    url: "https://innovativeaegis.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "InnovateAegis — Product-Grade AI Software Systems",
    description:
      "InnovateAegis builds production-grade software products including endpoint management, face recognition attendance, and resume builder platforms.",
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
