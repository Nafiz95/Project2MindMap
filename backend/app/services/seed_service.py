import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import (
    Attachment,
    DetailBlock,
    Edge,
    ExtractedDetailCandidate,
    ExtractedEdgeCandidate,
    ExtractedNodeCandidate,
    IngestionJob,
    Node,
    NodeAlias,
    NodeSource,
    NodeTag,
    Project,
    Source,
    Tag,
)
from app.services.validation import validate_seed_payload


def load_seed_payload(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def validate_seed_file(path: Path) -> list[str]:
    return validate_seed_payload(load_seed_payload(path))


def seed_database(session: Session, seed_path: Path) -> None:
    payload = load_seed_payload(seed_path)
    errors = validate_seed_payload(payload)
    if errors:
        raise ValueError("\n".join(errors))

    project_data = payload["project"]
    project = Project(
        id=project_data["id"],
        name=project_data["name"],
        description=project_data.get("description"),
    )
    session.merge(project)
    session.flush()

    for item in payload.get("nodes", []):
        session.merge(Node(**item))
    session.flush()

    for item in payload.get("edges", []):
        data = dict(item)
        data.setdefault("project_id", project.id)
        session.merge(Edge(**data))

    for item in payload.get("detail_blocks", []):
        session.merge(DetailBlock(**item))

    for item in payload.get("tags", []):
        session.merge(Tag(**item))

    for idx, item in enumerate(payload.get("node_tags", [])):
        session.merge(NodeTag(**item))

    for item in payload.get("sources", []):
        data = dict(item)
        data.setdefault("project_id", project.id)
        session.merge(Source(**data))

    for item in payload.get("node_sources", []):
        session.merge(NodeSource(**item))

    for item in payload.get("attachments", []):
        session.merge(Attachment(**item))

    for idx, item in enumerate(payload.get("aliases", payload.get("node_aliases", []))):
        data = dict(item)
        data.setdefault("id", f"alias_{data['node_id']}_{idx}")
        session.merge(NodeAlias(**data))

    for item in payload.get("ingestion_jobs", []):
        session.merge(IngestionJob(**item))
    for item in payload.get("extracted_node_candidates", []):
        session.merge(ExtractedNodeCandidate(**item))
    for item in payload.get("extracted_edge_candidates", []):
        session.merge(ExtractedEdgeCandidate(**item))
    for item in payload.get("extracted_detail_candidates", []):
        session.merge(ExtractedDetailCandidate(**item))

    session.commit()
