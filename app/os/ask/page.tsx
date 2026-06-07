import { AskSai } from "@/components/sai/ask-sai";
import { SectionHeading } from "@/components/sai/ui";

export default async function AskPage(props: PageProps<"/os/ask">) {
  const { q } = await props.searchParams;
  const initialQuery = Array.isArray(q) ? q[0] : (q ?? "");

  return (
    <div>
      <SectionHeading
        eyebrow="SAI Brain"
        title="Ask SAI"
        description="A conversational interface to the entire company. Ask about projects, people, agents, customers, revenue, decisions, and knowledge — every answer is grounded in live company data."
      />
      <AskSai variant="full" initialQuery={initialQuery} />
    </div>
  );
}
