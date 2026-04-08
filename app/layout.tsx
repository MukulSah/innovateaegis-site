import type { Metadata } from "next";
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
  title: "Innovative Aegis",
  description: "Silent systems. Relentless intelligence.",
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
