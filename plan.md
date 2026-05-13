# Project2MindMap - Build-Ready Implementation Plan

_Last updated: 2026-05-11_

## 0. Purpose

**Project2MindMap** is a local-first research knowledge-map app. It converts a long-running project into a database-backed, clickable, expandable mind map.

The current seed project is:

> **VLM Radiology Research Program**

The app should help the user answer:

- What ideas am I working on?
- How are datasets, models, methods, experiments, grants, papers, and open questions connected?
- What is the current status of each idea?
- What files, notebooks, prompts, and running logs are attached to each idea?
- How do I update the map when a new chat, note, paper, or experiment appears?

The most important design principle is:

> Store ideas as structured **nodes** and relationships as **edges**. The tree view, graph view, dashboard, search, and export views are all different views of the same database.

---

## 1. Product scope

### 1.1 MVP goal

The MVP is a narrow vertical slice around the core product loop: load the seeded knowledge map, inspect it, import structured updates, review them, commit approved knowledge, and export the result.

The MVP should support:

1. Loading the seeded VLM Radiology research map from SQLite.
2. Displaying an expandable tree.
3. Displaying selected node details in a side panel.
4. Searching and filtering nodes.
5. Importing structured JSON updates.
6. Reviewing candidate nodes, edges, and detail blocks.
7. Committing approved candidates into the database transactionally.
8. Exporting the project to JSON.

### 1.2 Non-goals for MVP

Do **not** build these in the first version:

- Cloud authentication.
- Multi-user collaboration.
- Direct PDF parsing.
- Direct ChatGPT integration inside the app.
- Vector search.
- Full automatic paper extraction.
- Complex graph analytics.
- Graph/neighborhood view.
- Markdown, Obsidian, Mermaid, and CSV export.
- Full editing UI outside the ingestion review flow.
- Neo4j or another graph database.

These can be added after the database, ingestion workflow, and core views are stable.

---

## 2. Recommended architecture

```text
Project2MindMap
│
├── Frontend
│   └── React + TypeScript + Vite
│
├── Backend
│   └── FastAPI
│
├── Database
│   └── SQLite
│
├── Visualization
│   ├── Expandable tree view
│   └── Graph/network view
│
├── Ingestion layer
│   ├── Raw notes
│   ├── Candidate extraction
│   ├── Review queue
│   └── Commit approved updates
│
└── Export layer
    ├── JSON
    ├── Markdown
    ├── Obsidian-style notes
    ├── Mermaid graph
    └── CSV
```

---

## 3. Technology stack

### 3.1 Frontend

| Layer | Choice | Reason |
|---|---|---|
| Framework | React | Good for highly interactive node/detail/filter UI |
| Language | TypeScript | Keeps node, edge, source, tag, and detail schemas safe |
| Bundler | Vite | Lightweight local-first development |
| Styling | Tailwind CSS | Fast custom dashboard and panel layout |
| Components | shadcn/ui | Clean reusable cards, dialogs, tabs, forms, badges |
| Tree/graph | React Flow | Clickable/draggable custom nodes, edges, labels, zoom/pan |
| State | Zustand | Lighter than Redux, good for selected node, filters, graph depth |
| Search | Fuse.js first | Fast fuzzy frontend search over node data |

### 3.2 Backend

| Layer | Choice | Reason |
|---|---|---|
| API | FastAPI | Python-native, clean local API, automatic docs |
| Database | SQLite first | One portable local database file |
| ORM | SQLModel or SQLAlchemy | Maps database tables to Python models |
| Validation | Pydantic | Input validation for nodes, edges, and ingestion JSON |
| CLI | Typer | Simple commands for init, seed, import, export |

### 3.3 Later options

Add only when needed:

- PostgreSQL for multi-user/cloud hosting.
- Cytoscape.js for very large graphs.
- Meilisearch or SQLite FTS for stronger search.
- Embeddings for semantic search.
- Internal LLM-based extraction.

---

## 4. Repository structure

