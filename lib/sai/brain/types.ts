import type { SectionRecordMetadata, SectionRecordType } from "./section-schemas";

export type { SectionRecordMetadata, SectionRecordType };

export type MemoryRecordStatus = "active" | "archived" | "merged";
export type PermissionLevel = "public" | "department" | "selected_agents" | "founder_only";
export type RelationshipType =
  | "related_to"
  | "depends_on"
  | "decided_in"
  | "documented_in"
  | "assigned_to"
  | "belongs_to"
  | "blocks"
  | "references";

export type GranteeType = "agent_role" | "department" | "user";

/** @deprecated Use BrainLayer — domains table now stores locked layers only */
export type BrainDomain = BrainLayer;

export type BrainLayer = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  isSystem: boolean;
  isLocked: boolean;
  layerPurpose: string;
  recordCount?: number;
  sectionCount?: number;
  createdAt: string;
  updatedAt: string;
};

/** @deprecated Use BrainSection */
export type BrainCategory = BrainSection;

export type BrainSection = {
  id: string;
  layerId: string;
  /** @deprecated Use layerId */
  domainId: string;
  layerSlug?: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  custodianAgentRole: string;
  visibleTo: string[];
  recordCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type MemoryRecord = {
  id: string;
  title: string;
  description: string;
  content: string;
  recordType: SectionRecordType | null;
  metadata: SectionRecordMetadata | null;
  sectionFields: Record<string, string>;
  domainId: string;
  domainSlug?: string;
  domainName?: string;
  layerSlug?: string;
  layerName?: string;
  categoryId: string | null;
  categoryName?: string | null;
  sectionSlug?: string | null;
  parentId: string | null;
  ownerId: string | null;
  ownerAgentId: string | null;
  ownerAgentName: string;
  department: string;
  approvedBy: string;
  approvedById: string | null;
  effectiveDate: string | null;
  visibility: string;
  attachments: unknown[];
  createdBy: string | null;
  status: MemoryRecordStatus;
  version: number;
  permissionLevel: PermissionLevel;
  aiSummary: string | null;
  mergedIntoId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type MemoryRelationship = {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: RelationshipType;
  label: string | null;
  createdBy: string | null;
  createdAt: string;
  sourceTitle?: string;
  targetTitle?: string;
  sourceDomain?: string;
  targetDomain?: string;
};

export type MemoryPermission = {
  id: string;
  recordId: string;
  granteeType: GranteeType;
  grantee: string;
  canRead: boolean;
  canWrite: boolean;
  createdAt: string;
};

export type MemoryVersion = {
  id: string;
  recordId: string;
  versionNumber: number;
  title: string;
  description: string;
  content: string;
  changedBy: string | null;
  changeSummary: string | null;
  createdAt: string;
};

export type MemoryActivity = {
  id: string;
  recordId: string;
  actorId: string | null;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type AgentMemoryContainer = {
  id: string;
  agentRole: string;
  displayName: string;
  description: string;
  categoryId: string | null;
  domainId: string | null;
  recordCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type FounderMemory = {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  createdBy: string | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type BrainSearchResult = {
  id: string;
  title: string;
  domainSlug: string;
  domainName: string;
  summary: string;
  permissionLevel: PermissionLevel;
  tags: string[];
  relatedCount: number;
  updatedAt: string;
  score: number;
};

export type KnowledgeGraphNode = {
  id: string;
  title: string;
  domainSlug: string;
  domainName: string;
  level: number;
};

export type KnowledgeGraphEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: RelationshipType;
  label: string | null;
};

export type KnowledgeGraph = {
  centerId: string;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
};

export type MemoryContextPackage = {
  query: string;
  domainsSearched: string[];
  records: MemoryRecord[];
  relatedDecisions: MemoryRecord[];
  relatedMeetings: MemoryRecord[];
  relatedTasks: MemoryRecord[];
  relatedDocuments: MemoryRecord[];
  relatedAgentNotes: MemoryRecord[];
  relatedProducts: MemoryRecord[];
  relatedCustomers: MemoryRecord[];
  retrievedAt: string;
};

export type BrainStats = {
  totalRecords: number;
  activeRecords: number;
  archivedRecords: number;
  totalRelationships: number;
  totalDomains: number;
  totalCategories: number;
  agentContainers: number;
  founderMemories: number;
  retrievalCount: number;
};

export type RecordInput = {
  title?: string;
  description?: string;
  content?: string;
  sectionSlug?: string;
  sectionFields?: Record<string, string>;
  metadata?: SectionRecordMetadata;
  domainId: string;
  categoryId?: string | null;
  parentId?: string | null;
  ownerId?: string | null;
  ownerAgentId?: string | null;
  ownerAgentName?: string;
  department?: string;
  approvedBy?: string;
  approvedById?: string | null;
  effectiveDate?: string | null;
  visibility?: string;
  createdBy?: string | null;
  permissionLevel?: PermissionLevel;
  tags?: string[];
  aiSummary?: string | null;
};

export type DomainInput = {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
};

export type CategoryInput = {
  domainId: string;
  slug: string;
  name: string;
  description?: string;
  parentId?: string | null;
  sortOrder?: number;
};
