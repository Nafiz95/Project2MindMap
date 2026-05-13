import hashlib
import json
from typing import Any
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    DetailBlock,
    Edge,
    ExtractedDetailCandidate,
    ExtractedEdgeCandidate,
    ExtractedNodeCandidate,
    IngestionJob,
    Node,
    NodeAlias,
    Source,
)
from app.schemas import CandidatePatchIn, CanonicalIngestionIn


def create_ingestion_job(session: Session, project_id: str, payload: CanonicalIngestionIn) -> dict:
    raw = payload.model_dump_json()
    job_id = f"job_{uuid4().hex[:12]}"
    job = IngestionJob(
        id=job_id,
        project_id=project_id,
        input_type=payload.source.source_type,
        input_title=payload.source.title,
        raw_content=raw,
        content_hash=hashlib.sha256(raw.encode("utf-8")).hexdigest(),
        status="pending",
    )
    session.add(job)
    session.flush()

    warnings: list[str] = []
    proposed_to_candidate: dict[str, str] = {}
    proposed_to_matched: dict[str, str | None] = {}

    for item in payload.nodes:
        matched_id = find_matching_node_id(session, project_id, item.id, item.title)
        action = "update" if matched_id else "create"
        if matched_id:
            warnings.append(f"Node '{item.title}' matched existing node '{matched_id}'.")
        candidate_id = f"cand_node_{uuid4().hex[:12]}"
        proposed_to_candidate[item.id] = candidate_id
        proposed_to_matched[item.id] = matched_id
        node_candidate = ExtractedNodeCandidate(
            id=candidate_id,
            ingestion_job_id=job_id,
            proposed_node_id=item.id,
            matched_existing_node_id=matched_id,
            title=item.title,
            category=item.category,
            summary=item.summary,
            description=item.description,
            status=item.status,
            importance=item.importance,
            action=action,
            review_status="pending",
        )
        session.add(node_candidate)
        session.flush()
        for detail in item.detail_blocks:
            session.add(
                ExtractedDetailCandidate(
                    id=f"cand_detail_{uuid4().hex[:12]}",
                    ingestion_job_id=job_id,
                    node_candidate_id=candidate_id if not matched_id else None,
                    matched_existing_node_id=matched_id,
                    block_type=detail.block_type,
                    title=detail.title,
                    content=detail.content,
                    action="append",
                    review_status="pending",
                )
            )

    for edge in payload.edges:
        source_id, source_candidate_id = resolve_node_reference(
            session, project_id, edge.source, proposed_to_matched, proposed_to_candidate
        )
        target_id, target_candidate_id = resolve_node_reference(
            session, project_id, edge.target, proposed_to_matched, proposed_to_candidate
        )
        review_status = "pending" if (source_id or source_candidate_id) and (target_id or target_candidate_id) else "needs-review"
        if not source_id and not source_candidate_id:
            warnings.append(f"Edge source '{edge.source}' could not be resolved.")
        if not target_id and not target_candidate_id:
            warnings.append(f"Edge target '{edge.target}' could not be resolved.")
        session.add(
            ExtractedEdgeCandidate(
                id=f"cand_edge_{uuid4().hex[:12]}",
                ingestion_job_id=job_id,
                source_title=edge.source,
                target_title=edge.target,
                source_node_candidate_id=source_candidate_id,
                target_node_candidate_id=target_candidate_id,
                matched_source_node_id=source_id,
                matched_target_node_id=target_id,
                relation_type=edge.relation_type,
                description=edge.description,
                strength=edge.strength,
                action="create",
                review_status=review_status,
            )
        )

    session.commit()
    return {
        "job_id": job_id,
        "status": "pending",
        "candidate_counts": {
            "nodes": len(payload.nodes),
            "edges": len(payload.edges),
            "details": sum(len(node.detail_blocks) for node in payload.nodes),
        },
        "warnings": warnings,
    }


