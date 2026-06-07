export type IntegrationProvider =
  | "github"
  | "gitlab"
  | "jira"
  | "notion"
  | "slack"
  | "microsoft_teams"
  | "google_workspace"
  | "discord"
  | "email"
  | "calendar"
  | "video_meetings";

export interface IntegrationDefinition {
  provider: IntegrationProvider;
  name: string;
  description: string;
  status: "planned" | "available";
  capabilities: string[];
}

export const INTEGRATION_CATALOG: IntegrationDefinition[] = [
  {
    provider: "github",
    name: "GitHub",
    description: "Sync repositories, pull requests, commits, and releases.",
    status: "planned",
    capabilities: ["repos", "prs", "commits", "releases", "issues"],
  },
  {
    provider: "gitlab",
    name: "GitLab",
    description: "Import GitLab projects, merge requests, and CI pipelines.",
    status: "planned",
    capabilities: ["repos", "merge_requests", "pipelines"],
  },
  {
    provider: "jira",
    name: "Jira",
    description: "Import epics, stories, and sprint data into SAI execution engine.",
    status: "planned",
    capabilities: ["import", "sync", "sprints"],
  },
  {
    provider: "notion",
    name: "Notion",
    description: "Sync documentation and knowledge base pages.",
    status: "planned",
    capabilities: ["docs", "knowledge"],
  },
  {
    provider: "slack",
    name: "Slack",
    description: "Notifications, Ask SAI commands, and activity feeds.",
    status: "planned",
    capabilities: ["notifications", "commands", "alerts"],
  },
  {
    provider: "microsoft_teams",
    name: "Microsoft Teams",
    description: "Meeting sync, notifications, and team channels.",
    status: "planned",
    capabilities: ["meetings", "notifications"],
  },
  {
    provider: "google_workspace",
    name: "Google Workspace",
    description: "Calendar, email, and document integration.",
    status: "planned",
    capabilities: ["calendar", "email", "docs"],
  },
  {
    provider: "discord",
    name: "Discord",
    description: "Team notifications and bot commands.",
    status: "planned",
    capabilities: ["notifications", "commands"],
  },
  {
    provider: "email",
    name: "Email",
    description: "Inbound customer requests and outbound notifications.",
    status: "planned",
    capabilities: ["inbound", "outbound"],
  },
  {
    provider: "calendar",
    name: "Calendar",
    description: "Sync meetings and deadlines across the organization.",
    status: "planned",
    capabilities: ["meetings", "deadlines"],
  },
  {
    provider: "video_meetings",
    name: "Video Meetings",
    description: "Record meeting notes and action items automatically.",
    status: "planned",
    capabilities: ["recording", "transcription", "action_items"],
  },
];
