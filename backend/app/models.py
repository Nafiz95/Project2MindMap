from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import declarative_base, relationship

from app.constants import (
    CANDIDATE_ACTIONS,
    CANDIDATE_REVIEW_STATUSES,
    DETAIL_BLOCK_TYPES,
    EDGE_STRENGTHS,
    IMPORTANCE_VALUES,
    INGESTION_STATUSES,
    NODE_CATEGORIES,
    NODE_STATUSES,
    RELATION_TYPES,
)

Base = declarative_base()


def enum_check(column_name: str, values: set[str]) -> str:
    quoted = ", ".join(f"'{value}'" for value in sorted(values))
    return f"{column_name} IN ({quoted})"


class TimestampMixin:
    created_at = Column(String, server_default=func.current_timestamp())
    updated_at = Column(String, server_default=func.current_timestamp())


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)

    nodes = relationship("Node", cascade="all, delete-orphan", back_populates="project")
    edges = relationship("Edge", cascade="all, delete-orphan", back_populates="project")
    sources = relationship("Source", cascade="all, delete-orphan", back_populates="project")


class Node(Base, TimestampMixin):
    __tablename__ = "nodes"
    __table_args__ = (
        UniqueConstraint("project_id", "slug", name="uq_nodes_project_slug"),
        CheckConstraint(enum_check("category", NODE_CATEGORIES), name="ck_nodes_category"),
        CheckConstraint(enum_check("status", NODE_STATUSES), name="ck_nodes_status"),
        CheckConstraint(enum_check("importance", IMPORTANCE_VALUES), name="ck_nodes_importance"),
        Index("idx_nodes_project_updated", "project_id", "updated_at"),
        Index("idx_nodes_project_importance", "project_id", "importance"),
    )

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    category = Column(String, nullable=False)
    summary = Column(Text)
    description = Column(Text)
    status = Column(String, nullable=False, default="idea")
    importance = Column(String, nullable=False, default="medium")
    parent_id = Column(String, ForeignKey("nodes.id", ondelete="SET NULL"))

    project = relationship("Project", back_populates="nodes")
    parent = relationship("Node", remote_side=[id], backref="children")
    details = relationship("DetailBlock", cascade="all, delete-orphan", back_populates="node")
    aliases = relationship("NodeAlias", cascade="all, delete-orphan", back_populates="node")
    attachments = relationship("Attachment", cascade="all, delete-orphan", back_populates="node")