```text
Project2MindMap/
│
├── README.md
├── .env.example
├── docker-compose.yml
│
├── backend/
│   ├── pyproject.toml
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── seed.py
│   │   │
│   │   ├── routes/
│   │   │   ├── projects.py
│   │   │   ├── nodes.py
│   │   │   ├── edges.py
│   │   │   ├── details.py
│   │   │   ├── tags.py
│   │   │   ├── sources.py
│   │   │   ├── ingestion.py
│   │   │   ├── graph.py
│   │   │   └── export.py
│   │   │
│   │   ├── services/
│   │   │   ├── node_service.py
│   │   │   ├── edge_service.py
│   │   │   ├── ingestion_service.py
│   │   │   ├── merge_service.py
│   │   │   ├── search_service.py
│   │   │   └── export_service.py
│   │   │
│   │   └── cli/
│   │       └── manage.py
│   │
│   └── tests/
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/
│       │   ├── client.ts
│       │   ├── nodes.ts
│       │   ├── graph.ts
│       │   └── ingestion.ts
│       │
│       ├── types/
│       │   ├── node.ts
│       │   ├── edge.ts
│       │   ├── detail.ts
│       │   └── ingestion.ts
│       │
│       ├── store/
│       │   └── useMindMapStore.ts
│       │
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── SearchBar.tsx
│       │   ├── CategoryFilter.tsx
│       │   ├── StatusBadge.tsx
│       │   ├── NodeCard.tsx
│       │   ├── NodeDetailPanel.tsx
│       │   ├── RelatedNodes.tsx
│       │   ├── DetailBlockList.tsx
│       │   └── ReviewCandidateCard.tsx
│       │
│       ├── views/
│       │   ├── DashboardView.tsx
│       │   ├── TreeView.tsx
│       │   ├── GraphView.tsx
│       │   ├── NodeDetailView.tsx
│       │   ├── IngestionReviewView.tsx
│       │   ├── OpenQuestionsView.tsx
│       │   └── ExportView.tsx
│       │
│       └── utils/
│           ├── graphLayout.ts
│           ├── search.ts
│           └── formatters.ts
│
├── data/
│   ├── seeds/
│   │   └── vlm_radiology_seed.json
│   ├── review/
│   └── exports/
│
└── docs/
    ├── product_requirements.md
    ├── data_model.md
    ├── api_spec.md
    ├── ingestion_format.md
    └── ui_wireframes.md
```

---

## 5. Core data model

Project2MindMap is built around these concepts:

| Entity | Meaning |
|---|---|
| Project | A top-level research/program map |
| Node | An idea, dataset, model, method, experiment, writing task, limitation, or open question |
| Edge | A typed relationship between two nodes |
| Detail block | Expandable sections attached to a node |
| Tag | Search/filter label |
| Source | Where a node or claim came from |
| Attachment | File, notebook, markdown file, directory, or artifact linked to a node |
| Alias | Alternate names such as CTCLIP → CT-CLIP |
| Ingestion job | Raw note or imported content waiting to be converted/reviewed |
| Candidate | Proposed node/edge/detail block extracted from an ingestion job |

---

## 6. Database schema

The generated seed database uses the following tables:

```text
projects
nodes
edges
detail_blocks
tags
node_tags
sources
node_sources
attachments
node_aliases
ingestion_jobs
extracted_node_candidates
extracted_edge_candidates
extracted_detail_candidates
node_versions
graph_layouts
app_metadata
```

The full SQL schema is also exported separately as:

```text
project2mindmap_schema.sql
```

### 6.1 Validation and constraints

The database and API should enforce the same canonical enum lists. Prefer Pydantic validation at the API boundary plus SQLite constraints/indexes where practical.

Required constraints:

```text
nodes: unique (project_id, slug)
nodes: category, status, and importance must match canonical enum values
edges: unique (project_id, source_node_id, target_node_id, relation_type)
edges: relation_type and strength must match canonical enum values
node_aliases: unique (node_id, alias)
detail_blocks: block_type must match canonical enum values
```

Required supporting indexes:

```text
nodes(project_id, updated_at)
nodes(project_id, importance)
edges(project_id, relation_type)
ingestion_jobs(project_id, status)
```

### 6.2 Important tables

#### `nodes`

Stores the main ideas.

Important fields:

```text
id
project_id
title
slug
category
summary
description
status
importance
parent_id
created_at
updated_at
```

Allowed categories:

```text
Root
Clinical Problem
Dataset
Cohort
Model
Method
Experiment
Implementation
Evaluation
Writing
Grant
Paper
Limitation
Open Question
Running Log
Source
```

Allowed statuses:

```text
idea
active
paused
completed
needs-review
archived
```

#### `edges`

Stores relationships.

Important fields:

```text
source_node_id
target_node_id
relation_type
description
strength
```

Recommended relation types:

```text
belongs_to
part_of
uses
trained_on
evaluated_on
depends_on
extends
contrasts_with
supports
limits
informs
implemented_by
measured_by
derived_from
evaluates
has_limitation
has_open_question
written_in
related_to
```

#### `detail_blocks`

Stores expandable node details.

Recommended block types:

