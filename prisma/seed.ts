import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.meetingAttendee.deleteMany();
  await prisma.knowledgeRecord.deleteMany();
  await prisma.agentMemory.deleteMany();
  await prisma.task.deleteMany();
  await prisma.feature.deleteMany();
  await prisma.epic.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.release.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.document.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.project.deleteMany();
  await prisma.objective.deleteMany();
  await prisma.aIAgent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.healthMetric.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.integrationConfig.deleteMany();
  await prisma.company.deleteMany();

  const passwordHash = await bcrypt.hash("admin", 10);

  const company = await prisma.company.create({
    data: {
      name: "InnovateAegis",
      slug: "innovateaegis",
      revenue: 284500,
      revenueTrend: "+12.4% MoM",
    },
  });

  const departments = await Promise.all(
    ["Executive", "Engineering", "Product", "Sales", "Marketing", "HR"].map((name) =>
      prisma.department.create({ data: { name, companyId: company.id } }),
    ),
  );

  const deptMap = Object.fromEntries(departments.map((d) => [d.name, d.id]));

  const owner = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash,
      name: "Founder",
      role: "owner",
      title: "Owner & CEO",
      departmentId: deptMap.Executive,
      status: "online",
      performanceScore: 95,
      companyId: company.id,
    },
  });

  const employees = await Promise.all([
    prisma.user.create({
      data: {
        username: "arjun",
        passwordHash: await bcrypt.hash("employee", 10),
        name: "Arjun Mehta",
        role: "employee",
        title: "Software Engineer",
        departmentId: deptMap.Engineering,
        skills: JSON.stringify(["TypeScript", "Rust", "gRPC", "Systems"]),
        status: "online",
        currentWork: "Sentra deployment module",
        performanceScore: 88,
        workload: 85,
        companyId: company.id,
      },
    }),
    prisma.user.create({
      data: {
        username: "priya",
        passwordHash: await bcrypt.hash("employee", 10),
        name: "Priya Sharma",
        role: "employee",
        title: "Product Manager",
        departmentId: deptMap.Product,
        skills: JSON.stringify(["Product Strategy", "PRDs", "User Research"]),
        status: "online",
        currentWork: "HYGYR premium tier spec",
        performanceScore: 91,
        workload: 70,
        companyId: company.id,
      },
    }),
    prisma.user.create({
      data: {
        username: "rahul",
        passwordHash: await bcrypt.hash("employee", 10),
        name: "Rahul Verma",
        role: "employee",
        title: "QA Engineer",
        departmentId: deptMap.Engineering,
        skills: JSON.stringify(["Test Automation", "Selenium", "API Testing"]),
        status: "busy",
        currentWork: "FaceNova v2 regression suite",
        performanceScore: 86,
        workload: 75,
        companyId: company.id,
      },
    }),
    prisma.user.create({
      data: {
        username: "sneha",
        passwordHash: await bcrypt.hash("employee", 10),
        name: "Sneha Patel",
        role: "employee",
        title: "DevOps Engineer",
        departmentId: deptMap.Engineering,
        skills: JSON.stringify(["Kubernetes", "CI/CD", "Terraform"]),
        status: "online",
        currentWork: "CI/CD pipeline optimization",
        performanceScore: 89,
        workload: 60,
        companyId: company.id,
      },
    }),
    prisma.user.create({
      data: {
        username: "vikram",
        passwordHash: await bcrypt.hash("employee", 10),
        name: "Vikram Singh",
        role: "employee",
        title: "Sales Executive",
        departmentId: deptMap.Sales,
        skills: JSON.stringify(["Enterprise Sales", "SaaS", "Negotiation"]),
        status: "offline",
        currentWork: "Enterprise lead follow-ups",
        performanceScore: 78,
        workload: 40,
        companyId: company.id,
      },
    }),
    prisma.user.create({
      data: {
        username: "ananya",
        passwordHash: await bcrypt.hash("employee", 10),
        name: "Ananya Reddy",
        role: "employee",
        title: "Marketing Lead",
        departmentId: deptMap.Marketing,
        skills: JSON.stringify(["Content", "SEO", "Growth"]),
        status: "online",
        currentWork: "Q2 content calendar",
        performanceScore: 82,
        workload: 55,
        companyId: company.id,
      },
    }),
    prisma.user.create({
      data: {
        username: "karthik",
        passwordHash: await bcrypt.hash("employee", 10),
        name: "Karthik Nair",
        role: "employee",
        title: "Software Engineer",
        departmentId: deptMap.Engineering,
        skills: JSON.stringify(["React", "Node.js", "Architecture"]),
        status: "busy",
        currentWork: "Unite architecture review",
        performanceScore: 87,
        workload: 90,
        companyId: company.id,
      },
    }),
  ]);

  const [arjun, priya, rahul, sneha, , , karthik] = employees;

  const agentDefs = [
    { slug: "ceo", name: "CEO Agent", role: "Chief Executive", responsibilities: ["Revenue tracking", "Market trends", "Business risks", "Growth opportunities"], status: "active" as const, score: 92 },
    { slug: "coo", name: "COO Agent", role: "Chief Operating Officer", responsibilities: ["Team productivity", "Resource allocation", "Delivery performance"], status: "active" as const, score: 88 },
    { slug: "pm", name: "Product Manager Agent", role: "Product Management", responsibilities: ["Requirements", "User stories", "Acceptance criteria"], status: "busy" as const, score: 85 },
    { slug: "architect", name: "Solution Architect Agent", role: "Architecture", responsibilities: ["System design", "API contracts", "Security models", "Scaling plans"], status: "active" as const, score: 90 },
    { slug: "project-mgr", name: "Project Manager Agent", role: "Project Management", responsibilities: ["Timelines", "Dependencies", "Risk tracking", "Progress reporting"], status: "busy" as const, score: 87 },
    { slug: "orchestrator", name: "Team Orchestrator Agent", role: "Work Routing", responsibilities: ["Task assignment", "Workload balancing", "Escalation handling"], status: "active" as const, score: 91 },
    { slug: "engineer", name: "Software Engineer Agent", role: "Engineering", responsibilities: ["Feature implementation", "Code ownership", "Technical decisions"], status: "busy" as const, score: 84 },
    { slug: "qa", name: "QA Engineer Agent", role: "Quality Assurance", responsibilities: ["Test plans", "Bug reports", "Regression testing", "Acceptance verification"], status: "active" as const, score: 86 },
    { slug: "devops", name: "DevOps Agent", role: "DevOps", responsibilities: ["CI/CD", "Infrastructure", "Monitoring", "Releases"], status: "active" as const, score: 89 },
    { slug: "security", name: "Security Agent", role: "Security", responsibilities: ["Vulnerability detection", "Security reviews", "Compliance checks"], status: "idle" as const, score: 93 },
    { slug: "docs", name: "Documentation Agent", role: "Documentation", responsibilities: ["Technical docs", "User docs", "Release notes"], status: "active" as const, score: 80 },
    { slug: "cs", name: "Customer Success Agent", role: "Customer Success", responsibilities: ["Customer issues", "Feature requests", "Satisfaction tracking"], status: "active" as const, score: 82 },
    { slug: "sales", name: "Sales Agent", role: "Sales", responsibilities: ["Leads", "Opportunities", "Revenue pipeline"], status: "active" as const, score: 78 },
    { slug: "marketing", name: "Marketing Agent", role: "Marketing", responsibilities: ["Campaigns", "Content", "Growth activities", "Brand monitoring"], status: "idle" as const, score: 75 },
    { slug: "hr", name: "HR Agent", role: "Human Resources", responsibilities: ["Employee tracking", "Performance", "Hiring needs", "Training"], status: "active" as const, score: 83 },
  ];

  const agents = await Promise.all(
    agentDefs.map((a) =>
      prisma.aIAgent.create({
        data: {
          slug: a.slug,
          name: a.name,
          role: a.role,
          responsibilities: JSON.stringify(a.responsibilities),
          status: a.status,
          performanceScore: a.score,
          currentContext: `Monitoring ${a.role.toLowerCase()} operations`,
          recommendations: JSON.stringify([]),
          companyId: company.id,
        },
      }),
    ),
  );

  const agentMap = Object.fromEntries(agents.map((a) => [a.slug, a]));

  const objectives = await Promise.all([
    prisma.objective.create({
      data: {
        title: "Build Sentra Software Deployment Module",
        businessGoal: "Enable automated software deployment across managed endpoints with rollback support",
        priority: "critical",
        targetDate: new Date("2026-06-15"),
        successMetrics: JSON.stringify(["Deploy to 2400 endpoints", "<30s rollback", "99.9% success rate"]),
        status: "in_progress",
        impactScore: 95,
        companyId: company.id,
      },
    }),
    prisma.objective.create({
      data: {
        title: "Launch FaceNova v2 Multi-Site Dashboard",
        businessGoal: "Real-time multi-site attendance analytics for enterprise customers",
        priority: "high",
        targetDate: new Date("2026-07-01"),
        successMetrics: JSON.stringify(["3 pilot customers", "NPS > 50", "<2s dashboard load"]),
        status: "in_progress",
        impactScore: 82,
        companyId: company.id,
      },
    }),
    prisma.objective.create({
      data: {
        title: "Expand HYGYR Premium Tier",
        businessGoal: "Launch paid tier with advanced templates and AI writing assistance",
        priority: "medium",
        targetDate: new Date("2026-08-01"),
        successMetrics: JSON.stringify(["4.2% conversion rate", "$15K MRR", "500 premium users"]),
        status: "in_progress",
        impactScore: 70,
        companyId: company.id,
      },
    }),
    prisma.objective.create({
      data: {
        title: "Improve HYGYR SEO",
        businessGoal: "Increase organic traffic to HYGYR by 40% through technical SEO and content",
        priority: "medium",
        targetDate: new Date("2026-09-01"),
        successMetrics: JSON.stringify(["40% traffic increase", "Top 10 for 5 keywords"]),
        status: "not_started",
        impactScore: 55,
        companyId: company.id,
      },
    }),
    prisma.objective.create({
      data: {
        title: "Acquire 10 Customers",
        businessGoal: "Close 10 new enterprise customers for Sentra and FaceNova",
        priority: "high",
        targetDate: new Date("2026-06-30"),
        successMetrics: JSON.stringify(["10 signed contracts", "$120K new ARR"]),
        status: "in_progress",
        impactScore: 88,
        companyId: company.id,
      },
    }),
    prisma.objective.create({
      data: {
        title: "Reduce Open Bugs",
        businessGoal: "Reduce P1/P2 open bugs by 50% across all products",
        priority: "high",
        targetDate: new Date("2026-06-20"),
        successMetrics: JSON.stringify(["<9 P1/P2 bugs", "Zero regression escapes"]),
        status: "at_risk",
        impactScore: 75,
        companyId: company.id,
      },
    }),
    prisma.objective.create({
      data: {
        title: "Unite Platform Architecture Phase 1",
        businessGoal: "Build foundation for unified company operating system",
        priority: "critical",
        targetDate: new Date("2026-06-30"),
        successMetrics: JSON.stringify(["API contracts complete", "Auth system live", "Memory system indexed"]),
        status: "at_risk",
        impactScore: 90,
        companyId: company.id,
      },
    }),
  ]);

  const [objSentra, objFaceNova, objHygyr, , objCustomers, objBugs, objUnite] = objectives;

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: "Sentra Deployment Module",
        description: "Automated software deployment across managed endpoints",
        objective: objSentra.businessGoal,
        status: "delayed",
        progress: 62,
        leadId: arjun.id,
        objectiveId: objSentra.id,
        companyId: company.id,
      },
    }),
    prisma.project.create({
      data: {
        name: "FaceNova v2 Dashboard",
        description: "Multi-site attendance dashboard with real-time analytics",
        objective: objFaceNova.businessGoal,
        status: "on_track",
        progress: 78,
        leadId: priya.id,
        objectiveId: objFaceNova.id,
        companyId: company.id,
      },
    }),
    prisma.project.create({
      data: {
        name: "HYGYR Premium Tier",
        description: "Paid tier with advanced templates and AI writing",
        objective: objHygyr.businessGoal,
        status: "on_track",
        progress: 45,
        leadId: priya.id,
        objectiveId: objHygyr.id,
        companyId: company.id,
      },
    }),
    prisma.project.create({
      data: {
        name: "Unite Platform",
        description: "Unified company operating system architecture phase 1",
        objective: objUnite.businessGoal,
        status: "at_risk",
        progress: 28,
        leadId: karthik.id,
        objectiveId: objUnite.id,
        companyId: company.id,
      },
    }),
  ]);

  const [projSentra, projFaceNova, projHygyr, projUnite] = projects;

  // Sentra execution graph
  const sentraEpic1 = await prisma.epic.create({
    data: { title: "Deployment Core", description: "Core deployment engine", projectId: projSentra.id, sortOrder: 0 },
  });
  const sentraFeature1 = await prisma.feature.create({
    data: {
      title: "Rollback Mechanism",
      description: "One-click rollback within 30 seconds",
      acceptanceCriteria: JSON.stringify(["Rollback completes in <30s", "Works on Windows/macOS/Linux"]),
      epicId: sentraEpic1.id,
      sortOrder: 0,
    },
  });

  const sentraTasks = [
    { title: "Design rollback architecture", stage: "code_review" as const, assigneeId: arjun.id, isBlocker: true },
    { title: "Implement rollback API", stage: "in_progress" as const, assigneeId: arjun.id, isBlocker: true },
    { title: "Windows endpoint rollback handler", stage: "testing" as const, assigneeId: arjun.id, isBlocker: true },
    { title: "Deployment scheduling engine", stage: "in_progress" as const, assigneeId: sneha.id },
    { title: "Agent auto-update mechanism", stage: "released" as const, assigneeId: arjun.id, completedAt: new Date("2026-05-28") },
    { title: "Endpoint grouping feature", stage: "testing" as const, assigneeId: sneha.id },
    { title: "Bulk deployment scheduling", stage: "planning" as const, assigneeId: arjun.id },
    { title: "Deployment audit logging", stage: "ready" as const },
    { title: "Integration tests for deployment", stage: "assigned" as const, assigneeId: rahul.id },
    { title: "Security review for deployment", stage: "backlog" as const, agentId: agentMap.security.id },
  ];

  for (const t of sentraTasks) {
    await prisma.task.create({
      data: { ...t, projectId: projSentra.id, featureId: sentraFeature1.id },
    });
  }

  // FaceNova tasks
  const fnEpic = await prisma.epic.create({
    data: { title: "Dashboard & Analytics", projectId: projFaceNova.id, sortOrder: 0 },
  });
  const fnFeature = await prisma.feature.create({
    data: { title: "Multi-Site Dashboard", epicId: fnEpic.id, sortOrder: 0, acceptanceCriteria: JSON.stringify(["Real-time updates", "Multi-site view"]) },
  });

  await prisma.task.createMany({
    data: [
      { title: "Multi-camera sync optimization", stage: "released", projectId: projFaceNova.id, featureId: fnFeature.id, assigneeId: arjun.id, completedAt: new Date("2026-05-25") },
      { title: "Analytics API endpoints", stage: "code_review", projectId: projFaceNova.id, featureId: fnFeature.id, assigneeId: karthik.id },
      { title: "Camera failover fix", stage: "testing", projectId: projFaceNova.id, featureId: fnFeature.id, assigneeId: rahul.id, isBlocker: true },
      { title: "Regression test suite v2", stage: "in_progress", projectId: projFaceNova.id, featureId: fnFeature.id, assigneeId: rahul.id },
      { title: "Attendance export improvements", stage: "assigned", projectId: projFaceNova.id, featureId: fnFeature.id },
    ],
  });

  // HYGYR tasks
  const hyEpic = await prisma.epic.create({
    data: { title: "Premium Features", projectId: projHygyr.id, sortOrder: 0 },
  });
  const hyFeature = await prisma.feature.create({
    data: { title: "Premium Tier Launch", epicId: hyEpic.id, sortOrder: 0, acceptanceCriteria: JSON.stringify(["Payment integration", "Premium templates"]) },
  });

  await prisma.task.createMany({
    data: [
      { title: "Template engine refactor", stage: "released", projectId: projHygyr.id, featureId: hyFeature.id, assigneeId: karthik.id, completedAt: new Date("2026-05-22") },
      { title: "Premium tier pricing page", stage: "testing", projectId: projHygyr.id, featureId: hyFeature.id, assigneeId: priya.id },
      { title: "PDF export special characters fix", stage: "testing", projectId: projHygyr.id, featureId: hyFeature.id, assigneeId: rahul.id, isBlocker: true },
      { title: "SEO meta optimization", stage: "planning", projectId: projHygyr.id, featureId: hyFeature.id, assigneeId: employees[5].id },
      { title: "AI writing assistant integration", stage: "backlog", projectId: projHygyr.id, featureId: hyFeature.id, agentId: agentMap.pm.id },
    ],
  });

  // Unite tasks
  const uniteEpic = await prisma.epic.create({
    data: { title: "Foundation", projectId: projUnite.id, sortOrder: 0 },
  });
  const uniteFeature = await prisma.feature.create({
    data: { title: "Core Architecture", epicId: uniteEpic.id, sortOrder: 0, acceptanceCriteria: JSON.stringify(["API contracts", "Auth system", "Data model"]) },
  });

  await prisma.task.createMany({
    data: [
      { title: "API contract definitions", stage: "planning", projectId: projUnite.id, featureId: uniteFeature.id, assigneeId: karthik.id, isBlocker: true },
      { title: "Authentication system design", stage: "in_progress", projectId: projUnite.id, featureId: uniteFeature.id, assigneeId: karthik.id },
      { title: "Company data model", stage: "in_progress", projectId: projUnite.id, featureId: uniteFeature.id, agentId: agentMap.architect.id },
      { title: "Memory system indexing", stage: "backlog", projectId: projUnite.id, featureId: uniteFeature.id },
    ],
  });

  // Releases
  await prisma.release.createMany({
    data: [
      { version: "Sentra v2.4.0", notes: "Agent auto-update, endpoint grouping", status: "released", releaseDate: new Date("2026-05-28"), projectId: projSentra.id, companyId: company.id },
      { version: "FaceNova v1.8.2", notes: "Camera failover, attendance export", status: "released", releaseDate: new Date("2026-05-20"), projectId: projFaceNova.id, companyId: company.id },
      { version: "HYGYR v3.1.0", notes: "Template engine refactor, new layouts", status: "released", releaseDate: new Date("2026-05-15"), projectId: projHygyr.id, companyId: company.id },
      { version: "Sentra v2.5.0", notes: "Deployment module, rollback support", status: "planned", releaseDate: new Date("2026-06-15"), projectId: projSentra.id, companyId: company.id },
    ],
  });

  // Health metrics
  await prisma.healthMetric.createMany({
    data: [
      { slug: "engineering", label: "Engineering Health", status: "yellow", score: 72, explanation: "Sentra deployment module is 5 days behind schedule. Code review queue has 6 pending PRs.", companyId: company.id },
      { slug: "product", label: "Product Health", status: "green", score: 86, explanation: "Roadmap alignment is strong. HYGYR user feedback scores improved 18%.", companyId: company.id },
      { slug: "revenue", label: "Revenue Health", status: "green", score: 81, explanation: "MRR growing at 12.4% month-over-month. Sentra enterprise pipeline has 4 qualified leads.", companyId: company.id },
      { slug: "customer", label: "Customer Health", status: "yellow", score: 68, explanation: "3 enterprise customers flagged support escalations. NPS at 42.", companyId: company.id },
      { slug: "operations", label: "Operations Health", status: "green", score: 79, explanation: "Team utilization at 78%. Sprint velocity stable.", companyId: company.id },
      { slug: "knowledge", label: "Knowledge Health", status: "yellow", score: 65, explanation: "23% of engineering decisions lack documentation. Architecture docs for Unite incomplete.", companyId: company.id },
    ],
  });

  // Customers
  await prisma.customer.createMany({
    data: [
      { name: "Acme Corp", email: "it@acme.com", company: "Acme Corporation", satisfaction: 72, notes: "Enterprise Sentra customer, 2400 endpoints", companyId: company.id },
      { name: "TechFlow Inc", email: "admin@techflow.io", company: "TechFlow", satisfaction: 85, notes: "FaceNova pilot customer", companyId: company.id },
      { name: "GlobalRetail", email: "ops@globalretail.com", satisfaction: 60, notes: "Support escalation open", companyId: company.id },
    ],
  });

  // Decisions
  const decision1 = await prisma.decision.create({
    data: {
      title: "Chose gRPC over REST for Sentra agent communication",
      reason: "Lower latency and bidirectional streaming required for real-time endpoint updates.",
      alternatives: JSON.stringify(["REST API", "WebSocket-only", "Message queue"]),
      impact: "Reduced agent heartbeat latency by 40%. Added complexity to client SDK.",
      ownerId: arjun.id,
      companyId: company.id,
      projects: { connect: [{ id: projSentra.id }] },
    },
  });

  const decision2 = await prisma.decision.create({
    data: {
      title: "HYGYR freemium conversion strategy",
      reason: "Premium tier targets power users with 3+ resume versions. Projected 4.2% conversion.",
      alternatives: JSON.stringify(["Fully free", "One-time purchase", "Enterprise only"]),
      impact: "Projected $15K MRR within 3 months of launch.",
      ownerId: priya.id,
      companyId: company.id,
      projects: { connect: [{ id: projHygyr.id }] },
    },
  });

  const decision3 = await prisma.decision.create({
    data: {
      title: "Sentra deployment rollback SLA requirement",
      reason: "Enterprise customers require one-click rollback within 30 seconds for compliance.",
      alternatives: JSON.stringify(["Manual rollback", "60-second rollback", "No rollback"]),
      impact: "Added 5 days to Sentra deployment module timeline but required for Acme Corp deal.",
      ownerId: owner.id,
      companyId: company.id,
      projects: { connect: [{ id: projSentra.id }] },
    },
  });

  // Meetings
  const meeting1 = await prisma.meeting.create({
    data: {
      title: "Sentra Deployment Sprint Planning",
      type: "sprint_planning",
      agenda: "Review rollback mechanism progress, assign remaining tasks, discuss Acme Corp deadline",
      notes: "Rollback PR stuck in review. Decision to prioritize rollback over bulk scheduling. Arjun overloaded.",
      actionItems: JSON.stringify(["Review rollback PR today", "Reassign bulk scheduling to Sneha", "Schedule dry-run with DevOps Agent"]),
      scheduledAt: new Date("2026-06-05T10:00:00"),
      duration: 60,
      projectId: projSentra.id,
      organizerId: priya.id,
      companyId: company.id,
    },
  });

  await prisma.meetingAttendee.createMany({
    data: [
      { meetingId: meeting1.id, userId: arjun.id },
      { meetingId: meeting1.id, userId: priya.id },
      { meetingId: meeting1.id, userId: sneha.id },
      { meetingId: meeting1.id, userId: rahul.id },
    ],
  });

  await prisma.meeting.createMany({
    data: [
      {
        title: "Daily Engineering Standup",
        type: "daily_standup",
        notes: "Arjun: rollback PR ready for review. Karthik: Unite API contracts 60% done. Rahul: FaceNova regression at 78%.",
        scheduledAt: new Date("2026-06-07T09:00:00"),
        duration: 15,
        organizerId: arjun.id,
        companyId: company.id,
      },
      {
        title: "Unite Architecture Review",
        type: "architecture_review",
        agenda: "Review API contracts, data model, auth system design",
        notes: "API contracts incomplete — blocking 8 tasks. Need second engineer on Unite.",
        scheduledAt: new Date("2026-06-08T14:00:00"),
        duration: 90,
        projectId: projUnite.id,
        organizerId: karthik.id,
        companyId: company.id,
      },
      {
        title: "Executive Weekly Review",
        type: "executive_meeting",
        agenda: "Revenue update, project status, customer escalations, Q2 priorities",
        notes: "Revenue on track. Sentra delayed 5 days. 3 customer escalations need attention.",
        scheduledAt: new Date("2026-06-06T16:00:00"),
        duration: 45,
        organizerId: owner.id,
        companyId: company.id,
      },
    ],
  });

  // Knowledge records
  await prisma.knowledgeRecord.createMany({
    data: [
      { type: "decision", title: "Chose gRPC over REST for Sentra agent communication", content: "Lower latency and bidirectional streaming required for real-time endpoint updates.", summary: "gRPC selected for Sentra agents", tags: JSON.stringify(["sentra", "grpc", "architecture"]), projectId: projSentra.id, authorId: arjun.id, companyId: company.id, decisionId: decision1.id },
      { type: "customer", title: "Acme Corp requested bulk deployment scheduling", content: "Enterprise customer needs off-hours deployment windows across 2,400 endpoints.", summary: "Bulk deployment for Acme Corp", tags: JSON.stringify(["acme", "sentra", "enterprise"]), companyId: company.id },
      { type: "engineering", title: "FaceNova camera failover architecture", content: "Implemented redundant camera streams with automatic failover to prevent attendance gaps.", summary: "Camera failover design", tags: JSON.stringify(["facenova", "camera", "failover"]), projectId: projFaceNova.id, authorId: arjun.id, companyId: company.id },
      { type: "business", title: "HYGYR freemium conversion strategy", content: "Premium tier targets power users with 3+ resume versions. Projected 4.2% conversion.", summary: "HYGYR monetization strategy", tags: JSON.stringify(["hygyr", "revenue", "premium"]), projectId: projHygyr.id, authorId: priya.id, companyId: company.id, decisionId: decision2.id },
      { type: "product", title: "Sentra deployment rollback requirement", content: "All deployments must support one-click rollback within 30 seconds for enterprise SLA.", summary: "Rollback SLA requirement", tags: JSON.stringify(["sentra", "rollback", "sla"]), projectId: projSentra.id, companyId: company.id, decisionId: decision3.id },
      { type: "meeting_notes", title: "Sentra Sprint Planning — Rollback Priority", content: meeting1.notes ?? "", summary: "Prioritize rollback PR, reassign bulk scheduling", tags: JSON.stringify(["sentra", "sprint", "meeting"]), projectId: projSentra.id, meetingId: meeting1.id, companyId: company.id },
      { type: "architecture_decision", title: "Unite Platform data model design", content: "SQLite for development, Postgres for production. Prisma ORM. Company-scoped multi-tenancy.", summary: "Unite data architecture", tags: JSON.stringify(["unite", "architecture", "database"]), projectId: projUnite.id, authorId: karthik.id, companyId: company.id },
      { type: "engineering_notes", title: "Authentication implementation for SAI", content: "Cookie-based sessions with bcrypt password hashing. Middleware protection on /sai routes.", tags: JSON.stringify(["auth", "security", "unite"]), projectId: projUnite.id, authorId: karthik.id, companyId: company.id },
      { type: "release_notes", title: "Sentra v2.4.0 Release", content: "Agent auto-update mechanism, endpoint grouping feature, improved audit logging.", summary: "Sentra v2.4.0 shipped", tags: JSON.stringify(["sentra", "release"]), projectId: projSentra.id, companyId: company.id },
      { type: "lessons_learned", title: "Rollback SLA impact on timeline", content: "Enterprise rollback requirements added 5 days to deployment module. Factor compliance requirements into initial estimates.", summary: "Lesson: compliance adds timeline", tags: JSON.stringify(["sentra", "lessons"]), projectId: projSentra.id, companyId: company.id },
      { type: "feature_history", title: "HYGYR template engine refactor", content: "Migrated from string templates to component-based engine. 3x faster rendering.", summary: "Template engine modernization", tags: JSON.stringify(["hygyr", "templates"]), projectId: projHygyr.id, authorId: karthik.id, companyId: company.id },
    ],
  });

  // Agent memories
  await prisma.agentMemory.createMany({
    data: [
      { agentId: agentMap.ceo.id, title: "Q2 Revenue Forecast", content: "MRR trending at 12.4% growth. Sentra enterprise pipeline strong with 4 qualified leads.", tags: JSON.stringify(["revenue", "forecast"]) },
      { agentId: agentMap.architect.id, title: "Sentra gRPC Architecture", content: "Bidirectional streaming for agent heartbeat. Proto definitions in /proto/sentra/.", tags: JSON.stringify(["sentra", "grpc"]) },
      { agentId: agentMap.engineer.id, title: "Rollback Implementation Notes", content: "Windows rollback requires separate handler due to service architecture differences.", tags: JSON.stringify(["sentra", "rollback"]) },
      { agentId: agentMap.qa.id, title: "FaceNova Regression Status", content: "78% test coverage on v2 dashboard. Camera failover tests passing.", tags: JSON.stringify(["facenova", "testing"]) },
      { agentId: agentMap.pm.id, title: "HYGYR Premium PRD", content: "Premium tier: AI writing, 20+ templates, priority support. Target 4.2% conversion.", tags: JSON.stringify(["hygyr", "prd"]) },
    ],
  });

  // Documents
  await prisma.document.createMany({
    data: [
      { title: "Sentra Deployment Module PRD", content: "# PRD\n\nAutomated deployment with rollback support for enterprise endpoints.", type: "prd", projectId: projSentra.id, authorId: priya.id, companyId: company.id },
      { title: "FaceNova v2 Architecture", content: "# Architecture\n\nMulti-site dashboard with WebSocket real-time updates.", type: "architecture", projectId: projFaceNova.id, authorId: agentMap.architect.id ? karthik.id : undefined, companyId: company.id },
      { title: "Unite API Contracts", content: "# API Contracts\n\nREST + GraphQL hybrid. Company-scoped endpoints.", type: "api_contract", projectId: projUnite.id, authorId: karthik.id, companyId: company.id },
    ],
  });

  // Activity logs
  const now = new Date();
  const activities = [
    { type: "release_shipped" as const, title: "Sentra v2.4.0 released", projectId: projSentra.id, createdAt: new Date("2026-05-28") },
    { type: "task_completed" as const, title: "Agent auto-update mechanism completed", projectId: projSentra.id, userId: arjun.id, createdAt: new Date("2026-05-28") },
    { type: "task_completed" as const, title: "Template engine refactor completed", projectId: projHygyr.id, userId: karthik.id, createdAt: new Date("2026-05-22") },
    { type: "meeting_held" as const, title: "Sentra Sprint Planning held", projectId: projSentra.id, meetingId: meeting1.id, createdAt: new Date("2026-06-05") },
    { type: "decision_made" as const, title: "gRPC chosen for Sentra agents", projectId: projSentra.id, userId: arjun.id, createdAt: new Date("2026-05-12") },
    { type: "objective_created" as const, title: "Objective: Build Sentra Deployment Module", objectiveId: objSentra.id, createdAt: new Date("2026-04-01") },
    { type: "project_created" as const, title: "Project: Unite Platform created", projectId: projUnite.id, createdAt: new Date("2026-05-01") },
    { type: "knowledge_created" as const, title: "Camera failover architecture documented", projectId: projFaceNova.id, userId: arjun.id, createdAt: new Date("2026-04-22") },
    { type: "customer_feedback" as const, title: "Acme Corp requested bulk deployment", createdAt: new Date("2026-05-18") },
    { type: "task_completed" as const, title: "Multi-camera sync optimization completed", projectId: projFaceNova.id, userId: arjun.id, createdAt: new Date("2026-05-25") },
  ];

  for (const a of activities) {
    await prisma.activityLog.create({
      data: { ...a, companyId: company.id },
    });
  }

  // Integration configs
  await prisma.integrationConfig.createMany({
    data: [
      "github", "gitlab", "jira", "notion", "slack",
      "microsoft_teams", "google_workspace", "discord",
      "email", "calendar", "video_meetings",
    ].map((provider) => ({ provider, enabled: false, config: "{}" })),
  });

  // Notifications
  await prisma.notification.createMany({
    data: [
      { title: "Sentra deployment delayed", message: "Sentra Deployment Module is 5 days behind schedule. Rollback mechanism is the primary blocker.", type: "warning", link: "/sai/projects", companyId: company.id },
      { title: "3 customer escalations", message: "GlobalRetail and 2 other customers have open support escalations.", type: "action_required", link: "/sai/memory", companyId: company.id },
      { title: "Sentra v2.4.0 shipped", message: "Agent auto-update and endpoint grouping released successfully.", type: "success", companyId: company.id },
    ],
  });

  console.log("✅ SAI COMPANY database seeded successfully");
  console.log(`   Company: ${company.name}`);
  console.log(`   Users: ${employees.length + 1} (1 owner + ${employees.length} employees)`);
  console.log(`   Agents: ${agents.length}`);
  console.log(`   Projects: ${projects.length}`);
  console.log(`   Objectives: ${objectives.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
