import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/** Legacy agent workspace — redirects to Organization designation workspace. */
export default async function LegacyAgentWorkspacePage({ params }: Props) {
  const { id } = await params;
  redirect(`/sai/organization/agents/${id}/workspace`);
}