```text
overview
why_it_matters
technical_details
current_status
open_questions
limitations
next_steps
related_files
evidence
implementation_notes
writing_notes
```

#### `ingestion_jobs` and candidate tables

These tables keep raw content separate from committed knowledge.

The intended flow is:

```text
raw note/chat/file
    ↓
ingestion_jobs
    ↓
extracted_node_candidates
extracted_edge_candidates
extracted_detail_candidates
    ↓
review
    ↓
commit into nodes/edges/detail_blocks
```

Ingestion rules:

1. Structured JSON imports always create an `ingestion_job` first; they do not write directly to `nodes`, `edges`, or `detail_blocks`.
2. Each imported `nodes[].id` becomes `extracted_node_candidates.proposed_node_id`.
3. If `nodes[].id`, slug, title, or an alias matches an existing node in the same project, create an update candidate with `matched_existing_node_id`; otherwise create a new-node candidate.
4. Each nested `detail_blocks[]` item becomes an `extracted_detail_candidate` linked either to the proposed node candidate or to the matched existing node.
5. Each imported edge resolves `source` and `target` against proposed node IDs first, then existing node IDs, slugs, titles, and aliases.
6. If an edge endpoint cannot be resolved, keep the edge candidate in `needs-review` state and block commit until the reviewer fixes or rejects it.
7. Candidate commit is transactional: either all approved candidates for the job are committed, or none are.
8. Rejected candidates and rejected jobs are retained for audit and duplicate-detection context.
9. Candidate edits are allowed before commit and must be validated against the same enum and uniqueness rules as direct API writes.

---

## 7. Canonical ingestion JSON

When new project content appears, convert it into this format first:

```json
{
  "project_id": "vlm_radiology",
  "source": {
    "source_type": "chat",
    "title": "I-JEPA pretrained reproduction planning",
    "path_or_url": null,
    "citation_key": null,
    "note": "User project update converted into Project2MindMap candidates."
  },
  "nodes": [
    {
      "id": "ijepa_pretrained_reproduction",
      "title": "I-JEPA pretrained reproduction",
      "category": "Experiment",
      "summary": "Reproduce I-JEPA validation or test results using official pretrained weights on a single A100 GPU.",
      "description": "This experiment avoids full self-supervised training from scratch and focuses on evaluating available pretrained I-JEPA weights.",
      "status": "active",
      "importance": "high",
      "tags": ["ijepa", "reproduction", "pretrained-weights", "single-gpu"],
      "detail_blocks": [
        {
          "block_type": "overview",
          "title": "Experiment goal",
          "content": "Use pretrained I-JEPA weights to reproduce reported validation or test performance without training from scratch."
        }
      ]
    }
  ],
  "edges": [
    {
      "source": "ijepa_pretrained_reproduction",
      "target": "ijepa",
      "relation_type": "evaluates",
      "description": "The reproduction experiment evaluates pretrained I-JEPA.",
      "strength": "strong"
    }
  ]
}
```

---

## 8. Prompt for converting a new chat/note into database-ready JSON

Use this prompt when you are working on a new idea and want to update Project2MindMap:

```text
You are updating the Project2MindMap database for the project "VLM Radiology Research Program".

Convert the content below into a structured candidate update.

Return JSON only.

Use this schema:
{
  "project_id": "vlm_radiology",
  "source": {
    "source_type": "...",
    "title": "...",
    "path_or_url": "...",
    "citation_key": "...",
    "note": "..."
  },
  "nodes": [
    {
      "id": "...",
      "title": "...",
      "category": "...",
      "summary": "...",
      "description": "...",
      "status": "...",
      "importance": "...",
      "tags": ["..."],
      "detail_blocks": [
        {
          "block_type": "...",
          "title": "...",
          "content": "..."
        }
      ]
    }
  ],
  "edges": [
    {
      "source": "...",
      "target": "...",
      "relation_type": "...",
      "description": "...",
      "strength": "..."
    }
  ]
}

Allowed node categories:
Root, Clinical Problem, Dataset, Cohort, Model, Method, Experiment,
Implementation, Evaluation, Writing, Grant, Paper, Limitation,
Open Question, Running Log, Source.

Allowed statuses:
idea, active, paused, completed, needs-review, archived.

Allowed relation types:
belongs_to, part_of, uses, trained_on, evaluated_on, depends_on,
extends, contrasts_with, supports, limits, informs, implemented_by,
measured_by, derived_from, evaluates, has_limitation, has_open_question,
written_in, related_to.

Allowed detail block types:
overview, why_it_matters, technical_details, current_status,
open_questions, limitations, next_steps, related_files, evidence,
implementation_notes, writing_notes.

Rules:
1. Reuse existing node IDs where appropriate.
2. Create a new node only when the idea is meaningfully new.
3. Use short, stable snake_case IDs.
4. Mark uncertain items with status "needs-review".
5. Do not invent papers, datasets, metrics, or implementation facts.
6. Put unresolved questions into an "open_questions" block.
7. Put implementation constraints into an "implementation_notes" block.
8. Separate factual claims from interpretation.
9. Keep summaries concise.
10. Return valid JSON only.

Known existing nodes:
[INSERT EXISTING NODE LIST HERE]

Content to convert:
"""
[PASTE CONTENT HERE]
"""
```

