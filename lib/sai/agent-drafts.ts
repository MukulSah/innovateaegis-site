import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

const AGENT_TEMPLATES: Record<
  string,
  { title: string; generate: (context: string) => string }
> = {
  architect: {
    title: "Architecture Draft",
    generate: (context) =>
      `# Architecture Draft\n\n## Context\n${context}\n\n## Proposed Architecture\n\n### Components\n- API layer (REST/GraphQL)\n- Service layer with domain logic\n- Data persistence layer\n- Authentication & authorization module\n\n### Key Decisions\n1. Define service boundaries based on domain\n2. Establish API contracts before implementation\n3. Plan for horizontal scaling\n\n### Security Considerations\n- Input validation at API boundary\n- Role-based access control\n- Audit logging for sensitive operations\n\n---\n*Draft generated for human review. Edit before adoption.*`,
  },
  qa: {
    title: "Test Plan Draft",
    generate: (context) =>
      `# Test Plan\n\n## Scope\n${context}\n\n## Test Categories\n\n### Unit Tests\n- Core business logic\n- Edge cases and error handling\n\n### Integration Tests\n- API endpoint validation\n- Database operations\n- External service mocks\n\n### Acceptance Criteria\n- [ ] All user stories have corresponding tests\n- [ ] Critical paths covered\n- [ ] Regression suite passes\n\n---\n*Draft generated for human review.*`,
  },
  pm: {
    title: "Task Breakdown Draft",
    generate: (context) =>
      `# Task Breakdown\n\n## Objective\n${context}\n\n## Epics\n1. **Discovery** — Requirements gathering, stakeholder alignment\n2. **Design** — Architecture, UI/UX, API contracts\n3. **Implementation** — Core features, integrations\n4. **Quality** — Testing, bug fixes, performance\n5. **Release** — Deployment, documentation, monitoring\n\n## Suggested Tasks\n- Define acceptance criteria\n- Create technical design document\n- Implement core feature\n- Write unit tests\n- Code review and QA\n- Deploy to staging\n- Release to production\n\n---\n*Draft generated for human review.*`,
  },
  docs: {
    title: "Release Notes Draft",
    generate: (context) =>
      `# Release Notes\n\n## Summary\n${context}\n\n## What's New\n- Feature additions (to be filled after implementation)\n\n## Improvements\n- Performance optimizations\n- Bug fixes\n\n## Breaking Changes\n- None identified\n\n## Migration Guide\n- No migration required\n\n---\n*Draft generated for human review.*`,
  },
};

export async function generateAgentDraft(input: {
  agentType: string;
  context: string;
  projectId?: string;
  taskId?: string;
}) {
  const companyId = await getCompanyId();
  const template = AGENT_TEMPLATES[input.agentType];

  if (!template) {
    throw new Error(`Unknown agent type: ${input.agentType}`);
  }

  const content = template.generate(input.context);

  return prisma.agentDraft.create({
    data: {
      agentType: input.agentType,
      title: template.title,
      content,
      status: "pending_review",
      projectId: input.projectId,
      taskId: input.taskId,
      companyId,
    },
  });
}

export async function getAgentDrafts(status?: string) {
  const companyId = await getCompanyId();
  return prisma.agentDraft.findMany({
    where: { companyId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
