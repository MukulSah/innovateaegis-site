import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentEditor } from "@/components/sai/document-editor";
import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

type Props = { params: Promise<{ id: string }> };

export default async function DocumentDetailPage({ params }: Props) {
  const { id } = await params;
  const companyId = await getCompanyId();

  const document = await prisma.document.findFirst({
    where: { id, companyId },
    include: {
      author: { select: { name: true } },
      project: { select: { name: true } },
      versions: { orderBy: { version: "desc" } },
    },
  });

  if (!document) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/sai/documents" className="text-xs text-purple-300/80 hover:text-purple-200">
        ← Back to documents
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-white">{document.title}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/45">
          <span className="uppercase">{document.type.replace(/_/g, " ")}</span>
          {document.project && <span>Project: {document.project.name}</span>}
          {document.author && <span>Author: {document.author.name}</span>}
          <span>{document.versions.length} version(s)</span>
        </div>
      </header>

      <DocumentEditor
        documentId={document.id}
        initialContent={document.content}
      />

      {document.versions.length > 1 && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h2 className="text-sm font-semibold text-white">Version History</h2>
          <ul className="mt-4 space-y-2">
            {document.versions.map((v) => (
              <li key={v.id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50">
                Version {v.version} — {v.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