---

## 9. Backend API design

Base URL:

```text
http://localhost:8000
```

### 9.1 Health

```text
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "app": "Project2MindMap"
}
```

### 9.2 Projects

```text
GET    /projects
POST   /projects
GET    /projects/{project_id}
PATCH  /projects/{project_id}
DELETE /projects/{project_id}
```

### 9.3 Nodes

```text
GET    /projects/{project_id}/nodes
POST   /projects/{project_id}/nodes
GET    /projects/{project_id}/nodes/{node_id}
PATCH  /projects/{project_id}/nodes/{node_id}
DELETE /projects/{project_id}/nodes/{node_id}
```

### 9.4 Edges

```text
GET    /projects/{project_id}/edges
POST   /projects/{project_id}/edges
PATCH  /projects/{project_id}/edges/{edge_id}
DELETE /projects/{project_id}/edges/{edge_id}
```

### 9.5 Detail blocks

```text
GET    /nodes/{node_id}/details
POST   /nodes/{node_id}/details
PATCH  /details/{detail_block_id}
DELETE /details/{detail_block_id}
```

### 9.6 Graph

```text
GET /projects/{project_id}/graph
GET /projects/{project_id}/graph/neighborhood?node_id=ct_clip&depth=2
GET /projects/{project_id}/tree
```

### 9.7 Search

```text
GET /projects/{project_id}/search?q=ct-rate
```

Search should include:

```text
node title
summary
description
tags
aliases
detail blocks
source titles
```

### 9.8 Ingestion

```text
POST /projects/{project_id}/ingestion/jobs
GET  /projects/{project_id}/ingestion/jobs
GET  /ingestion/jobs/{job_id}

POST /ingestion/jobs/{job_id}/extract
GET  /ingestion/jobs/{job_id}/candidates

PATCH /ingestion/candidates/nodes/{candidate_id}
PATCH /ingestion/candidates/edges/{candidate_id}
PATCH /ingestion/candidates/details/{candidate_id}

POST /ingestion/jobs/{job_id}/commit
POST /ingestion/jobs/{job_id}/reject
```

### 9.9 Export

```text
GET /projects/{project_id}/export/json
GET /projects/{project_id}/export/markdown
GET /projects/{project_id}/export/obsidian
GET /projects/{project_id}/export/mermaid
GET /projects/{project_id}/export/csv
```

For MVP, only JSON export is required. Markdown, Obsidian, Mermaid, and CSV export are post-MVP.

### 9.10 MVP API contracts

`GET /projects/{project_id}/tree` returns the hierarchy needed by the tree view:

```json
{
  "project_id": "vlm_radiology",
  "root_id": "vlm_radiology",
  "nodes": [
    {
      "id": "ct_clip",
      "title": "CT-CLIP",
      "category": "Model",
      "status": "active",
      "importance": "high",
      "parent_id": "model_families",
      "child_ids": [],
      "summary": "CT foundation model trained on CT-RATE."
    }
  ]
}
```

`GET /projects/{project_id}/nodes/{node_id}` returns a node detail payload:

```json
{
  "node": {
    "id": "ct_clip",
    "project_id": "vlm_radiology",
    "title": "CT-CLIP",
    "slug": "ct_clip",
    "category": "Model",
    "summary": "CT foundation model trained on CT-RATE.",
    "description": "",
    "status": "active",
    "importance": "high",
    "parent_id": "model_families"
  },
  "detail_blocks": [
    {
      "id": "detail_ct_clip_overview",
      "block_type": "overview",
      "title": "Overview",
      "content": "Short detail text.",
      "sort_order": 0
    }
  ],
  "tags": ["ct-clip", "ct-rate"],
  "aliases": ["CTCLIP"],
  "sources": [
    {
      "id": "source_ct_clip_paper",
      "source_type": "paper",
      "title": "CT-CLIP paper",
      "path_or_url": null,
      "citation_key": null
    }
  ],
  "attachments": [],
  "related_edges": [
    {
      "id": "edge_ct_clip_trained_on_ct_rate",
      "source_node_id": "ct_clip",
      "target_node_id": "ct_rate",
      "relation_type": "trained_on",
      "description": "CT-CLIP is trained on CT-RATE.",
      "strength": "strong"
    }
  ],
  "related_nodes": [
    {
      "id": "ct_rate",
      "title": "CT-RATE",
      "category": "Dataset",
      "status": "active",
      "importance": "high"
    }
  ]
}
```