class Edge(Base, TimestampMixin):
    __tablename__ = "edges"
    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "source_node_id",
            "target_node_id",
            "relation_type",
            name="uq_edges_project_typed_pair",
        ),
        CheckConstraint(enum_check("relation_type", RELATION_TYPES), name="ck_edges_relation_type"),
        CheckConstraint(enum_check("strength", EDGE_STRENGTHS), name="ck_edges_strength"),
        Index("idx_edges_project_relation", "project_id", "relation_type"),
    )

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    source_node_id = Column(String, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    target_node_id = Column(String, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    relation_type = Column(String, nullable=False)
    description = Column(Text)
    strength = Column(String, nullable=False, default="medium")

    project = relationship("Project", back_populates="edges")


class DetailBlock(Base, TimestampMixin):
    __tablename__ = "detail_blocks"
    __table_args__ = (
        CheckConstraint(enum_check("block_type", DETAIL_BLOCK_TYPES), name="ck_detail_block_type"),
    )

    id = Column(String, primary_key=True)
    node_id = Column(String, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    block_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    node = relationship("Node", back_populates="details")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    color = Column(String)


class NodeTag(Base):
    __tablename__ = "node_tags"

    node_id = Column(String, ForeignKey("nodes.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(String, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class Source(Base, TimestampMixin):
    __tablename__ = "sources"

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    path_or_url = Column(Text)
    citation_key = Column(String)
    note = Column(Text)

    project = relationship("Project", back_populates="sources")


class NodeSource(Base):
    __tablename__ = "node_sources"

    node_id = Column(String, ForeignKey("nodes.id", ondelete="CASCADE"), primary_key=True)
    source_id = Column(String, ForeignKey("sources.id", ondelete="CASCADE"), primary_key=True)
    evidence_note = Column(Text)
    source_span = Column(Text)


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(String, primary_key=True)
    node_id = Column(String, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String)
    path = Column(Text, nullable=False)
    description = Column(Text)
    created_at = Column(String, server_default=func.current_timestamp())

    node = relationship("Node", back_populates="attachments")


class NodeAlias(Base):
    __tablename__ = "node_aliases"
    __table_args__ = (UniqueConstraint("node_id", "alias", name="uq_node_alias"),)

    id = Column(String, primary_key=True)
    node_id = Column(String, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    alias = Column(String, nullable=False)

    node = relationship("Node", back_populates="aliases")


class IngestionJob(Base, TimestampMixin):
    __tablename__ = "ingestion_jobs"
    __table_args__ = (
        CheckConstraint(enum_check("status", INGESTION_STATUSES), name="ck_ingestion_status"),
        Index("idx_ingestion_project_status", "project_id", "status"),
    )

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    input_type = Column(String, nullable=False)
    input_title = Column(String)
    raw_content = Column(Text, nullable=False)
    content_hash = Column(String)
    status = Column(String, nullable=False, default="pending")


class ExtractedNodeCandidate(Base, TimestampMixin):
    __tablename__ = "extracted_node_candidates"
    __table_args__ = (
        CheckConstraint(enum_check("category", NODE_CATEGORIES), name="ck_node_candidate_category"),
        CheckConstraint(enum_check("action", CANDIDATE_ACTIONS), name="ck_node_candidate_action"),
        CheckConstraint(enum_check("review_status", CANDIDATE_REVIEW_STATUSES), name="ck_node_candidate_review"),
    )

    id = Column(String, primary_key=True)
    ingestion_job_id = Column(String, ForeignKey("ingestion_jobs.id", ondelete="CASCADE"), nullable=False)
    proposed_node_id = Column(String)
    matched_existing_node_id = Column(String, ForeignKey("nodes.id", ondelete="SET NULL"))
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    summary = Column(Text)
    description = Column(Text)
    status = Column(String)
    importance = Column(String)
    confidence = Column(Float, default=1.0)
    action = Column(String, nullable=False, default="create")
    review_status = Column(String, nullable=False, default="pending")


class ExtractedEdgeCandidate(Base, TimestampMixin):
    __tablename__ = "extracted_edge_candidates"
    __table_args__ = (
        CheckConstraint(enum_check("relation_type", RELATION_TYPES), name="ck_edge_candidate_relation"),
        CheckConstraint(enum_check("strength", EDGE_STRENGTHS), name="ck_edge_candidate_strength"),
        CheckConstraint(enum_check("action", CANDIDATE_ACTIONS), name="ck_edge_candidate_action"),
        CheckConstraint(enum_check("review_status", CANDIDATE_REVIEW_STATUSES), name="ck_edge_candidate_review"),
    )

    id = Column(String, primary_key=True)
    ingestion_job_id = Column(String, ForeignKey("ingestion_jobs.id", ondelete="CASCADE"), nullable=False)
    source_title = Column(String, nullable=False)
    target_title = Column(String, nullable=False)
    source_node_candidate_id = Column(String, ForeignKey("extracted_node_candidates.id", ondelete="SET NULL"))
    target_node_candidate_id = Column(String, ForeignKey("extracted_node_candidates.id", ondelete="SET NULL"))
    matched_source_node_id = Column(String, ForeignKey("nodes.id", ondelete="SET NULL"))
    matched_target_node_id = Column(String, ForeignKey("nodes.id", ondelete="SET NULL"))
    relation_type = Column(String, nullable=False)
    description = Column(Text)
    strength = Column(String, nullable=False, default="medium")
    confidence = Column(Float, default=1.0)
    action = Column(String, nullable=False, default="create")
    review_status = Column(String, nullable=False, default="pending")


class ExtractedDetailCandidate(Base, TimestampMixin):
    __tablename__ = "extracted_detail_candidates"
    __table_args__ = (
        CheckConstraint(enum_check("block_type", DETAIL_BLOCK_TYPES), name="ck_detail_candidate_block_type"),
        CheckConstraint(enum_check("action", CANDIDATE_ACTIONS), name="ck_detail_candidate_action"),
        CheckConstraint(enum_check("review_status", CANDIDATE_REVIEW_STATUSES), name="ck_detail_candidate_review"),
    )

    id = Column(String, primary_key=True)
    ingestion_job_id = Column(String, ForeignKey("ingestion_jobs.id", ondelete="CASCADE"), nullable=False)
    node_candidate_id = Column(String, ForeignKey("extracted_node_candidates.id", ondelete="SET NULL"))
    matched_existing_node_id = Column(String, ForeignKey("nodes.id", ondelete="SET NULL"))
    block_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    action = Column(String, nullable=False, default="append")
    review_status = Column(String, nullable=False, default="pending")
