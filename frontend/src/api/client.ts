import type { ActivityEvent, GraphPayload, MetadataPayload, NodeDetail, TreeNode, TreePayload } from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function assertCompatibleMetadata(payload: MetadataPayload): MetadataPayload {
  if (!payload.database_profile || !payload.code_profile_version || payload.api_prefix !== "/api") {
    throw new Error(
      "Backend is stale or incompatible. Restart the backend with scripts/start.ps1, then check http://127.0.0.1:8000/api/metadata.",
    );
  }
  return payload;
}

export const api = {
  health: () => request<{ status: string; app: string }>("/health"),
  metadata: () => request<MetadataPayload>("/metadata").then(assertCompatibleMetadata),
  switchDatabase: (databaseName: string) =>
    request<MetadataPayload>("/databases/switch", {
      method: "POST",
      body: JSON.stringify({ database_name: databaseName }),
    }),
  tree: (projectId: string) => request<TreePayload>(`/projects/${projectId}/tree`),
  graph: (projectId: string) => request<GraphPayload>(`/projects/${projectId}/graph`),
  nodeDetail: (projectId: string, nodeId: string) => request<NodeDetail>(`/projects/${projectId}/nodes/${nodeId}`),
  search: (projectId: string, query: string) =>
    request<TreeNode[]>(`/projects/${projectId}/search?q=${encodeURIComponent(query)}`),
  activity: (projectId: string, since: string, limit = 50) =>
    request<ActivityEvent[]>(
      `/projects/${projectId}/activity?since=${encodeURIComponent(since)}&limit=${limit}`,
    ),
};