`POST /projects/{project_id}/ingestion/jobs` accepts canonical ingestion JSON and returns a review job:

```json
{
  "job_id": "job_ijepa_001",
  "status": "pending",
  "candidate_counts": {
    "nodes": 1,
    "edges": 1,
    "details": 1
  },
  "warnings": []
}
```

`GET /ingestion/jobs/{job_id}/candidates` returns grouped candidates:

```json
{
  "job_id": "job_ijepa_001",
  "node_candidates": [
    {
      "id": "cand_node_001",
      "proposed_node_id": "ijepa_pretrained_reproduction",
      "matched_existing_node_id": null,
      "action": "create",
      "review_status": "pending",
      "title": "I-JEPA pretrained reproduction",
      "category": "Experiment",
      "status": "active",
      "importance": "high"
    }
  ],
  "edge_candidates": [
    {
      "id": "cand_edge_001",
      "source": "ijepa_pretrained_reproduction",
      "target": "ijepa",
      "matched_source_node_id": "ijepa_pretrained_reproduction",
      "matched_target_node_id": "ijepa",
      "relation_type": "evaluates",
      "review_status": "pending"
    }
  ],
  "detail_candidates": [
    {
      "id": "cand_detail_001",
      "node_candidate_id": "cand_node_001",
      "matched_existing_node_id": null,
      "block_type": "overview",
      "title": "Experiment goal",
      "review_status": "pending"
    }
  ],
  "blocking_errors": []
}
```

`POST /ingestion/jobs/{job_id}/commit` commits approved candidates transactionally:

```json
{
  "job_id": "job_ijepa_001",
  "status": "committed",
  "created": {
    "nodes": [],
    "edges": [],
    "detail_blocks": []
  },
  "updated": {
    "nodes": []
  }
}
```

`GET /projects/{project_id}/export/json` returns the portable project graph:

```json
{
  "project": {},
  "nodes": [],
  "edges": [],
  "detail_blocks": [],
  "tags": [],
  "node_tags": [],
  "sources": [],
  "node_sources": [],
  "attachments": [],
  "node_aliases": []
}
```

---

## 10. CLI commands

The backend should include a Typer CLI.

### Initialize database

```bash
python -m app.cli.manage init-db
```

### Seed project

```bash
python -m app.cli.manage seed \
  --input data/seeds/vlm_radiology_seed.json
```

### Ingest a raw note

```bash
python -m app.cli.manage ingest-note \
  --project vlm_radiology \
  --title "I-JEPA reproduction idea" \
  --input notes/ijepa_reproduction.md \
  --mode review
```

### Import structured JSON

```bash
python -m app.cli.manage import-knowledge \
  --project vlm_radiology \
  --input data/review/ijepa_reproduction_candidates.json \
  --mode review
```

### List pending ingestion jobs

```bash
python -m app.cli.manage list-ingestions \
  --project vlm_radiology \
  --status pending
```

### Commit reviewed ingestion job

```bash
python -m app.cli.manage commit-ingestion \
  --job job_ijepa_001
```

### Export project

```bash
python -m app.cli.manage export \
  --project vlm_radiology \
  --format json \
  --output data/exports/vlm_radiology_graph.json
```

### Export Obsidian notes

```bash
python -m app.cli.manage export \
  --project vlm_radiology \
  --format obsidian \
  --output data/exports/obsidian_vault/
```

---

## 11. Frontend views

### 11.1 Dashboard view

Purpose: show the current state of the project.

Sections:

```text
Active nodes
Recently updated nodes
High-priority open questions
Active experiments
Writing outputs
Recently ingested notes
```

Example cards:

```text
CT-CLIP full validation reproduction
I-JEPA pretrained reproduction
Long-tailed survey restructuring
CIHR CT-ILD grant
CT-RATE/IPF/UIP limitation log
```

### 11.2 Tree view

Purpose: structured expandable hierarchy.

Layout:

```text
Top: search + filters

Left:
Expandable tree

Right:
Selected node detail panel
```

Example hierarchy:

