import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SAISidebar } from "@/components/sai/sai-sidebar";
import { SAI_USER_COOKIE, sessionFromCookie } from "@/lib/sai/auth";

export const metadata: Metadata = {
  title: "SAI COMPANY — Dashboard",
  description: "The Operating System That Runs a Company",
  robots: { index: false, follow: false },
};

export default async function SAILayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const user = sessionFromCookie(cookieStore.get(SAI_USER_COOKIE)?.value) ?? {
    id: "unknown",
    username: "admin",
    name: "Founder",
    role: "owner" as const,
    title: "Owner & CEO",
    department: "Executive",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#050510]">
      <SAISidebar user={user} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