def find_matching_node_id(session: Session, project_id: str, proposed_id: str, title: str) -> str | None:
    node = session.get(Node, proposed_id)
    if node and node.project_id == project_id:
        return node.id
    slug = slugify(title)
    node = session.scalar(select(Node).where(Node.project_id == project_id, Node.slug == slug))
    if node:
        return node.id
    node = session.scalar(select(Node).where(Node.project_id == project_id, Node.title == title))
    if node:
        return node.id
    alias = session.scalar(
        select(NodeAlias)
        .join(Node, Node.id == NodeAlias.node_id)
        .where(Node.project_id == project_id, NodeAlias.alias == title)
    )
    return alias.node_id if alias else None


def resolve_node_reference(
    session: Session,
    project_id: str,
    reference: str,
    proposed_to_matched: dict[str, str | None],
    proposed_to_candidate: dict[str, str],
) -> tuple[str | None, str | None]:
    if reference in proposed_to_matched:
        matched_id = proposed_to_matched[reference]
        return matched_id, None if matched_id else proposed_to_candidate.get(reference)
    node = session.get(Node, reference)
    if node and node.project_id == project_id:
        return node.id, None
    slug = slugify(reference)
    node = session.scalar(select(Node).where(Node.project_id == project_id, Node.slug == slug))
    if node:
        return node.id, None
    node = session.scalar(select(Node).where(Node.project_id == project_id, Node.title == reference))
    if node:
        return node.id, None
    alias = session.scalar(
        select(NodeAlias)
        .join(Node, Node.id == NodeAlias.node_id)
        .where(Node.project_id == project_id, NodeAlias.alias == reference)
    )
    return (alias.node_id, None) if alias else (None, None)


def get_job(session: Session, job_id: str) -> IngestionJob | None:
    return session.get(IngestionJob, job_id)


def get_candidates(session: Session, job_id: str) -> dict:
    node_candidates = list(
        session.scalars(select(ExtractedNodeCandidate).where(ExtractedNodeCandidate.ingestion_job_id == job_id)).all()
    )
    edge_candidates = list(
        session.scalars(select(ExtractedEdgeCandidate).where(ExtractedEdgeCandidate.ingestion_job_id == job_id)).all()
    )
    detail_candidates = list(
        session.scalars(select(ExtractedDetailCandidate).where(ExtractedDetailCandidate.ingestion_job_id == job_id)).all()
    )
    blocking_errors = []
    for edge in edge_candidates:
        if not edge.matched_source_node_id and not edge.source_node_candidate_id:
            blocking_errors.append(f"Edge candidate {edge.id} has unresolved source '{edge.source_title}'.")
        if not edge.matched_target_node_id and not edge.target_node_candidate_id:
            blocking_errors.append(f"Edge candidate {edge.id} has unresolved target '{edge.target_title}'.")
    return {
        "job_id": job_id,
        "node_candidates": [row_to_dict(item) for item in node_candidates],
        "edge_candidates": [row_to_dict(item) for item in edge_candidates],
        "detail_candidates": [row_to_dict(item) for item in detail_candidates],
        "blocking_errors": blocking_errors,
    }


def patch_candidate(session: Session, kind: str, candidate_id: str, patch: CandidatePatchIn) -> dict | None:
    model = {
        "nodes": ExtractedNodeCandidate,
        "edges": ExtractedEdgeCandidate,
        "details": ExtractedDetailCandidate,
    }[kind]
    candidate = session.get(model, candidate_id)
    if not candidate:
        return None
    data = patch.model_dump(exclude_none=True)
    allowed = {column.name for column in model.__table__.columns}
    for key, value in data.items():
        if key in allowed:
            setattr(candidate, key, value)
    session.commit()
    session.refresh(candidate)
    return row_to_dict(candidate)


