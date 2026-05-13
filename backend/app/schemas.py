from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.constants import (
    DETAIL_BLOCK_TYPES,
    EDGE_STRENGTHS,
    IMPORTANCE_VALUES,
    NODE_CATEGORIES,
    NODE_STATUSES,
    RELATION_TYPES,
)


def validate_member(value: str | None, allowed: set[str], field_name: str) -> str | None:
    if value is not None and value not in allowed:
        raise ValueError(f"{field_name} must be one of: {', '.join(sorted(allowed))}")
    return value


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None = None


class NodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    title: str
    slug: str
    category: str
    summary: str | None = None
    description: str | None = None
    status: str
    importance: str
    parent_id: str | None = None


class NodeCreateIn(BaseModel):
    id: str | None = None
    title: str
    category: str
    summary: str | None = None
    description: str | None = None
    status: str = "idea"
    importance: str = "medium"
    parent_id: str | None = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        return validate_member(value, NODE_CATEGORIES, "category") or value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        return validate_member(value, NODE_STATUSES, "status") or value

    @field_validator("importance")
    @classmethod
    def validate_importance(cls, value: str) -> str:
        return validate_member(value, IMPORTANCE_VALUES, "importance") or value


class NodePatchIn(BaseModel):
    title: str | None = None
    category: str | None = None
    summary: str | None = None
    description: str | None = None
    status: str | None = None
    importance: str | None = None
    parent_id: str | None = None


class EdgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    source_node_id: str
    target_node_id: str
    relation_type: str
    description: str | None = None
    strength: str


class EdgeCreateIn(BaseModel):
    source_node_id: str
    target_node_id: str
    relation_type: str
    description: str | None = None
    strength: str = "medium"

    @field_validator("relation_type")
    @classmethod
    def validate_relation_type(cls, value: str) -> str:
        return validate_member(value, RELATION_TYPES, "relation_type") or value

    @field_validator("strength")
    @classmethod
    def validate_strength(cls, value: str) -> str:
        return validate_member(value, EDGE_STRENGTHS, "strength") or value


class EdgePatchIn(BaseModel):
    source_node_id: str | None = None
    target_node_id: str | None = None
    relation_type: str | None = None
    description: str | None = None
    strength: str | None = None


class DetailBlockOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    node_id: str
    block_type: str
    title: str
    content: str
    sort_order: int


class DetailBlockCreateIn(BaseModel):
    block_type: str
    title: str
    content: str
    sort_order: int | None = None

    @field_validator("block_type")
    @classmethod
    def validate_block_type(cls, value: str) -> str:
        return validate_member(value, DETAIL_BLOCK_TYPES, "block_type") or value


class DetailBlockPatchIn(BaseModel):
    block_type: str | None = None
    title: str | None = None
    content: str | None = None
    sort_order: int | None = None


class SourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_type: str
    title: str
    path_or_url: str | None = None
    citation_key: str | None = None
    note: str | None = None


class TreeNodeOut(BaseModel):
    id: str
    title: str
    category: str
    status: str
    importance: str
    parent_id: str | None = None
    child_ids: list[str] = Field(default_factory=list)
    summary: str | None = None


class TreeOut(BaseModel):
    project_id: str
    root_id: str | None
    root_ids: list[str] = Field(default_factory=list)
    nodes: list[TreeNodeOut]


class RelatedNodeOut(BaseModel):
    id: str
    title: str
    category: str
    status: str
    importance: str


class NodeDetailOut(BaseModel):
    node: NodeOut
    detail_blocks: list[DetailBlockOut]
    tags: list[str]
    aliases: list[str]
    sources: list[SourceOut]
    attachments: list[dict[str, Any]]
    related_edges: list[EdgeOut]
    related_nodes: list[RelatedNodeOut]
    claims: list[dict[str, Any]] = Field(default_factory=list)
    tasks: list[dict[str, Any]] = Field(default_factory=list)
    open_questions: list[dict[str, Any]] = Field(default_factory=list)
    lint_findings: list[dict[str, Any]] = Field(default_factory=list)


class CanonicalSourceIn(BaseModel):
    source_type: str = "note"
    title: str
    path_or_url: str | None = None
    citation_key: str | None = None
    note: str | None = None


class CanonicalDetailBlockIn(BaseModel):
    block_type: str
    title: str
    content: str

    @field_validator("block_type")
    @classmethod
    def validate_block_type(cls, value: str) -> str:
        return validate_member(value, DETAIL_BLOCK_TYPES, "block_type") or value


class CanonicalNodeIn(BaseModel):
    id: str
    title: str
    category: str
    summary: str | None = None
    description: str | None = None
    status: str = "idea"
    importance: str = "medium"
    tags: list[str] = Field(default_factory=list)
    detail_blocks: list[CanonicalDetailBlockIn] = Field(default_factory=list)

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        return validate_member(value, NODE_CATEGORIES, "category") or value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        return validate_member(value, NODE_STATUSES, "status") or value

    @field_validator("importance")
    @classmethod
    def validate_importance(cls, value: str) -> str:
        return validate_member(value, IMPORTANCE_VALUES, "importance") or value


class CanonicalEdgeIn(BaseModel):
    source: str
    target: str
    relation_type: str
    description: str | None = None
    strength: str = "medium"

    @field_validator("relation_type")
    @classmethod
    def validate_relation_type(cls, value: str) -> str:
        return validate_member(value, RELATION_TYPES, "relation_type") or value

    @field_validator("strength")
    @classmethod
    def validate_strength(cls, value: str) -> str:
        return validate_member(value, EDGE_STRENGTHS, "strength") or value


class CanonicalIngestionIn(BaseModel):
    project_id: str
    source: CanonicalSourceIn
    nodes: list[CanonicalNodeIn] = Field(default_factory=list)
    edges: list[CanonicalEdgeIn] = Field(default_factory=list)


class CandidatePatchIn(BaseModel):
    review_status: Literal["pending", "approved", "rejected", "needs-review"] | None = None
    action: Literal["create", "update", "append"] | None = None
    title: str | None = None
    category: str | None = None
    summary: str | None = None
    description: str | None = None
    status: str | None = None
    importance: str | None = None
    relation_type: str | None = None
    strength: str | None = None
    block_type: str | None = None
    content: str | None = None
    matched_existing_node_id: str | None = None
    matched_source_node_id: str | None = None
    matched_target_node_id: str | None = None


class IngestionJobCreateOut(BaseModel):
    job_id: str
    status: str
    candidate_counts: dict[str, int]
    warnings: list[str]


class CandidatesOut(BaseModel):
    job_id: str
    node_candidates: list[dict[str, Any]]
    edge_candidates: list[dict[str, Any]]
    detail_candidates: list[dict[str, Any]]
    blocking_errors: list[str]


class CommitOut(BaseModel):
    job_id: str
    status: str
    created: dict[str, list[str]]
    updated: dict[str, list[str]]


class DatabaseSwitchIn(BaseModel):
    database_name: str
