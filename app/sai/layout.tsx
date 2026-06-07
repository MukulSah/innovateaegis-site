import type { Metadata } from "next";
import { SAISidebar } from "@/components/sai/sai-sidebar";

export const metadata: Metadata = {
  title: "SAI COMPANY — Dashboard",
  description: "The Operating System That Runs a Company",
  robots: { index: false, follow: false },
};

export default function SAILayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#050510]">
      <SAISidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
