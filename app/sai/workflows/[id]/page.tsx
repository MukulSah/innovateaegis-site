import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/** Legacy workflow URL — Session Center is the permanent session record home. */
export default async function WorkflowDetailRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/sai/sessions/${id}`);
}