```text
VLM Radiology Research Program
├── Clinical Problem Space
├── Datasets and Cohorts
├── Model Families
├── Methodological Ideas
├── Evaluation and Validation
├── Reproduction Workflows
├── Writing and Dissemination
├── Running Logs
└── Project2MindMap Software
```

### 11.3 Graph view

Purpose: relationship-based navigation.

Features:

```text
Zoom
Pan
Drag nodes
Filter by category
Filter by relation type
Show selected node neighborhood
Depth control: 1-hop, 2-hop, all
Click node to open detail panel
Click edge to inspect relation
```

### 11.4 Node detail view

Each node gets a route:

```text
/projects/vlm_radiology/nodes/ct_clip
```

Sections:

```text
Title
Category
Status
Importance
Summary
Description
Detail blocks
Related nodes
Sources
Tags
Open questions
Attachments
Edit button
```

### 11.5 Ingestion review view

Purpose: approve or reject candidate updates.

Sections:

```text
Raw content
Proposed new nodes
Proposed node updates
Proposed edges
Proposed detail blocks
Duplicate warnings
Commit button
Reject button
```

---

## 12. Frontend state model

Use Zustand.

```ts
type MindMapState = {
  activeProjectId: string;

  nodes: ResearchNode[];
  edges: ResearchEdge[];

  selectedNodeId: string | null;
  expandedNodeIds: string[];

  searchQuery: string;
  activeCategories: string[];
  activeStatuses: string[];
  activeRelationTypes: string[];

  graphDepth: number;
  currentView: "dashboard" | "tree" | "graph" | "review";

  setSelectedNode: (nodeId: string) => void;
  toggleExpandedNode: (nodeId: string) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (categories: string[]) => void;
};
```

---

## 13. TypeScript types

### 13.1 Research node

```ts
export type NodeCategory =
  | "Root"
  | "Clinical Problem"
  | "Dataset"
  | "Cohort"
  | "Model"
  | "Method"
  | "Experiment"
  | "Implementation"
  | "Evaluation"
  | "Writing"
  | "Grant"
  | "Paper"
  | "Limitation"
  | "Open Question"
  | "Running Log"
  | "Source";

export type NodeStatus =
  | "idea"
  | "active"
  | "paused"
  | "completed"
  | "needs-review"
  | "archived";

export type ResearchNode = {
  id: string;
  projectId: string;
  title: string;
  slug: string;
  category: NodeCategory;
  summary?: string;
  description?: string;
  status: NodeStatus;
  importance: "low" | "medium" | "high";
  parentId?: string | null;
  tags?: string[];
  detailBlocks?: DetailBlock[];
};
```

### 13.2 Research edge

```ts
export type RelationType =
  | "belongs_to"
  | "part_of"
  | "uses"
  | "trained_on"
  | "evaluated_on"
  | "depends_on"
  | "extends"
  | "contrasts_with"
  | "supports"
  | "limits"
  | "informs"
  | "implemented_by"
  | "measured_by"
  | "derived_from"
  | "evaluates"
  | "has_limitation"
  | "has_open_question"
  | "written_in"
  | "related_to";

export type ResearchEdge = {
  id: string;
  projectId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: RelationType;
  description?: string;
  strength: "weak" | "medium" | "strong";
};
```

### 13.3 Detail block

```ts
export type DetailBlock = {
  id: string;
  nodeId: string;
  blockType:
    | "overview"
    | "why_it_matters"
    | "technical_details"
    | "current_status"
    | "open_questions"
    | "limitations"
    | "next_steps"
    | "related_files"
    | "evidence"
    | "implementation_notes"
    | "writing_notes";
  title: string;
  content: string;
  sortOrder: number;
};
```

---

## 14. Implementation phases

The phases are ordered so the MVP proves the database + ingestion/review workflow before adding graph visualization, broad export formats, or full editing UI.

### Phase 0 - Canonical contract cleanup

Deliverables:

```text
canonical enum lists
updated SQL schema constraints/indexes
seed validation script or test
aligned TypeScript and Pydantic types
```

Acceptance criteria:

```text
Seed data validates against documented categories, statuses, relation types, block types, importance values, and strength values
No seed edge uses an undocumented relation type
Duplicate node slugs and duplicate typed edges are rejected
```

### Phase 1 — Project setup

Deliverables:

```text
Project2MindMap repo
README.md
backend FastAPI app
frontend Vite React app
docs folder
.env.example
```

Acceptance criteria:

```text
Backend starts at localhost:8000
Frontend starts at localhost:5173
Frontend can call backend health endpoint
```

### Phase 2 — Database and models

Deliverables:

