import { OsShell } from "@/components/sai/os-shell";

export default function OsLayout({ children }: { children: React.ReactNode }) {
  return <OsShell>{children}</OsShell>;
}