def commit_job(session: Session, job_id: str) -> dict:
    job = session.get(IngestionJob, job_id)
    if not job:
        raise ValueError("Ingestion job not found")
    candidates = get_candidates(session, job_id)
    if candidates["blocking_errors"]:
        raise ValueError("; ".join(candidates["blocking_errors"]))

    created = {"nodes": [], "edges": [], "detail_blocks": []}
    updated = {"nodes": []}

    try:
        node_candidates = session.scalars(
            select(ExtractedNodeCandidate).where(
                ExtractedNodeCandidate.ingestion_job_id == job_id,
                ExtractedNodeCandidate.review_status == "approved",
            )
        ).all()
        node_candidate_to_committed: dict[str, str] = {}
        for candidate in node_candidates:
            if candidate.action == "update" and candidate.matched_existing_node_id:
                node = session.get(Node, candidate.matched_existing_node_id)
                if not node:
                    raise ValueError(f"Matched node {candidate.matched_existing_node_id} not found")
                node.title = candidate.title
                node.category = candidate.category
                node.summary = candidate.summary
                node.description = candidate.description
                node.status = candidate.status or node.status
                node.importance = candidate.importance or node.importance
                updated["nodes"].append(node.id)
                node_candidate_to_committed[candidate.id] = node.id
            else:
                node_id = candidate.proposed_node_id or f"node_{uuid4().hex[:12]}"
                node = Node(
                    id=node_id,
                    project_id=job.project_id,
                    title=candidate.title,
                    slug=slugify(candidate.title),
                    category=candidate.category,
                    summary=candidate.summary,
                    description=candidate.description,
                    status=candidate.status or "idea",
                    importance=candidate.importance or "medium",
                )
                session.add(node)
                created["nodes"].append(node.id)
                node_candidate_to_committed[candidate.id] = node.id

        session.flush()

        detail_candidates = session.scalars(
            select(ExtractedDetailCandidate).where(
                ExtractedDetailCandidate.ingestion_job_id == job_id,
                ExtractedDetailCandidate.review_status == "approved",
            )
        ).all()
        for candidate in detail_candidates:
            node_id = candidate.matched_existing_node_id
            if candidate.node_candidate_id and candidate.node_candidate_id in node_candidate_to_committed:
                node_id = node_candidate_to_committed[candidate.node_candidate_id]
            if not node_id:
                raise ValueError(f"Detail candidate {candidate.id} has no target node")
            detail = DetailBlock(
                id=f"detail_{uuid4().hex[:12]}",
                node_id=node_id,
                block_type=candidate.block_type,
                title=candidate.title,
                content=candidate.content,
                sort_order=next_detail_sort_order(session, node_id),
            )
            session.add(detail)
            created["detail_blocks"].append(detail.id)

        edge_candidates = session.scalars(
            select(ExtractedEdgeCandidate).where(
                ExtractedEdgeCandidate.ingestion_job_id == job_id,
                ExtractedEdgeCandidate.review_status == "approved",
            )
        ).all()
        for candidate in edge_candidates:
            source_node_id = candidate.matched_source_node_id
            target_node_id = candidate.matched_target_node_id
            if candidate.source_node_candidate_id:
                source_node_id = node_candidate_to_committed.get(candidate.source_node_candidate_id)
            if candidate.target_node_candidate_id:
                target_node_id = node_candidate_to_committed.get(candidate.target_node_candidate_id)
            if not source_node_id or not target_node_id:
                raise ValueError(f"Edge candidate {candidate.id} has unresolved endpoint")
            edge = Edge(
                id=f"edge_{uuid4().hex[:12]}",
                project_id=job.project_id,
                source_node_id=source_node_id,
                target_node_id=target_node_id,
                relation_type=candidate.relation_type,
                description=candidate.description,
                strength=candidate.strength,
            )
            session.add(edge)
            created["edges"].append(edge.id)

        job.status = "committed"
        session.commit()
    except (IntegrityError, ValueError):
        session.rollback()
        raise

    return {"job_id": job_id, "status": "committed", "created": created, "updated": updated}


def reject_job(session: Session, job_id: str) -> dict:
    job = session.get(IngestionJob, job_id)
    if not job:
        raise ValueError("Ingestion job not found")
    job.status = "rejected"
    session.commit()
    return {"job_id": job_id, "status": "rejected"}


def next_detail_sort_order(session: Session, node_id: str) -> int:
    blocks = session.scalars(select(DetailBlock).where(DetailBlock.node_id == node_id)).all()
    return max((block.sort_order for block in blocks), default=0) + 1


def slugify(value: str) -> str:
    return "_".join("".join(ch.lower() if ch.isalnum() else " " for ch in value).split())


def row_to_dict(row) -> dict[str, Any]:
    return {column.name: getattr(row, column.name) for column in row.__table__.columns}
