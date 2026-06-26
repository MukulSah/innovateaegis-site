import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { fireGitAutomations } from "@/lib/sai/agent-automation-runner";

type PullRequestPayload = {
  action: string;
  pull_request?: {
    number: number;
    draft: boolean;
    head: { sha: string; ref: string };
    base: { ref: string };
    html_url: string;
    title: string;
  };
  repository?: {
    full_name: string;
  };
};

function verifyGithubSignature(payload: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return !secret;

  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");

  if (!verifyGithubSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event !== "pull_request") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let payload: PullRequestPayload;
  try {
    payload = JSON.parse(rawBody) as PullRequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repo = payload.repository?.full_name;
  const pr = payload.pull_request;
  if (!repo || !pr) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const action = payload.action;
  let gitEvent: "pr_opened" | "pr_pushed" | "pr_merged" | null = null;

  if (action === "opened") gitEvent = "pr_opened";
  else if (action === "synchronize") gitEvent = "pr_pushed";
  else if (action === "closed" && (pr as { merged?: boolean }).merged) gitEvent = "pr_merged";

  if (!gitEvent) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const sessions = await fireGitAutomations(gitEvent, repo, {
    prNumber: String(pr.number),
    prTitle: pr.title,
    headSha: pr.head.sha,
    headRef: pr.head.ref,
    baseRef: pr.base.ref,
    isDraft: pr.draft ? "true" : "false",
    prUrl: pr.html_url,
  });

  return NextResponse.json({ ok: true, sessions });
}
