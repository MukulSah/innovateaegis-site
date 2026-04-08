import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Navbar } from "@/components/navbar";
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
      <body suppressHydrationWarning className="min-h-full bg-slate-950 text-slate-100">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
