export type UserRole = "owner" | "employee" | "agent";

export type HealthStatus = "green" | "yellow" | "red";

export type TaskStage =
  | "backlog"
  | "planning"
  | "ready"
  | "assigned"
  | "in_progress"
  | "code_review"
  | "testing"
  | "approval"
  | "released"
  | "archived";

export type PriorityLevel = "low" | "medium" | "high" | "critical";

export type AgentStatus = "active" | "idle" | "busy" | "disabled";

export type AgentCapacityStatus =
  | "AVAILABLE"
  | "BUSY"
  | "OVERLOADED"
  | "BLOCKED"
  | "OFFLINE";

export type NotificationCategory =
  | "APPROVAL"
  | "ASSIGNMENT"
  | "COMMENT"
  | "ESCALATION"
  | "WORKFLOW"
  | "RELEASE"
  | "DOCUMENT"
  | "SYSTEM";

export type NotificationSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type NotificationRecipientType = "founder" | "agent" | "team" | "employee";

export type DeliverableType =
  | "PRD"
  | "Requirements Document"
  | "Architecture Document"
  | "API Specification"
  | "Database Design"
  | "Implementation Guide"
  | "Test Plan"
  | "Test Report"
  | "Release Notes"
  | "Deployment Plan"
  | "Meeting Summary"
  | "Research Report"
  | "Business Proposal"
  | "Client Deliverable"
  | "Training Material"
  | "Knowledge Base Article";

export type DeliverableStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "ARCHIVED";

export type ReviewStatus = "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";

export type DiscussionEntityType =
  | "workflow"
  | "task"
  | "document"
  | "decision"
  | "deliverable"
  | "release"
  | "memory";

export type TaskExecutionAction =
  | "started_work"
  | "updated_progress"
  | "blocked"
  | "review_requested"
  | "approved"
  | "completed";

export type WorkflowStatus = "running" | "completed" | "blocked" | "paused";

export type GovernanceProfile = "strict" | "standard" | "autonomous";
export type WorkflowMode = "manual" | "semi_autonomous" | "autonomous";
export type GovernanceStatus =
  | "normal"
  | "waiting_for_approval"
  | "waiting_for_revision"
  | "escalated";

export type ApprovalType =
  | "strategic_objective"
  | "requirements"
  | "architecture"
  | "milestones"
  | "task_plan"
  | "execution_readiness"
  | "release"
  | "document"
  | "decision"
  | "security"
  | "infrastructure"
  | "database_change";

export type SessionStatus =
  | "pending_ceo"
  | "pending_founder"
  | "pending_coo"
  | "planning"
  | "execution_releasing"
  | "running"
  | "executing"
  | "waiting_approval"
  | "blocked"
  | "stalled"
  | "recovery"
  | "needs_founder_review"
  | "waiting_for_ai_capacity"
  | "completed"
  | "failed"
  | "cancelled";

export type SessionType =
  | "founder_objective"
  | "product_development"
  | "bug_fix"
  | "incident"
  | "research"
  | "sales"
  | "marketing"
  | "operations"
  | "duty"
  | "automation"
  | "customer_request"
  | "documentation_only"
  | "planning"
  | "architecture"
  | "development"
  | "deployment"
  | "production_fix";

export type SessionCloseRequestStatus =
  | "pending_ceo"
  | "pending_coo"
  | "pending_founder"
  | "approved"
  | "rejected";

export type SessionCloseRequest = {
  id: string;
  workflowRunId: string;
  reason: string;
  recommendation: string;
  status: SessionCloseRequestStatus;
  requestedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type ApprovalMode = "manual" | "auto" | "conditional" | "escalated";

export type WorkflowApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "revision_required"
  | "auto_approved"
  | "escalated";

export type TimelineSeverity = "info" | "low" | "medium" | "high" | "critical";

export type WorkflowStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked"
  | "skipped";

export type ApprovalStatus = "none" | "pending" | "approved" | "rejected";

export type AgentMemoryType =
  | "task"
  | "decision"
  | "lesson"
  | "knowledge"
  | "performance"
  | "project";

export interface SAIUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  title: string;
  department: string;
}

