import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/sai/api-auth";
import { prisma } from "@/lib/prisma";
import {
  getGitHubActivity,
  getGitHubConfig,
  getGitHubSummary,
  syncGitHubRepos,
} from "@/lib/sai/integrations/github";

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  const [config, summary, activity] = await Promise.all([
    getGitHubConfig(),
    getGitHubSummary(),
    getGitHubActivity(20),
  ]);

  return NextResponse.json({ config, summary, activity });
}

export async function POST(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const { action, repos, org, projectId } = body as {
    action?: string;
    repos?: string[];
    org?: string;
    projectId?: string;
  };

  if (action === "configure") {
    const config = JSON.stringify({ repos, org });
    await prisma.integrationConfig.upsert({
      where: { provider: "github" },
      create: { provider: "github", enabled: Boolean(process.env.GITHUB_TOKEN), config },
      update: { config, enabled: Boolean(process.env.GITHUB_TOKEN) },
    });
    return NextResponse.json({ message: "GitHub configuration saved" });
  }

  const result = await syncGitHubRepos(projectId);
  return NextResponse.json(result);
}
