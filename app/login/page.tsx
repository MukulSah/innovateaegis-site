import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ redirect?: string }> };

export default async function LegacyLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const target = params.redirect ? `/auth/login?redirect=${encodeURIComponent(params.redirect)}` : "/auth/login";
  redirect(target);
}