export interface HealthMetric {
  id: string;
  label: string;
  status: HealthStatus;
  score: number;
  explanation: string;
}

export interface CompanyOverview {
  activeProjects: number;
  employeesOnline: number;
  totalEmployees: number;
  aiAgentsActive: number;
  totalAgents: number;
  tasksInProgress: number;
  releases: number;
  openIssues: number;
  currentObjectives: string[];
  organizationHealthScore: number;
}

export type MemoryType =
  | "product"
  | "engineering"
  | "customer"
  | "decision"
  | "business"
  | "process"
  | "research"
  | "release"
  | "meeting"
  | "sales"
  | "risk"
  | "security"
  | "operations"
  | "finance"
  | "legal"
  | "support"
  | "incident"
  | "compliance"
  | "training";

export interface CompanyMemory {
  id: string;
  title: string;
  content: string;
  type: MemoryType;
  projectId: string | null;
  projectName?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ReleaseStatus = "planned" | "ready" | "released" | "rolled_back";

export interface Release {
  id: string;
  projectId: string;
  projectName?: string | null;
  version: string;
  title: string;
  description: string;
  status: ReleaseStatus;
  releaseDate: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientType: NotificationRecipientType;
  recipientId: string | null;
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityFeedEntry {
  id: string;
  actor: string;
  action: string;
  targetType: string;
  targetId: string | null;
  description: string;
  createdAt: string;
}

export interface TaskExecutionLog {
  id: string;
  taskId: string;
  actor: string;
  action: TaskExecutionAction;
  notes: string;
  createdAt: string;
}

export interface Deliverable {
  id: string;
  workflowId: string | null;
  projectId: string;
  projectName?: string | null;
  taskId: string | null;
  title: string;
  type: DeliverableType;
  status: DeliverableStatus;
  owner: string;
  content: string;
  version: number;
  createdAt: string;
}

export interface EntityDiscussion {
  id: string;
  entityType: DiscussionEntityType;
  entityId: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Review {
  id: string;
  entityType: string;
  entityId: string;
  reviewer: string;
  status: ReviewStatus;
  comments: string;
  createdAt: string;
}

export interface AgentWorkload {
  agentId: string;
  agentName: string;
  tasksCount: number;
  reviewsCount: number;
  approvalsCount: number;
  deliverablesCount: number;
  utilization: number;
  capacityStatus: AgentCapacityStatus;
}

export type BlockedTaskDetail = {
  taskId: string;
  taskName: string;
  ownerAgent: string | null;
  blockReason: string;
  dependency: string | null;
  waitingOn: string | null;
  recommendedAction: string;
  workflowRunId: string | null;
  workflowStepKey: string | null;
  status: string;
};

export interface ExecutionBoardData {
  activeWorkflows: number;
  activeTasks: number;
  blockedTasks: number;
  reviewsPending: number;
  approvalsPending: number;
  deliverablesPending: number;
  escalations: number;
  releasesReady: number;
  workflows: { id: string; name: string; objective: string; projectName: string | null }[];
  blockedTaskList: Task[];
  blockedTaskDetails: BlockedTaskDetail[];
  pendingReviews: Review[];
  pendingApprovals: WorkflowApproval[];
  pendingDeliverables: Deliverable[];
  readyReleases: Release[];
}

export interface ReleaseReadiness {
  score: number;
  tasksComplete: number;
  tasksTotal: number;
  deliverablesApproved: number;
  deliverablesTotal: number;
  reviewsPassed: number;
  reviewsTotal: number;
  approvalsCompleted: number;
  approvalsTotal: number;
  risksClosed: number;
  risksTotal: number;
}

export interface AgentWorkspace {
  agent: Agent;
  assignedTasks: Task[];
  pendingApprovals: WorkflowApproval[];
  documentsCreated: Document[];
  memoriesCreated: AgentMemory[];
  openDiscussions: EntityDiscussion[];
  runtimeSessions: AgentRuntimeSession[];
  conversations: AgentConversation[];
  handoffs: AgentHandoff[];
  sessionHandoffs: SessionHandoff[];
  aiConfig: AgentAIConfig | null;
  workload: AgentWorkload;
  metrics: AgentMetrics | null;
  recentActivity: ActivityFeedEntry[];
  workQueue: {
    backlog: Task[];
    inProgress: Task[];
    blocked: Task[];
    review: Task[];
    completed: Task[];
    dueSoon: Task[];
    overdue: Task[];
  };
  knowledge: {
    memories: AgentMemory[];
    decisions: Decision[];
    documents: Document[];
    workflowContributions: number;
    approvalHistory: WorkflowApproval[];
  };
}

export interface ExecutionMetrics {
  unreadNotifications: number;
  pendingReviews: number;
  deliverablesInProgress: number;
  agentUtilization: number;
  executionVelocity: number;
  workloadDistribution: AgentWorkload[];
  reviewQueue: Review[];
  inboxActivity: Notification[];
}

export type AIProviderName =
  | "openai"
  | "azure_openai"
  | "anthropic"
  | "google_gemini"
  | "mistral"
  | "nvidia_nim"
  | "huggingface"
  | "openrouter"
  | "ollama"
  | "lm_studio";

export type AIModelMode = "single" | "per_agent";

export type RuntimeSessionStatus =
  | "PENDING"
  | "RUNNING"
  | "WAITING"
  | "COMPLETED"
  | "FAILED"
  | "PAUSED"
  | "TERMINATED";

export type OrchestrationStatus =
  | "PENDING"
  | "RUNNING"
  | "WAITING"
  | "COMPLETED"
  | "FAILED"
  | "PAUSED";

export type AgentMessageType =
  | "question"
  | "handoff"
  | "update"
  | "review"
  | "challenge"
  | "request";

export type ReasoningLevel = "minimal" | "standard" | "deep";

export interface AIProvider {
  id: string;
  providerName: AIProviderName;
  hasApiKey: boolean;
  keyReadable: boolean;
  endpoint: string;
  model: string;
  enabled: boolean;
  defaultProvider: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AIExecutionMode = "free" | "paid";

export interface CompanyAISettings {
  id: string;
  modelMode: AIModelMode;
  executionMode?: AIExecutionMode;
  defaultProviderId: string | null;
  defaultProviderName?: string | null;
  fallbackProviderId?: string | null;
  fallbackProviderName?: string | null;
  updatedAt: string;
}

export type FounderChatActionType =
  | "retry_step"
  | "resume_session"
  | "reconcile_state"
  | "force_finalize"
  | "assign_agent"
  | "pause_session"
  | "close_session"
  | "escalate_coo"
  | "escalate_ceo";

export type FounderChatActionStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "executed"
  | "failed";

export type AIInfrastructureStatus = {
  executionMode: AIExecutionMode;
  provider: string | null;
  model: string | null;
  queueStatus: "idle" | "queued" | "waiting" | "processing" | "template_fallback";
  queueMessage: string | null;
  retryCount: number;
  templateUsage: number;
  providerHealth: string;
  nextAttemptAt: string | null;
};

export type AIReliabilityStatus = {
  provider: string;
  providerLabel: string;
  successRate: number;
  retries: number;
  fallbackUsage: number;
  templateMode: number;
  totalExecutions: number;
  operationalAlert: boolean;
};

export interface AgentAIConfig {
  agentId: string;
  providerId: string | null;
  model: string | null;
  temperature: number;
  systemPrompt: string;
  maxTokens: number;
  reasoningLevel: ReasoningLevel;
  toolsEnabled: string[];
  enabled: boolean;
  updatedAt: string;
}

export interface AgentRuntimeSession {
  id: string;
  agentId: string;
  agentName?: string | null;
  workflowId: string | null;
  taskId: string | null;
  status: RuntimeSessionStatus;
  modelProvider: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  reasoning: string;
  output: string;
  errorMessage: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AgentConversation {
  id: string;
  workflowId: string;
  senderAgentId: string | null;
  senderAgentName?: string | null;
  receiverAgentId: string | null;
  receiverAgentName?: string | null;
  message: string;
  messageType: AgentMessageType;
  createdAt: string;
}

export interface OrchestrationRun {
  id: string;
  workflowId: string;
  status: OrchestrationStatus;
  currentAgentId: string | null;
  currentAgentName?: string | null;
  currentStepKey: string | null;
  executionMode: WorkflowMode;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AgentHandoff {
  id: string;
  workflowId: string;
  fromAgentId: string | null;
  toAgentId: string | null;
  stepKey: string;
  objective: string;
  requirements: string;
  deliverables: string;
  decisions: string;
  openRisks: string;
  pendingQuestions: string;
  approvalStatus: string;
  createdAt: string;
}

export interface SessionHandoff {
  id: string;
  workflowRunId: string;
  artifactId: string | null;
  artifactName: string | null;
  completedByAgentId: string | null;
  assignedToAgentId: string | null;
  assignedByAgentId: string | null;
  fromStepKey: string | null;
  toStepKey: string | null;
  reason: string;
  status: "pending" | "accepted" | "completed" | "rejected";
  createdAt: string;
}

export interface SessionEscalation {
  id: string;
  workflowRunId: string;
  issue: string;
  owner: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "resolved" | "dismissed";
  createdByAgentId: string | null;
  createdAt: string;
}

export interface AIUsageRecord {
  id: string;
  provider: string;
  model: string;
  agent: string;
  agentId: string | null;
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  workflowId: string | null;
  sessionId: string | null;
  createdAt: string;
}

export interface AIUsageStats {
  dailyCost: number;
  monthlyCost: number;
  costByAgent: { agent: string; cost: number; tokens: number }[];
  costByProject: { projectId: string; projectName: string; cost: number }[];
  costByProvider: { provider: string; cost: number; tokens: number }[];
  totalTokens: number;
}

export interface ConnectionTestResult {
  connected: boolean;
  latencyMs: number;
  model: string;
  provider?: string;
  providerLabel?: string;
  responsePreview: string;
  promptLength?: number;
  estimatedInputTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  timeoutMs?: number;
  error?: string;
}

export interface AIOperationsMetrics {
  connectedProviders: number;
  runningAgents: number;
  activeSessions: number;
  failedExecutions: number;
  dailyCost: number;
  monthlyCost: number;
  conversationCount: number;
  mostActiveAgent: string | null;
  modelUsage: { model: string; count: number }[];
  providers: AIProvider[];
  recentSessions: AgentRuntimeSession[];
  recentConversations: AgentConversation[];
}

export interface DashboardMetrics {
  overview: CompanyOverview;
  healthMetrics: HealthMetric[];
  brainStats: {
    dataPoints: number;
    memories: number;
  };
  recentActivity: ActivityLog[];
  activityFeed: ActivityFeedEntry[];
  operations: OperationsMetrics;
  governance: GovernanceMetrics;
  execution: ExecutionMetrics;
  aiOperations: AIOperationsMetrics;
}

export interface OperationsMetrics {
  activeWorkflows: number;
  workflowCompletionRate: number;
  generatedTasks: number;
  generatedRequirements: number;
  generatedDocuments: number;
  decisionsRecorded: number;
  knowledgeEntries: number;
  agentMemoryCount: number;
  searchIndexSize: number;
  blockedWorkflows: number;
}

export interface GovernanceMetrics {
  pendingApprovals: number;
  approvedToday: number;
  autoApprovedToday: number;
  escalationsToday: number;
  blockedWorkflows: number;
  waitingForFounder: number;
  waitingForRevision: number;
  averageApprovalHours: number;
  governanceHealth: number;
  workflowHealth: number;
  riskExposure: number;
}

export interface WorkflowEvent {
  id: string;
  workflowId: string;
  eventType: string;
  actor: string;
  title: string;
  description: string;
  createdAt: string;
}

export type TaskAssignmentRole = "owner" | "contributor" | "reviewer" | "approver";

export interface TaskAssignment {
  id: string;
  taskId: string;
  agentId: string | null;
  agentName?: string | null;
  groupId: string | null;
  groupName?: string | null;
  role: TaskAssignmentRole;
  assignedAt: string;
}

export type DocumentType =
  | "requirement"
  | "architecture"
  | "design"
  | "technical_spec"
  | "implementation_guide"
  | "test_plan"
  | "release_note"
  | "meeting_note"
  | "sop";

export interface Document {
  id: string;
  workflowId: string | null;
  projectId: string;
  projectName?: string | null;
  createdBy: string;
  title: string;
  type: DocumentType;
  content: string;
  version: number;
  createdAt: string;
}

export interface Decision {
  id: string;
  workflowId: string | null;
  projectId: string;
  projectName?: string | null;
  title: string;
  decision: string;
  rationale: string;
  alternativesConsidered: string;
  createdBy: string;
  createdAt: string;
}

export interface AgentGroup {
  id: string;
  name: string;
  department: string;
  description: string;
  memberCount: number;
  memberNames: string[];
  createdAt: string;
}

export interface WorkflowAgentMemory {
  id: string;
  agentId: string;
  agentName: string | null;
  memoryType: string;
  title: string;
  content: string;
  workflowId: string | null;
  projectId: string | null;
  createdAt: string;
}

export interface WorkflowDetail {
  workflow: WorkflowRun;
  progress: number;
  activeAgent: string | null;
  healthScore: number;
  events: WorkflowEvent[];
  requirements: Document[];
  architecture: Document[];
  milestones: Document[];
  tasks: Task[];
  assignments: TaskAssignment[];
  documents: Document[];
  decisions: Decision[];
  memories: CompanyMemory[];
  agentMemories: WorkflowAgentMemory[];
}

export interface KnowledgeSearchResult {
  id: string;
  category: string;
  title: string;
  snippet: string;
  type: string;
  createdAt: string;
}

/** @deprecated Use Agent for full agent factory model */
export interface AIAgent {
  id: string;
  name: string;
  role: string;
  responsibilities: string[];
  status: "active" | "idle" | "busy";
  assignedProjects: number;
  performanceScore: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  status: "online" | "offline" | "busy";
  currentWork: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  department: string;
  description: string;
  responsibilities: string[];
  skills: string[];
  toolsAccess: string[];
  objectives: string[];
  projectIds: string[];
  reportingAgentId?: string | null;
  reportingAgentName?: string | null;
  priorityLevel: PriorityLevel;
  memoryEnabled: boolean;
  approvalRequired: boolean;
  status: AgentStatus;
  capacityStatus?: AgentCapacityStatus;
  performanceScore: number;
  authorityLevel?: number;
  assignedProjects: number;
  activeTaskCount?: number;
  metrics?: AgentScores;
  clonedFromId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentScores {
  productivityScore: number;
  qualityScore: number;
  approvalSuccessRate: number;
  knowledgeContribution: number;
  decisionContribution: number;
  workflowContribution: number;
  overallScore: number;
}

export interface AgentMetrics {
  agentId: string;
  agentName: string | null;
  agentRole: string | null;
  authorityLevel: number;
  tasksAssigned: number;
  tasksCompleted: number;
  approvalsRequested: number;
  approvalsPassed: number;
  approvalsRejected: number;
  autoApprovedActions: number;
  escalatedActions: number;
  documentsCreated: number;
  memoriesCreated: number;
  decisionsCreated: number;
  workflowsContributed: number;
  lastActive: string | null;
  updatedAt: string;
  scores: AgentScores;
}

export interface AgentMemory {
  id: string;
  agentId: string;
  memoryType: AgentMemoryType;
  title: string;
  summary: string;
  content?: string;
  projectId: string | null;
  taskId: string | null;
  workflowId?: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  objective: string;
  status: "on_track" | "at_risk" | "delayed" | "completed";
  progress: number;
  /** @deprecated Use projectLeadName */
  lead: string;
  businessOwner: string;
  projectLeadAgentId: string | null;
  projectLeadEmployeeId: string | null;
  projectLeadName: string | null;
  healthScore: number;
  tasksTotal: number;
  tasksCompleted: number;
  governanceProfile?: GovernanceProfile;
  workflowMode?: WorkflowMode;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectObjective {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "pending_ceo" | "pending_founder" | "active" | "completed" | "cancelled";
  workflowRunId: string | null;
  strategicBrief: Record<string, unknown>;
  createdAt: string;
  completedAt: string | null;
}

export interface ProjectTimelineEvent {
  id: string;
  projectId: string;
  eventType: string;
  title: string;
  description: string;
  actorName: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ProjectMemoryEntry {
  id: string;
  projectId: string;
  memoryType:
    | "requirement"
    | "decision"
    | "customer"
    | "technical"
    | "feature"
    | "lesson"
    | "release"
    | "architecture"
    | "knowledge";
  title: string;
  summary: string;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
}

export interface ProjectDeliverable {
  id: string;
  projectId: string;
  workflowRunId: string | null;
  workflowStepKey: string | null;
  deliverableType: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface ProjectApproval {
  id: string;
  projectId: string;
  taskId: string | null;
  workflowRunId: string | null;
  approvalType: "architecture" | "qa" | "release" | "documentation" | "general";
  status: "pending" | "approved" | "rejected";
  approverName: string;
  notes: string;
  createdAt: string;
  decidedAt: string | null;
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  projectId: string;
  actorType: "owner" | "employee" | "agent" | "system";
  actorId: string | null;
  actorName: string;
  action: string;
  notes: string;
  outcome: string;
  createdAt: string;
}

export type ProjectExecutiveSummary = {
  currentSessionId: string | null;
  currentSessionNumber: number | null;
  currentAgentName: string | null;
  nextAgentName: string | null;
  currentDeliverable: string | null;
  currentArtifact: string | null;
  executionHealth: number;
  strategicHealth: number;
  openRisks: number;
  pendingApprovals: number;
  executiveSponsorName: string | null;
  sessionOwnerName: string | null;
  recentArtifacts: { id: string; name: string; stepKey: string; createdAt: string }[];
  recentDecisions: { id: string; title: string; createdAt: string }[];
  resourcesCount: number;
};

export interface ProjectDashboard {
  project: Project;
  objectives: ProjectObjective[];
  tasks: Task[];
  workflows: WorkflowRun[];
  timeline: ProjectTimelineEvent[];
  memory: ProjectMemoryEntry[];
  deliverables: ProjectDeliverable[];
  approvals: ProjectApproval[];
  executive: ProjectExecutiveSummary | null;
  metrics: {
    activeTasks: number;
    blockedTasks: number;
    pendingApprovals: number;
    activeWorkflows: number;
  };
}

export interface Task {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  description: string;
  priority: PriorityLevel;
  dependencies: string[];
  acceptanceCriteria: string[];
  objectiveId: string | null;
  featureId: string | null;
  assignedAgentId: string | null;
  assignedAgentName?: string | null;
  assignedEmployeeId: string | null;
  assignedEmployeeName?: string | null;
  status: TaskStage;
  progressPercentage: number;
  evidence: string;
  comments: string[];
  attachments: string[];
  knowledgeGenerated: string;
  approvalStatus: ApprovalStatus;
  workflowRunId: string | null;
  workflowStepKey: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunStep {
  id: string;
  workflowRunId: string;
  stepKey: string;
  stepLabel: string;
  stepOrder: number;
  assignedAgentId: string | null;
  assignedAgentName?: string | null;
  status: WorkflowStepStatus;
  output: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface WorkflowRun {
  id: string;
  projectId: string;
  projectName?: string;
  name: string;
  objective: string;
  owner: string;
  status: WorkflowStatus;
  workflowMode?: WorkflowMode;
  governanceStatus?: GovernanceStatus;
  currentStepIndex: number;
  sessionNumber: number | null;
  executiveSponsorAgentId: string | null;
  sessionOwnerAgentId: string | null;
  executiveSponsorName?: string | null;
  sessionOwnerName?: string | null;
  currentStage: string | null;
  sessionStatus: SessionStatus;
  currentAgentId?: string | null;
  currentAgentName?: string | null;
  nextAgentId?: string | null;
  nextAgentName?: string | null;
  currentArtifactId?: string | null;
  currentArtifact?: string | null;
  currentDeliverable?: string | null;
  workflowStage?: string | null;
  executionHealth?: number | null;
  strategicHealth?: number | null;
  executionReleasedAt?: string | null;
  strategicBrief: Record<string, unknown>;
  steps: WorkflowRunStep[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface SessionArtifactView {
  id: string;
  stepKey: string;
  turnNumber: number;
  agentName?: string;
  artifactName: string | null;
  outputSummary: string;
  createdAt: string;
}

export interface ExecutionCenterSession {
  workflow: WorkflowRun;
  orchestrationStatus: string | null;
  progressPercent: number;
  tasksComplete: number;
  tasksTotal: number;
  pendingApprovals: number;
  openRisks: number;
  currentAgentName: string | null;
  nextAgentName: string | null;
  timeline: SessionArtifactView[];
  agentFeed: import("./agent-feed").AgentFeedItem[];
}

export interface ExecutionCenterData {
  engineStatus: {
    orchestrator: string;
    workflowEngine: string;
    sessionManager: string;
    contextEngine: string;
  };
  activeSessions: ExecutionCenterSession[];
  completedSessions: ExecutionCenterSession[];
  failedSessions: ExecutionCenterSession[];
  archivedSessions: ExecutionCenterSession[];
  stats: {
    activeWorkflows: number;
    completedWorkflows: number;
    failedWorkflows: number;
    blockedTasks: number;
    approvalsPending: number;
  };
}

export interface IntegrationAccount {
  id: string;
  provider: "github" | "google_drive";
  accountLabel: string;
  accountIdentifier: string;
  status: string;
  scopes: string[];
  createdAt: string;
}

export interface ApprovalPolicy {
  id: string;
  name: string;
  approvalType: ApprovalType;
  mode: ApprovalMode;
  approverRole: string;
  conditions: Record<string, unknown>;
  active: boolean;
  createdAt: string;
}

export interface WorkflowApproval {
  id: string;
  workflowId: string | null;
  workflowStepId: string | null;
  projectId: string;
  projectName?: string | null;
  workflowObjective?: string | null;
  approvalType: ApprovalType;
  approvalMode: ApprovalMode;
  title: string;
  description: string;
  status: WorkflowApprovalStatus;
  priority: "low" | "medium" | "high" | "critical";
  requestedBy: string;
  approvedBy: string | null;
  requestedAt: string;
  approvedAt: string | null;
  comments: string;
  artifactContent: string;
}

export interface ApprovalComment {
  id: string;
  approvalId: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface WorkflowDiscussion {
  id: string;
  workflowId: string;
  author: string;
  authorType: "founder" | "agent" | "employee";
  content: string;
  createdAt: string;
}

export interface CompanyTimelineEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  projectId: string | null;
  workflowId: string | null;
  title: string;
  description: string;
  actor: string;
  severity: TimelineSeverity;
  createdAt: string;
}

export interface WorkflowHealth {
  score: number;
  taskCompletion: number;
  pendingReviews: number;
  blockedItems: number;
  escalations: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  timelineProgress: number;
}

export interface ControlPanelStats {
  totalAgents: number;
  activeAgents: number;
  disabledAgents: number;
  totalTasks: number;
  blockedTasks: number;
  inProgressTasks: number;
  pendingApprovals: number;
  activeWorkflows: number;
  blockedWorkflows: number;
  workflowCompletionRate: number;
  generatedDocuments: number;
  decisionsRecorded: number;
  autoApprovedToday: number;
  escalationsToday: number;
  waitingForFounder: number;
  waitingForRevision: number;
  governanceHealth: number;
}

export type AgentHandlingStatus = "running" | "waiting" | "review" | "completed" | "idle";

export type OrganizationSection =
  | "agent-center"
  | "active-sessions"
  | "agent-workspaces"
  | "departments"
  | "employees"
  | "capacity"
  | "structure";

export type SessionCenterSection =
  | "dashboard"
  | "registry-all"
  | "registry-active"
  | "registry-scheduled"
  | "registry-approval"
  | "registry-completed"
  | "registry-archived"
  | "registry-cancelled"
  | "templates"
  | "duties"
  | "automation"
  | "agents"
  | "intelligence"
  | "analytics"
  | "settings";

export type SessionCreationMode = "instant" | "scheduled" | "recurring" | "triggered" | "duty" | "automation";

export type SessionLifecycleStage =
  | "draft"
  | "planning"
  | "ready"
  | "executing"
  | "review"
  | "approval"
  | "knowledge_capture"
  | "completed"
  | "archived"
  | "cancelled";

export interface SessionTemplateDefinition {
  id: string;
  label: string;
  description: string;
  sessionType: SessionType;
  defaultPriority: PriorityLevel;
  suggestedAgents: string[];
}

export interface SessionDutyDefinition {
  id: string;
  agentRole: string;
  title: string;
  cadence: string;
  nextRun: string | null;
  status: "active" | "paused" | "pending";
  sessionTemplateId: string;
}

export interface SessionAutomationRule {
  id: string;
  label: string;
  type: "schedule" | "event" | "agent";
  trigger: string;
  action: string;
  status: "active" | "paused" | "draft";
  lastTriggered: string | null;
}

export interface SessionCenterDashboardMetrics {
  activeSessions: number;
  awaitingApproval: number;
  blockedSessions: number;
  overdueSessions: number;
  completedThisWeek: number;
  scheduledSessions: number;
  automationActive: number;
  knowledgeCaptured: number;
  executionHealth: number;
  completionRate: number;
  agentActivityToday: number;
}

export interface AgentLiveSession {
  sessionId: string | null;
  sessionNumber: number | null;
  projectId: string | null;
  projectName: string | null;
  objective: string | null;
  currentStage: string | null;
  workflowStage: string | null;
  handlingStatus: AgentHandlingStatus;
  currentStep: string | null;
  nextStep: string | null;
  progressPercent: number;
  healthScore: number | null;
  cooReviewPending: number;
  cooReviewLabel: string | null;
}

export interface OrganizationAgentRow {
  agent: Agent;
  liveSession: AgentLiveSession;
  workload: AgentWorkload;
  metrics: AgentMetrics | null;
  aiHealth: HealthStatus;
}

export interface OrganizationDepartmentSnapshot {
  name: string;
  agentCount: number;
  employeeCount: number;
  activeSessions: number;
  assignedAgents: number;
  healthScore: number;
  healthStatus: HealthStatus;
}

export interface OrganizationActionItem {
  id: string;
  type: "session" | "approval" | "handoff" | "decision" | "completion" | "activity";
  title: string;
  description: string;
  sessionId: string | null;
  sessionNumber: number | null;
  projectName: string | null;
  agentName: string | null;
  status: string;
  timestamp: string;
  href: string | null;
}

export interface OrganizationSessionWorkspace {
  id: string;
  sessionNumber: number | null;
  projectName: string;
  objective: string;
  bucket: string;
  sessionStatus: string;
  executionHealth: number;
  currentAgentName: string | null;
  href: string;
}

export interface OrganizationHeadquartersData {
  dashboard: {
    totalAgents: number;
    activeAgents: number;
    idleAgents: number;
    assignedAgents: number;
    departmentCoverage: number;
    aiHealthScore: number;
    activeSessions: number;
  };
  agents: OrganizationAgentRow[];
  departments: OrganizationDepartmentSnapshot[];
  activeSessions: ExecutionCenterSession[];
  sessionWorkspaces: OrganizationSessionWorkspace[];
  actionCenter: OrganizationActionItem[];
  employees: Employee[];
  projects: Project[];
  founderName: string;
}

/** @deprecated Use CompanyMemory */
export interface MemoryRecord {
  id: string;
  type: MemoryType;
  title: string;
  summary: string;
  date: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
