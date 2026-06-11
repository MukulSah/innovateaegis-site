export type FounderWorkspaceSection =
  | "vision"
  | "future_plans"
  | "ideas_vault"
  | "founder_decisions"
  | "strategic_notes"
  | "personal_objectives"
  | "business_opportunities"
  | "investment_notes"
  | "future_ventures"
  | "founder_preferences";

export const FOUNDER_SECTIONS: { id: FounderWorkspaceSection; label: string }[] = [
  { id: "vision", label: "Vision" },
  { id: "future_plans", label: "Future Plans" },
  { id: "ideas_vault", label: "Ideas Vault" },
  { id: "founder_decisions", label: "Founder Decisions" },
  { id: "strategic_notes", label: "Strategic Notes" },
  { id: "personal_objectives", label: "Personal Objectives" },
  { id: "business_opportunities", label: "Business Opportunities" },
  { id: "investment_notes", label: "Investment Notes" },
  { id: "future_ventures", label: "Future Ventures" },
  { id: "founder_preferences", label: "Founder Preferences" },
];

export type FounderWorkspaceViewTab =
  | "dashboard"
  | "discussions"
  | "meetings"
  | "intelligence"
  | "inbox"
  | "timeline";

export const FOUNDER_VIEW_TABS: { id: FounderWorkspaceViewTab; label: string }[] = [
  { id: "dashboard", label: "Command Dashboard" },
  { id: "discussions", label: "Discussion Center" },
  { id: "meetings", label: "Meeting Center" },
  { id: "intelligence", label: "Agent Intelligence" },
  { id: "inbox", label: "Founder Inbox" },
  { id: "timeline", label: "Activity Timeline" },
];

export type FounderWorkspaceItem = {
  id: string;
  section: FounderWorkspaceSection;
  title: string;
  content: string;
  tags: string[];
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type IntelligenceCard = {
  id: string;
  cardType: string;
  raisedBy: string;
  title: string;
  description: string;
  impact: string;
  status: string;
  confidence: number | null;
  createdAt: string;
  recommendation?: string;
  riskAssessment?: string;
  requiredInvestment?: string;
  timeline?: string;
  relatedData?: string;
};

export type FounderDiscussion = {
  id: string;
  topic: string;
  status: string;
  participantNames: string[];
  messageCount: number;
  relatedProjectIds: string[];
  objective?: string;
  context?: string;
  priority?: string;
  createdAt: string;
  updatedAt: string;
};

export type FounderMeeting = {
  id: string;
  topic: string;
  meetingType: string;
  scheduledAt: string | null;
  status: string;
  participantNames: string[];
  agenda: string;
  summary: string | null;
};

export type ExecutiveBriefingStat = {
  label: string;
  count: number;
};

export type ExecutiveBriefing = {
  greeting: string;
  companyStatusSummary: string;
  todaysFocus: string[];
  stats: ExecutiveBriefingStat[];
  recommendedActions?: string[];
  generatedBy?: string;
  generatedAt?: string;
};

export type ExecutiveAlert = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  sourceAgent: string;
  title: string;
  impact: string;
  requiredAction: string;
  createdAt: string;
};

export type HealthTrend = "up" | "down" | "stable";

export type HealthDimension = {
  key: string;
  label: string;
  score: number;
  trend: HealthTrend;
  contributors: string[];
  recommendedActions: string[];
};

export type CompanyHealthCenter = {
  dimensions: HealthDimension[];
  overallScore: number;
  overallTrend: HealthTrend;
};

export type FounderInboxItem = {
  id: string;
  category: string;
  title: string;
  message: string;
  severity: string;
  isRead: boolean;
  createdAt: string;
  entityType: string | null;
  entityId: string | null;
  href: string;
  label: string;
};

export type AgentIntelligenceSection = {
  agentId: string;
  agentName: string;
  agentRole: string;
  priorities: IntelligenceCard[];
  risks: IntelligenceCard[];
  opportunities: IntelligenceCard[];
  recommendations: IntelligenceCard[];
};

export type FounderActivityEntry = {
  id: string;
  date: string;
  type: string;
  title: string;
  participants: string[];
  summary: string;
  importance: string;
};

export type FounderDashboard = {
  briefing: ExecutiveBriefing;
  priorities: IntelligenceCard[];
  pendingDecisions: IntelligenceCard[];
  activeDiscussions: FounderDiscussion[];
  opportunities: IntelligenceCard[];
  upcomingMeetings: FounderMeeting[];
  recommendations: IntelligenceCard[];
  executiveAlerts: ExecutiveAlert[];
  companyHealth: CompanyHealthCenter;
};

export type FounderWorkspaceData = {
  founderName: string;
  dashboard: FounderDashboard;
  discussions: FounderDiscussion[];
  meetings: FounderMeeting[];
  inbox: FounderInboxItem[];
  timeline: FounderActivityEntry[];
  agentIntelligence: AgentIntelligenceSection[];
};