```text
models.py
database.py
init-db command
seed command
project2mindmap.db
```

Acceptance criteria:

```text
Database initializes without error
Seed project can be inserted
Nodes, edges, detail blocks, tags, and sources can be stored
```

### Phase 3 — Core backend API

Implement CRUD endpoints for:

```text
projects
nodes
edges
detail_blocks
tags
sources
```

Acceptance criteria:

```text
Can create project
Can create node
Can create edge
Can retrieve all nodes for a project
Can retrieve one node with detail blocks and related nodes
Can update node status
Can delete test node
```

### Phase 4 — Frontend shell

Views:

```text
TreeView
NodeDetailPanel
SearchBar
CategoryFilter
StatusFilter
```

Acceptance criteria:

```text
Frontend loads project tree from backend
Clicking a node opens detail panel
Search filters visible nodes
Category filter works
Status filter works
```

### Phase 5 — Expandable tree view

Features:

```text
hierarchical tree
expand/collapse
node cards
status badges
category badges
selected-node highlighting
related-node links
```

Acceptance criteria:

```text
Root project node appears
Top-level branches appear
Child nodes expand/collapse
Clicking CT-CLIP shows CT-CLIP details
Clicking related CT-RATE navigates to CT-RATE
```

### Phase 6 — Search and filters

Features:

```text
search by title
search by summary
search by detail content
filter by category
filter by status
filter by importance
```

Acceptance criteria:

```text
Searching "CT-RATE" finds CT-RATE
Searching "UIP" finds CT-RATE/IPF/UIP limitation log
Searching "grant" finds CIHR grant
Searching "I-JEPA" finds I-JEPA and I-JEPA reproduction
```

### Phase 7 — Ingestion MVP

MVP ingestion supports:

```text
paste structured JSON
validate JSON
show candidates
show duplicate/match warnings
approve/reject
edit candidates before commit
commit approved candidates transactionally
```

Acceptance criteria:

```text
User pastes canonical ingestion JSON
App shows proposed nodes and edges
App shows matched existing nodes and unresolved edge endpoints
User approves candidates
Approved nodes/edges appear in tree view
Rejected candidates are not committed
Commit rollback leaves database unchanged if any approved candidate is invalid
```

### Phase 8 — Prompt-assisted ingestion

Workflow:

```text
User pastes raw note
App generates prompt template with known node list
User uses ChatGPT to convert note into JSON
User pastes JSON back into app
App validates and reviews
```

Acceptance criteria:

```text
App can generate a conversion prompt
Prompt includes known existing nodes
Returned JSON can be pasted and reviewed
```

### Phase 9 — Graph view (post-MVP)

Features:

```text
React Flow graph
custom node cards
edge labels
zoom/pan
category filtering
relation filtering
depth selector
selected-node neighborhood
```

Acceptance criteria:

```text
Clicking CT-CLIP displays its graph neighborhood
Edges show relation labels
Changing depth from 1 to 2 adds second-degree nodes
Filtering to Dataset shows dataset nodes
Filtering relation type "trained_on" shows relevant training links
```

### Phase 10 — Export system

Formats:

```text
MVP: JSON
Post-MVP: Markdown
Post-MVP: Obsidian vault
Post-MVP: Mermaid graph
Post-MVP: CSV nodes/edges
```

Acceptance criteria:

```text
Project exports to JSON
Post-MVP: each node exports to Markdown
Post-MVP: Obsidian export creates one file per node
Post-MVP: Mermaid export creates a graph diagram
Post-MVP: CSV export creates nodes.csv and edges.csv
```

### Phase 11 — Editing UI (post-MVP)

Features:

```text
create node
edit node
delete node
create edge
edit edge
delete edge
add detail block
edit detail block
add tag
add source
```

Acceptance criteria:

```text
User can create a new experiment node
User can connect it to CT-CLIP
User can add an open-question detail block
Tree and graph update after save
```

### Phase 12 — Hardening and polish

Add:

```text
duplicate detection
alias support
error handling
empty states
loading states
database backup
import conflict warnings
basic tests
```

Acceptance criteria:

```text
Duplicate "CTCLIP" warns and suggests CT-CLIP
Bad ingestion JSON gives useful error
Database can be backed up
Core API tests pass
Frontend does not crash on missing detail blocks
```

---

## 15. Seed database created in this delivery

The accompanying seed database is:

```text
project2mindmap_seed.db
```

Current counts:

```text
projects: 1
nodes: 110
edges: 171
detail_blocks: 20
tags: 143
node_tags: 268
sources: 9
node_sources: 258
attachments: 4
node_aliases: 43
ingestion_jobs: 1
extracted_node_candidates: 1
extracted_edge_candidates: 1
extracted_detail_candidates: 1
```

