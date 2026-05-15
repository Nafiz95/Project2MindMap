export type TreeNode = {
  id: string;
  title: string;
  category: string;
  status: string;
  importance: string;
  parent_id: string | null;
  child_ids: string[];
  summary?: string | null;
};

export type TreePayload = {
  project_id: string;
  root_id: string | null;
  root_ids?: string[];
  nodes: TreeNode[];
};

export type NodeSummary = {
  id: string;
  title: string;
  category: string;
  status: string;
  importance: string;
  summary?: string | null;
};

export type DetailBlock = {
  id: string;
  node_id: string;
  block_type: string;
  title: string;
  content: string;
  sort_order: number;
};

export type NodeDetail = {
  node: TreeNode & {
    project_id: string;
    slug: string;
    description?: string | null;
  };
  detail_blocks: DetailBlock[];
  tags: string[];
  aliases: string[];
  sources: Array<{ id: string; source_type: string; title: string; path_or_url?: string | null }>;
  attachments: Array<{ id: string; filename: string; path: string; description?: string | null }>;
  related_edges: Array<{
    id: string;
    source_node_id: string;
    target_node_id: string;
    relation_type: string;
    description?: string | null;
    strength: string;
  }>;
  related_nodes: TreeNode[];
  claims?: WikiItem[];
  tasks?: WikiItem[];
  open_questions?: WikiItem[];
  lint_findings?: WikiItem[];
};

export type WikiItem = {
  id: string;
  title: string;
  description?: string | null;
  related_page_id?: string | null;
  related_page_title?: string | null;
  status?: string | null;
  priority?: string | null;
  severity?: string | null;
  finding_type?: string | null;
  claim_type?: string | null;
  confidence?: number | null;
};

export type NodeCandidate = {
  id: string;
  proposed_node_id: string;
  matched_existing_node_id: string | null;
  action: "create" | "update" | "append";
  review_status: "pending" | "approved" | "rejected" | "needs-review";
  title: string;
  category: string;
  summary?: string | null;
  status: string;
  importance: string;
};

export type EdgeCandidate = {
  id: string;
  source: string;
  target: string;
  matched_source_node_id: string | null;
  matched_target_node_id: string | null;
  relation_type: string;
  strength: string;
  review_status: "pending" | "approved" | "rejected" | "needs-review";
  description?: string | null;
};

export type DetailCandidate = {
  id: string;
  node_candidate_id: string | null;
  matched_existing_node_id: string | null;
  block_type: string;
  title: string;
  content?: string | null;
  review_status: "pending" | "approved" | "rejected" | "needs-review";
};

export type CandidateGroup = {
  job_id: string;
  node_candidates: NodeCandidate[];
  edge_candidates: EdgeCandidate[];
  detail_candidates: DetailCandidate[];
  blocking_errors: string[];
};

export type ActivityEvent = {
  when: string;
  kind: "node" | "edge" | "detail";
  verb: "created" | "updated";
  id: string;
  title: string;
  category?: string | null;
  note?: string | null;
};

export type IngestionJobSummary = {
  job_id: string;
  status: string;
  source_title?: string | null;
  source_type?: string | null;
  created_at?: string | null;
  candidate_counts: Record<string, number>;
};

export type GraphPayload = {
  project_id: string;
  nodes: Array<NodeSummary & { parent_id?: string | null }>;
  edges: Array<{
    id: string;
    project_id: string;
    source_node_id: string;
    target_node_id: string;
    relation_type: string;
    description?: string | null;
    strength: string;
  }>;
};

export type DashboardPayload = {
  counts: Record<string, number>;
  active_experiments: NodeSummary[];
  open_questions: NodeSummary[];
  writing_and_grants: NodeSummary[];
  recent_nodes: NodeSummary[];
  wiki_dashboard?: {
    counts: Record<string, number>;
    tasks: WikiItem[];
    open_questions: WikiItem[];
    lint_findings: WikiItem[];
    claims: WikiItem[];
  } | null;
};

export type MetadataPayload = {
  app: string;
  runtime_store: string;
  database_path: string;
  database_name: string;
  database_exists: boolean;
  database_size_bytes: number;
  is_populated: boolean;
  database_profile: string;
  active_database_profile: string;
  server_started_at: string;
  code_profile_version: string;
  api_prefix: string;
  frontend_served_by_backend: boolean;
  frontend_dist_path: string;
  frontend_index_exists: boolean;
  project_count: number;
  node_count: number;
  edge_count: number;
  page_count: number;
  link_count: number;
  claim_count: number;
  task_count: number;
  question_count: number;
  lint_count: number;
  database_status: string;
  available_databases: Array<{
    name: string;
    path: string;
    size_bytes: number;
    active: boolean;
    is_populated: boolean;
    database_profile: string;
    project_count: number;
    node_count: number;
    edge_count: number;
    page_count: number;
    link_count: number;
    claim_count: number;
    task_count: number;
    question_count: number;
    lint_count: number;
    status: string;
  }>;
  schema_sql_path: string;
  schema_sql_exists: boolean;
  active_project_id: string | null;
  notes: string[];
};
