import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { expect, test, vi } from "vitest";

import App from "./App";

vi.mock("./api/client", () => ({
  apiUrl: (path: string) => `/api${path}`,
  api: {
    tree: async () => ({
      project_id: "vlm_radiology",
      root_id: "vlm_radiology",
      root_ids: ["vlm_radiology"],
      nodes: [
        {
          id: "vlm_radiology",
          title: "Demo Research Map",
          category: "Root",
          status: "active",
          importance: "high",
          parent_id: null,
          child_ids: ["ct_clip"],
          summary: "Root",
        },
        {
          id: "ct_clip",
          title: "CT-CLIP",
          category: "Model",
          status: "active",
          importance: "high",
          parent_id: "vlm_radiology",
          child_ids: [],
          summary: "Model",
        },
      ],
    }),
    dashboard: async () => ({
      counts: { nodes: 2, edges: 1, sources: 0, active: 2, high_importance: 2 },
      active_experiments: [],
      open_questions: [],
      writing_and_grants: [],
      recent_nodes: [],
    }),
    graph: async () => ({
      project_id: "vlm_radiology",
      nodes: [],
      edges: [],
    }),
    metadata: async () => ({
      app: "Project2MindMap",
      runtime_store: "sqlite",
      database_path: "project2mindmap.db",
      database_name: "project2mindmap.db",
      database_exists: true,
      database_size_bytes: 100,
      is_populated: true,
      database_profile: "legacy_mindmap",
      active_database_profile: "legacy_mindmap",
      server_started_at: "2026-05-12T00:00:00Z",
      code_profile_version: "llm_wiki_native_v1",
      api_prefix: "/api",
      frontend_served_by_backend: true,
      frontend_dist_path: "frontend/dist",
      frontend_index_exists: true,
      project_count: 1,
      node_count: 2,
      edge_count: 1,
      page_count: 0,
      link_count: 0,
      claim_count: 0,
      task_count: 0,
      question_count: 0,
      lint_count: 0,
      database_status: "ready",
      available_databases: [
        {
          name: "project2mindmap.db",
          path: "project2mindmap.db",
          size_bytes: 100,
          active: true,
          is_populated: true,
          database_profile: "legacy_mindmap",
          project_count: 1,
          node_count: 2,
          edge_count: 1,
          page_count: 0,
          link_count: 0,
          claim_count: 0,
          task_count: 0,
          question_count: 0,
          lint_count: 0,
          status: "ready",
        },
      ],
      schema_sql_path: "project2mindmap_schema.sql",
      schema_sql_exists: true,
      active_project_id: "vlm_radiology",
      notes: ["The running app reads and writes the SQLite database file."],
    }),
    nodeDetail: async () => ({
      node: {
        id: "vlm_radiology",
        project_id: "vlm_radiology",
        title: "Demo Research Map",
        slug: "vlm_radiology",
        category: "Root",
        status: "active",
        importance: "high",
        parent_id: null,
        child_ids: ["ct_clip"],
        summary: "Root",
      },
      detail_blocks: [],
      tags: [],
      aliases: [],
      sources: [],
      attachments: [],
      related_edges: [],
      related_nodes: [],
      claims: [],
      tasks: [],
      open_questions: [],
      lint_findings: [],
    }),
    exportJson: async () => ({}),
  },
}));

test("renders seeded project tree", async () => {
  render(<App />);
  expect(await screen.findByRole("heading", { name: "Project2MindMap" })).toBeInTheDocument();
  expect(screen.queryByText("VLM Radiology Research Program")).not.toBeInTheDocument();
});