### 15.1 Seeded top-level branches

```text
Clinical Problem Space
Datasets and Cohorts
Model Families
Methodological Ideas
Evaluation and Validation
Reproduction Workflows
Writing and Dissemination
Running Logs
Project2MindMap Software
```

### 15.2 Seeded examples

Important seeded nodes include:

```text
CT-ILD / KHSC Local Cohort
CT-RATE
MIMIC-CXR
IU-Xray / Open-i / NLMCXR
RadGenome-Chest CT
ReXGroundingCT
CT-CLIP
CT-CHAT
MERLIN
BioViL-T
BiomedCLIP
LLaVA-Rad
RadVLM
I-JEPA
RadJEPA
Graph-based Retrieval-Augmented Generation
Causality and Subgraph Retrieval
Grad-CAM and SHAP Explainability
Long-tailed Learning
CT-CLIP Reproduction
CT-RATE Validation Pipeline
I-JEPA Pretrained Reproduction
Long-tailed Chest Radiology Survey
CIHR CT-ILD Grant
AMLD-HD Workshop
CT-RATE/IPF/UIP Limitations Log
Single A100 GPU Constraint
Project2MindMap Database Schema
Ingestion and Review Workflow
Expandable Tree View
Graph View
```

### 15.3 Important seeded relationships

Examples:

```text
CT-CLIP --trained_on--> CT-RATE
CT-CHAT --extends--> CT-CLIP
CT-CLIP Reproduction --evaluates--> CT-CLIP
CT-CLIP Reproduction --evaluated_on--> CT-RATE
CT-RATE --has_limitation--> CT-RATE/IPF/UIP Limitations Log
CT-ILD / KHSC Local Cohort --supports--> IPF
CT-ILD / KHSC Local Cohort --supports--> UIP Pattern
CIHR CT-ILD Grant --uses--> CT-ILD / KHSC Local Cohort
I-JEPA Pretrained Reproduction --evaluates--> I-JEPA
I-JEPA Pretrained Reproduction --depends_on--> Single A100 GPU Constraint
RadJEPA --extends--> I-JEPA
Graph-based RAG --supports--> Clinician-facing Explainability
Long-tailed Chest Radiology Survey --uses--> CXR-LT Challenge Series
Long-tailed Chest Radiology Survey --uses--> LTML-MIMIC-CXR
Project2MindMap Build Workflow --part_of--> Project2MindMap Software
```

---

## 16. Testing plan

### 16.1 Backend tests

Test:

```text
database initialization
seed enum validation
project creation
node creation
edge creation
duplicate slug rejection
duplicate typed edge rejection
detail block creation
search
ingestion validation
unresolved edge endpoint validation
candidate commit
transactional commit rollback
export
```

Example tests:

```text
test_create_project
test_create_node
test_prevent_duplicate_edge
test_get_node_with_details
test_ingestion_commit_creates_nodes
test_ingestion_commit_rolls_back_on_invalid_candidate
test_export_json_contains_edges
```

### 16.2 Frontend tests

Test:

```text
tree renders nodes
clicking node opens detail
search filters nodes
candidate review cards render
post-MVP: graph view receives nodes and edges
```

### 16.3 Manual acceptance scenario

```text
1. Start backend.
2. Start frontend.
3. Open VLM Radiology project.
4. Click CT-CLIP.
5. See details and related CT-RATE node.
6. Search "I-JEPA".
7. Import I-JEPA reproduction JSON.
8. Review and approve candidates.
9. Confirm I-JEPA reproduction appears in tree.
10. Export project to JSON.
11. Confirm exported JSON contains the approved node, edge, and detail block.
```

---

## 17. Final build order

```text
1. Normalize docs, schema, seed data, and enum contracts
2. Scaffold repo
3. Build database models, constraints, indexes, and seed loader
4. Build backend read APIs for tree, node detail, and search
5. Build frontend tree/detail/search vertical slice
6. Build structured JSON ingestion validation
7. Build candidate review, duplicate warnings, and transactional commit
8. Add JSON export
9. Add backend and frontend MVP tests
10. Add graph view
11. Add Markdown, Obsidian, Mermaid, and CSV exports
12. Add full editing UI
13. Add polish, backup, and hardening
```

The most important early milestone is **not** the graph view. It is:

> the database model + ingestion/review workflow.

Once nodes and edges are clean, the tree, graph, dashboard, search, export, and open-question tracker become straightforward.
