import Link from "next/link";
import { CreateDocumentForm } from "@/components/sai/create-document-form";
import { SectionPage } from "@/components/sai/section-page";
import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

export default async function DocumentsPage() {
  const companyId = await getCompanyId();
  const [documents, projects] = await Promise.all([
    prisma.document.findMany({
      where: { companyId },
      include: {
        author: { select: { name: true } },
        project: { select: { name: true } },
        _count: { select: { versions: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const typeLabels: Record<string, string> = {
    prd: "PRD",
    architecture: "Architecture",
    meeting_notes: "Meeting Notes",
    release_notes: "Release Notes",
    technical: "Technical",
    business: "Business",
    notion_import: "Notion Import",
  };

  return (
    <SectionPage
      title="Document Center"
      subtitle="Versioned company documents"
      description="PRDs, architecture docs, meeting notes, release notes, and business documents — all versioned."
    >
      <CreateDocumentForm projects={projects} />

      <div className="mt-8 space-y-3">
        {documents.length === 0 ? (
          <p className="text-sm text-white/40">No documents yet. Create your first document above.</p>
        ) : (
          documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/sai/documents/${doc.id}`}
              className="enterprise-glass block rounded-xl border border-white/10 p-5 transition-colors hover:border-purple-400/25"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{doc.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-white/50">{doc.content.slice(0, 200)}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase text-white/50">
                  {typeLabels[doc.type] ?? doc.type}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-white/35">
                {doc.project && <span>Project: {doc.project.name}</span>}
                {doc.author && <span>By: {doc.author.name}</span>}
                <span>{doc._count.versions} version(s)</span>
                <span>Updated {doc.updatedAt.toISOString().slice(0, 10)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </SectionPage>
  );
}
