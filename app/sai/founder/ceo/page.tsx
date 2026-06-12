import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ objectiveId?: string }> };

export default async function LegacyCeoRedirect({ searchParams }: Props) {
  const { objectiveId } = await searchParams;
  const q = objectiveId ? `?objectiveId=${objectiveId}` : "";
  redirect(`/sai/executive/ceo${q}`);
}
