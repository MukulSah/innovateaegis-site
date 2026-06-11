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
  | "requirements"
  | "architecture"
  | "milestones"
  | "task_plan"
  | "release"
  | "document"
  | "decision"
  | "security"
  | "infrastructure"
  | "database_change";

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
  endpoint: string;
  model: string;
  enabled: boolean;
  defaultProvider: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyAISettings {
  id: string;
  modelMode: AIModelMode;
  defaultProviderId: string | null;
  defaultProviderName?: string | null;
  updatedAt: string;
}

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
  responsePreview: string;
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
  status: "active" | "completed" | "cancelled";
  workflowRunId: string | null;
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

export interface ProjectDashboard {
  project: Project;
  objectives: ProjectObjective[];
  tasks: Task[];
  workflows: WorkflowRun[];
  timeline: ProjectTimelineEvent[];
  memory: ProjectMemoryEntry[];
  deliverables: ProjectDeliverable[];
  approvals: ProjectApproval[];
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
  steps: WorkflowRunStep[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
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
  workflowId: string;
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
