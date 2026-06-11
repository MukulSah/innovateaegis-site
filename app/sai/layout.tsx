import type { Metadata } from "next";
import { SAISidebar } from "@/components/sai/sai-sidebar";
import { getCurrentUser } from "@/lib/sai/current-user.server";

export const metadata: Metadata = {
  title: "SAI COMPANY — Dashboard",
  description: "The Operating System That Runs a Company",
  robots: { index: false, follow: false },
};

export default async function SAILayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentUser();

  console.log("[SAILayout] loaded user:", {
    authUserId: currentUser?.user.id ?? null,
    authEmail: currentUser?.user.email ?? null,
    profileId: currentUser?.profile.id ?? null,
    profileRole: currentUser?.profile.role ?? null,
    profileName: currentUser?.profile.fullName ?? null,
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#050510]">
      <SAISidebar user={currentUser} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
