from collections import Counter
from typing import Any

from app.constants import (
    DETAIL_BLOCK_TYPES,
    EDGE_STRENGTHS,
    IMPORTANCE_VALUES,
    NODE_CATEGORIES,
    NODE_STATUSES,
    RELATION_TYPES,
)


def validate_seed_payload(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    node_ids = {node["id"] for node in payload.get("nodes", [])}

    slugs = [(node.get("project_id"), node.get("slug")) for node in payload.get("nodes", [])]
    for key, count in Counter(slugs).items():
        if key[0] and key[1] and count > 1:
            errors.append(f"Duplicate node slug in project: {key[0]}/{key[1]}")

    edge_keys = [
        (
            edge.get("project_id") or payload.get("project", {}).get("id"),
            edge.get("source_node_id"),
            edge.get("target_node_id"),
            edge.get("relation_type"),
        )
        for edge in payload.get("edges", [])
    ]
    for key, count in Counter(edge_keys).items():
        if all(key) and count > 1:
            errors.append(f"Duplicate typed edge: {key}")

    for node in payload.get("nodes", []):
        if node.get("category") not in NODE_CATEGORIES:
            errors.append(f"Invalid node category for {node.get('id')}: {node.get('category')}")
        if node.get("status") not in NODE_STATUSES:
            errors.append(f"Invalid node status for {node.get('id')}: {node.get('status')}")
        if node.get("importance") not in IMPORTANCE_VALUES:
            errors.append(f"Invalid node importance for {node.get('id')}: {node.get('importance')}")
        parent_id = node.get("parent_id")
        if parent_id and parent_id not in node_ids:
            errors.append(f"Node {node.get('id')} has unknown parent_id {parent_id}")

    for edge in payload.get("edges", []):
        if edge.get("source_node_id") not in node_ids:
            errors.append(f"Edge {edge.get('id')} has unknown source {edge.get('source_node_id')}")
        if edge.get("target_node_id") not in node_ids:
            errors.append(f"Edge {edge.get('id')} has unknown target {edge.get('target_node_id')}")
        if edge.get("relation_type") not in RELATION_TYPES:
            errors.append(f"Invalid relation type for {edge.get('id')}: {edge.get('relation_type')}")
        if edge.get("strength", "medium") not in EDGE_STRENGTHS:
            errors.append(f"Invalid edge strength for {edge.get('id')}: {edge.get('strength')}")

    for detail in payload.get("detail_blocks", []):
        if detail.get("node_id") not in node_ids:
            errors.append(f"Detail block {detail.get('id')} has unknown node {detail.get('node_id')}")
        if detail.get("block_type") not in DETAIL_BLOCK_TYPES:
            errors.append(f"Invalid detail block type for {detail.get('id')}: {detail.get('block_type')}")

    for alias in payload.get("aliases", []):
        if alias.get("node_id") not in node_ids:
            errors.append(f"Alias {alias.get('alias')} has unknown node {alias.get('node_id')}")

    return errors
