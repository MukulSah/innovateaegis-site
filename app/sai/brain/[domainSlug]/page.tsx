import { redirect } from "next/navigation";

type Props = { params: Promise<{ domainSlug: string }> };

/** Legacy domain routes redirect to layer-based Company Brain */
export default async function LegacyBrainDomainPage({ params }: Props) {
  const { domainSlug } = await params;
  const layerMap: Record<string, string> = {
    company: "strategic",
    product: "strategic",
    engineering: "operational",
    customer: "connectivity",
    market: "intelligence",
    decision: "operational",
    learning: "intelligence",
    founder: "strategic",
    "ai-agent": "operational",
  };
  const layer = layerMap[domainSlug] ?? "strategic";
  redirect(`/sai/brain?layer=${layer}`);
}
