import { NextResponse } from "next/server";
import { getSession } from "@/lib/sai/api-auth";
import { getCompanyRecords, getRecordsCenterSummary } from "@/lib/sai/company-records";
import type { CompanyRecordType } from "@/lib/sai/session-types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const summaryOnly = searchParams.get("summary") === "1";
  const recordType = searchParams.get("type") as CompanyRecordType | null;
  const search = searchParams.get("search") ?? undefined;
  const sessionId = searchParams.get("sessionId") ?? undefined;

  try {
    if (summaryOnly) {
      const summary = await getRecordsCenterSummary();
      return NextResponse.json({ summary });
    }

    const records = await getCompanyRecords({
      recordType: recordType ?? undefined,
      sourceSessionId: sessionId,
      search,
      limit: 100,
    });

    return NextResponse.json({ records });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load records" },
      { status: 500 },
    );
  }
}
