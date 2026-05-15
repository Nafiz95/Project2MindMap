import csv
import io

from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.models import (
    Attachment,
    DetailBlock,
    Edge,
    Node,
    NodeAlias,
    NodeSource,
    NodeTag,
    Project,
    Source,
    Tag,
)
from datetime import datetime, timezone

from app.services.database_profiles import LLM_WIKI_PROFILE, detect_session_profile


def get_activity(session: Session, project_id: str, since: str, limit: int) -> list[dict]:
    try:
        since_dt = datetime.fromisoformat(since.replace("Z", "+00:00")) if since else datetime.min.replace(tzinfo=timezone.utc)
    except ValueError:
        since_dt = datetime.min.replace(tzinfo=timezone.utc)

    events: list[dict] = []

    # Gather node events
    try:
        nodes = session.scalars(
            select(Node)
            .where(Node.project_id == project_id)
            .order_by(Node.updated_at.desc())
            .limit(limit * 3)
        ).all()
        for node in nodes:
            if not node.updated_at:
                continue
            try:
                updated = datetime.fromisoformat(str(node.updated_at).replace("Z", "+00:00"))
                if updated.tzinfo is None:
                    updated = updated.replace(tzinfo=timezone.utc)
            except (ValueError, AttributeError):
                continue
            if updated < since_dt:
                continue
            events.append({
                "when": updated.isoformat(),
                "kind": "node",
                "verb": "updated",
                "id": node.id,
                "title": node.title,
                "category": node.category,
                "note": node.summary[:80] if node.summary else None,
            })
    except Exception:
        pass

    # Gather edge events
    try:
        edges = session.scalars(
            select(Edge)
            .where(Edge.project_id == project_id)
            .order_by(Edge.updated_at.desc())
            .limit(limit)
        ).all()
        for edge in edges:
            if not edge.updated_at:
                continue
            try:
                updated = datetime.fromisoformat(str(edge.updated_at).replace("Z", "+00:00"))
                if updated.tzinfo is None:
                    updated = updated.replace(tzinfo=timezone.utc)
            except (ValueError, AttributeError):
                continue
            if updated < since_dt:
                continue
            events.append({
                "when": updated.isoformat(),
                "kind": "edge",
                "verb": "updated",
                "id": edge.id,
                "title": f"{edge.relation_type}",
                "category": None,
                "note": edge.description[:80] if edge.description else None,
            })
    except Exception:
        pass

    # Sort by recency and trim
    events.sort(key=lambda e: e["when"], reverse=True)
    return events[:limit]


def list_projects(session: Session) -> list[Project] | list[dict]:
    if is_llm_wiki(session):
        return wiki_list_projects(session)
    return list(session.scalars(select(Project).order_by(Project.name)).all())


def get_project(session: Session, project_id: str) -> Project | dict | None:
    if is_llm_wiki(session):
        return wiki_get_project(session, project_id)
    return session.get(Project, project_id)


def get_tree(session: Session, project_id: str) -> dict:
    if is_llm_wiki(session):
        return wiki_get_tree(session, project_id)
    nodes = list(session.scalars(select(Node).where(Node.project_id == project_id).order_by(Node.title)).all())
    children: dict[str | None, list[str]] = {}
    for node in nodes:
        children.setdefault(node.parent_id, []).append(node.id)
    root = next((node.id for node in nodes if node.parent_id is None), None)
    return {
        "project_id": project_id,
        "root_id": root,
        "root_ids": [root] if root else [],
        "nodes": [
            {
                "id": node.id,
                "title": node.title,
                "category": node.category,
                "status": node.status,
                "importance": node.importance,
                "parent_id": node.parent_id,
                "child_ids": sorted(children.get(node.id, [])),
                "summary": node.summary,
            }
            for node in nodes
        ],
    }


def get_node_detail(session: Session, project_id: str, node_id: str) -> dict | None:
    if is_llm_wiki(session):
        return wiki_get_node_detail(session, project_id, node_id)
    node = session.get(Node, node_id)
    if not node or node.project_id != project_id:
        return None

    details = list(
        session.scalars(select(DetailBlock).where(DetailBlock.node_id == node_id).order_by(DetailBlock.sort_order)).all()
    )
    aliases = [item.alias for item in session.scalars(select(NodeAlias).where(NodeAlias.node_id == node_id)).all()]
    attachments = [
        {
            "id": item.id,
            "filename": item.filename,
            "file_type": item.file_type,
            "path": item.path,
            "description": item.description,
        }
        for item in session.scalars(select(Attachment).where(Attachment.node_id == node_id)).all()
    ]
    tags = [
        tag.name
        for tag in session.scalars(
            select(Tag).join(NodeTag, NodeTag.tag_id == Tag.id).where(NodeTag.node_id == node_id).order_by(Tag.name)
        ).all()
    ]
    sources = list(
        session.scalars(
            select(Source)
            .join(NodeSource, NodeSource.source_id == Source.id)
            .where(NodeSource.node_id == node_id)
            .order_by(Source.title)
        ).all()
    )

    related_edges = list(
        session.scalars(
            select(Edge).where(
                Edge.project_id == project_id,
                or_(Edge.source_node_id == node_id, Edge.target_node_id == node_id),
            )
        ).all()
    )
    related_ids = sorted(
        {
            edge.target_node_id if edge.source_node_id == node_id else edge.source_node_id
            for edge in related_edges
        }
    )
    related_nodes = list(session.scalars(select(Node).where(Node.id.in_(related_ids))).all()) if related_ids else []

    return {
        "node": node,
        "detail_blocks": details,
        "tags": tags,
        "aliases": aliases,
        "sources": sources,
        "attachments": attachments,
        "related_edges": related_edges,
        "related_nodes": [
            {
                "id": item.id,
                "title": item.title,
                "category": item.category,
                "status": item.status,
                "importance": item.importance,
            }
            for item in related_nodes
        ],
        "claims": [],
        "tasks": [],
        "open_questions": [],
        "lint_findings": [],
    }


def search_nodes(session: Session, project_id: str, query: str) -> list[dict]:
    if is_llm_wiki(session):
        return wiki_search_nodes(session, project_id, query)
    nodes = list(session.scalars(select(Node).where(Node.project_id == project_id)).all())
    matches: list[dict] = []
    for node in nodes:
        detail_text = " ".join(
            block.content or "" for block in session.scalars(select(DetailBlock).where(DetailBlock.node_id == node.id))
        )
        tag_text = " ".join(
            tag.name
            for tag in session.scalars(
                select(Tag).join(NodeTag, NodeTag.tag_id == Tag.id).where(NodeTag.node_id == node.id)
            )
        )
        alias_text = " ".join(alias.alias for alias in session.scalars(select(NodeAlias).where(NodeAlias.node_id == node.id)))
        source_text = " ".join(
            source.title
            for source in session.scalars(
                select(Source).join(NodeSource, NodeSource.source_id == Source.id).where(NodeSource.node_id == node.id)
            )
        )
        haystack = " ".join(
            [
                node.title or "",
                node.summary or "",
                node.description or "",
                detail_text,
                tag_text,
                alias_text,
                source_text,
            ]
        ).lower()
        if query.lower() in haystack:
            matches.append(
                {
                    "id": node.id,
                    "title": node.title,
                    "category": node.category,
                    "status": node.status,
                    "importance": node.importance,
                    "summary": node.summary,
                }
            )
    return matches


def get_graph(session: Session, project_id: str) -> dict:
    if is_llm_wiki(session):
        return wiki_get_graph(session, project_id)
    nodes = list(session.scalars(select(Node).where(Node.project_id == project_id).order_by(Node.title)).all())
    edges = list(session.scalars(select(Edge).where(Edge.project_id == project_id).order_by(Edge.relation_type)).all())
    return {
        "project_id": project_id,
        "nodes": [
            {
                "id": node.id,
                "title": node.title,
                "category": node.category,
                "status": node.status,
                "importance": node.importance,
                "summary": node.summary,
                "parent_id": node.parent_id,
            }
            for node in nodes
        ],
        "edges": [row_to_dict(edge) for edge in edges],
    }


def get_dashboard(session: Session, project_id: str) -> dict:
    if is_llm_wiki(session):
        return wiki_get_dashboard(session, project_id)
    nodes = list(session.scalars(select(Node).where(Node.project_id == project_id)).all())
    edges_count = session.scalar(select(func.count()).select_from(Edge).where(Edge.project_id == project_id)) or 0
    sources_count = session.scalar(select(func.count()).select_from(Source).where(Source.project_id == project_id)) or 0
    active_experiments = [
        summary_node(node)
        for node in nodes
        if node.category == "Experiment" and node.status == "active"
    ][:8]
    open_questions = [
        summary_node(node)
        for node in nodes
        if node.category == "Open Question" or "open question" in node.title.lower()
    ][:8]
    writing_grants = [
        summary_node(node)
        for node in nodes
        if node.category in {"Writing", "Grant", "Paper"}
    ][:8]
    recent_nodes = [summary_node(node) for node in sorted(nodes, key=lambda item: item.updated_at or "", reverse=True)[:8]]
    return {
        "counts": {
            "nodes": len(nodes),
            "edges": edges_count,
            "sources": sources_count,
            "active": sum(1 for node in nodes if node.status == "active"),
            "high_importance": sum(1 for node in nodes if node.importance == "high"),
        },
        "active_experiments": active_experiments,
        "open_questions": open_questions,
        "writing_and_grants": writing_grants,
        "recent_nodes": recent_nodes,
        "wiki_dashboard": None,
    }


def summary_node(node: Node) -> dict:
    return {
        "id": node.id,
        "title": node.title,
        "category": node.category,
        "status": node.status,
        "importance": node.importance,
        "summary": node.summary,
    }


def export_project(session: Session, project_id: str) -> dict:
    if is_llm_wiki(session):
        return wiki_export_project(session, project_id)
    project = session.get(Project, project_id)
    return {
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
        }
        if project
        else None,
        "nodes": [row_to_dict(item) for item in session.scalars(select(Node).where(Node.project_id == project_id)).all()],
        "edges": [row_to_dict(item) for item in session.scalars(select(Edge).where(Edge.project_id == project_id)).all()],
        "detail_blocks": [
            row_to_dict(item)
            for item in session.scalars(
                select(DetailBlock).join(Node, Node.id == DetailBlock.node_id).where(Node.project_id == project_id)
            ).all()
        ],
        "tags": [row_to_dict(item) for item in session.scalars(select(Tag)).all()],
        "node_tags": [row_to_dict(item) for item in session.scalars(select(NodeTag)).all()],
        "sources": [row_to_dict(item) for item in session.scalars(select(Source).where(Source.project_id == project_id)).all()],
        "node_sources": [row_to_dict(item) for item in session.scalars(select(NodeSource)).all()],
        "attachments": [
            row_to_dict(item)
            for item in session.scalars(
                select(Attachment).join(Node, Node.id == Attachment.node_id).where(Node.project_id == project_id)
            ).all()
        ],
        "node_aliases": [
            row_to_dict(item)
            for item in session.scalars(
                select(NodeAlias).join(Node, Node.id == NodeAlias.node_id).where(Node.project_id == project_id)
            ).all()
        ],
    }


def export_markdown(session: Session, project_id: str) -> str:
    project = session.get(Project, project_id)
    if is_llm_wiki(session):
        project = wiki_get_project(session, project_id)
    payload = export_project(session, project_id)
    nodes = payload["nodes"]
    details_by_node: dict[str, list[dict]] = {}
    for block in payload["detail_blocks"]:
        details_by_node.setdefault(block["node_id"], []).append(block)
    project_name = project["name"] if isinstance(project, dict) else project.name if project else project_id
    lines = [f"# {project_name}", ""]
    for node in sorted(nodes, key=lambda item: (item.get("category") or "", item.get("title") or "")):
        lines.extend(
            [
                f"## {node['title']}",
                "",
                f"- ID: `{node['id']}`",
                f"- Category: {node['category']}",
                f"- Status: {node['status']}",
                f"- Importance: {node['importance']}",
                "",
                node.get("summary") or "",
                "",
            ]
        )
        for block in sorted(details_by_node.get(node["id"], []), key=lambda item: item.get("sort_order") or 0):
            lines.extend([f"### {block['title']}", "", block["content"], ""])
    return "\n".join(lines).strip() + "\n"


def export_mermaid(session: Session, project_id: str) -> str:
    payload = export_project(session, project_id)
    node_titles = {node["id"]: node["title"] for node in payload["nodes"]}
    lines = ["graph TD"]
    for edge in payload["edges"]:
        source = edge["source_node_id"]
        target = edge["target_node_id"]
        source_label = escape_mermaid(node_titles.get(source, source))
        target_label = escape_mermaid(node_titles.get(target, target))
        relation = escape_mermaid(edge["relation_type"])
        lines.append(f'  {source}["{source_label}"] -->|{relation}| {target}["{target_label}"]')
    return "\n".join(lines) + "\n"


def export_csv_bundle(session: Session, project_id: str) -> dict[str, str]:
    payload = export_project(session, project_id)
    return {
        "nodes.csv": rows_to_csv(payload["nodes"]),
        "edges.csv": rows_to_csv(payload["edges"]),
    }


def export_obsidian(session: Session, project_id: str) -> dict[str, str]:
    payload = export_project(session, project_id)
    edges_by_node: dict[str, list[dict]] = {}
    for edge in payload["edges"]:
        edges_by_node.setdefault(edge["source_node_id"], []).append(edge)
        edges_by_node.setdefault(edge["target_node_id"], []).append(edge)
    details_by_node: dict[str, list[dict]] = {}
    for block in payload["detail_blocks"]:
        details_by_node.setdefault(block["node_id"], []).append(block)
    titles = {node["id"]: node["title"] for node in payload["nodes"]}
    files: dict[str, str] = {}
    for node in payload["nodes"]:
        lines = [
            "---",
            f"id: {node['id']}",
            f"category: {node['category']}",
            f"status: {node['status']}",
            f"importance: {node['importance']}",
            "---",
            "",
            f"# {node['title']}",
            "",
            node.get("summary") or "",
            "",
        ]
        for block in sorted(details_by_node.get(node["id"], []), key=lambda item: item.get("sort_order") or 0):
            lines.extend([f"## {block['title']}", "", block["content"], ""])
        related = []
        for edge in edges_by_node.get(node["id"], []):
            other_id = edge["target_node_id"] if edge["source_node_id"] == node["id"] else edge["source_node_id"]
            related.append(f"- [[{safe_filename(titles.get(other_id, other_id))}]] ({edge['relation_type']})")
        if related:
            lines.extend(["## Related", "", *related, ""])
        files[f"{safe_filename(node['title'])}.md"] = "\n".join(lines).strip() + "\n"
    return files


def is_llm_wiki(session: Session) -> bool:
    return detect_session_profile(session) == LLM_WIKI_PROFILE


def mapping_rows(session: Session, sql: str, **params) -> list[dict]:
    return [dict(row) for row in session.execute(text(sql), params).mappings().all()]


def mapping_row(session: Session, sql: str, **params) -> dict | None:
    row = session.execute(text(sql), params).mappings().first()
    return dict(row) if row else None


def scalar_value(session: Session, sql: str, **params) -> int:
    return int(session.execute(text(sql), params).scalar() or 0)


def wiki_list_projects(session: Session) -> list[dict]:
    return mapping_rows(session, "select id, name, description from projects order by name")


def wiki_get_project(session: Session, project_id: str) -> dict | None:
    return mapping_row(
        session,
        "select id, name, description from projects where id = :project_id",
        project_id=project_id,
    )


def wiki_get_pages(session: Session, project_id: str) -> list[dict]:
    return mapping_rows(
        session,
        """
        select
            id,
            project_id,
            title,
            slug,
            page_type as category,
            summary,
            body,
            status,
            importance,
            parent_page_id as parent_id,
            created_at,
            updated_at
        from wiki_pages
        where project_id = :project_id
        order by title
        """,
        project_id=project_id,
    )


def wiki_tree_nodes(pages: list[dict]) -> tuple[list[str], list[dict]]:
    children: dict[str | None, list[str]] = {}
    for page in pages:
        children.setdefault(page["parent_id"], []).append(page["id"])
    roots = [
        page
        for page in pages
        if page["parent_id"] is None
    ]
    roots.sort(key=lambda page: (page["category"] != "root", page["title"].lower()))
    root_ids = [page["id"] for page in roots]
    nodes = [
        {
            "id": page["id"],
            "title": page["title"],
            "category": page["category"],
            "status": page["status"] or "active",
            "importance": page["importance"] or "medium",
            "parent_id": page["parent_id"],
            "child_ids": sorted(children.get(page["id"], [])),
            "summary": page["summary"],
        }
        for page in pages
    ]
    return root_ids, nodes


def wiki_get_tree(session: Session, project_id: str) -> dict:
    pages = wiki_get_pages(session, project_id)
    root_ids, nodes = wiki_tree_nodes(pages)
    return {
        "project_id": project_id,
        "root_id": root_ids[0] if root_ids else None,
        "root_ids": root_ids,
        "nodes": nodes,
    }


def wiki_source_rows(session: Session, page_id: str) -> list[dict]:
    return mapping_rows(
        session,
        """
        select
            sources.id,
            sources.source_type,
            sources.title,
            sources.path_or_label as path_or_url,
            null as citation_key,
            sources.note
        from sources
        join page_sources on page_sources.source_id = sources.id
        where page_sources.page_id = :page_id
        order by sources.title
        """,
        page_id=page_id,
    )


def wiki_get_node_detail(session: Session, project_id: str, node_id: str) -> dict | None:
    page = mapping_row(
        session,
        """
        select
            id,
            project_id,
            title,
            slug,
            page_type as category,
            summary,
            body,
            status,
            importance,
            parent_page_id as parent_id
        from wiki_pages
        where project_id = :project_id and id = :node_id
        """,
        project_id=project_id,
        node_id=node_id,
    )
    if not page:
        return None

    related_edges = mapping_rows(
        session,
        """
        select
            id,
            project_id,
            source_page_id as source_node_id,
            target_page_id as target_node_id,
            relation_type,
            description,
            coalesce(strength, 'medium') as strength
        from wiki_links
        where project_id = :project_id
          and (source_page_id = :node_id or target_page_id = :node_id)
        order by relation_type, id
        """,
        project_id=project_id,
        node_id=node_id,
    )
    related_ids = sorted(
        {
            edge["target_node_id"] if edge["source_node_id"] == node_id else edge["source_node_id"]
            for edge in related_edges
        }
    )
    related_nodes = []
    if related_ids:
        placeholders = ", ".join(f":related_{index}" for index, _ in enumerate(related_ids))
        params = {f"related_{index}": value for index, value in enumerate(related_ids)}
        related_nodes = mapping_rows(
            session,
            f"""
            select
                id,
                title,
                page_type as category,
                status,
                importance
            from wiki_pages
            where id in ({placeholders})
            order by title
            """,
            **params,
        )

    body = page.pop("body")
    detail_blocks = []
    if body:
        detail_blocks.append(
            {
                "id": f"body_{node_id}",
                "node_id": node_id,
                "block_type": "overview",
                "title": "Page Body",
                "content": body,
                "sort_order": 0,
            }
        )

    return {
        "node": page,
        "detail_blocks": detail_blocks,
        "tags": [
            row["name"]
            for row in mapping_rows(
                session,
                """
                select tags.name
                from tags
                join page_tags on page_tags.tag_id = tags.id
                where page_tags.page_id = :page_id
                order by tags.name
                """,
                page_id=node_id,
            )
        ],
        "aliases": [
            row["alias"]
            for row in mapping_rows(
                session,
                "select alias from aliases where page_id = :page_id order by alias",
                page_id=node_id,
            )
        ],
        "sources": wiki_source_rows(session, node_id),
        "attachments": [],
        "related_edges": related_edges,
        "related_nodes": related_nodes,
        "claims": wiki_enrichment_rows(
            session,
            """
            select id, page_id as related_page_id, claim_text as title, claim_text as description, claim_type, confidence, status
            from claims
            where page_id = :page_id
            order by confidence desc, created_at desc
            """,
            node_id,
        ),
        "tasks": wiki_enrichment_rows(
            session,
            """
            select id, related_page_id, title, description, priority, status
            from tasks
            where related_page_id = :page_id
            order by case priority when 'high' then 0 when 'medium' then 1 else 2 end, updated_at desc
            """,
            node_id,
        ),
        "open_questions": wiki_enrichment_rows(
            session,
            """
            select id, related_page_id, title, description, priority, status
            from open_questions
            where related_page_id = :page_id
            order by case priority when 'high' then 0 when 'medium' then 1 else 2 end, updated_at desc
            """,
            node_id,
        ),
        "lint_findings": wiki_enrichment_rows(
            session,
            """
            select id, related_page_id, title, description, finding_type, severity, status
            from lint_findings
            where related_page_id = :page_id
            order by case severity when 'high' then 0 when 'medium' then 1 else 2 end, updated_at desc
            """,
            node_id,
        ),
    }


def wiki_enrichment_rows(session: Session, sql: str, page_id: str) -> list[dict]:
    rows = mapping_rows(session, sql, page_id=page_id)
    page_ids = {row["related_page_id"] for row in rows if row.get("related_page_id")}
    title_by_page = wiki_page_titles(session, page_ids)
    for row in rows:
        related_page_id = row.get("related_page_id")
        row["related_page_title"] = title_by_page.get(related_page_id) if related_page_id else None
    return rows


def wiki_page_titles(session: Session, page_ids: set[str]) -> dict[str, str]:
    if not page_ids:
        return {}
    values = sorted(page_ids)
    placeholders = ", ".join(f":page_{index}" for index, _ in enumerate(values))
    params = {f"page_{index}": value for index, value in enumerate(values)}
    rows = mapping_rows(
        session,
        f"select id, title from wiki_pages where id in ({placeholders})",
        **params,
    )
    return {row["id"]: row["title"] for row in rows}


def wiki_search_nodes(session: Session, project_id: str, query: str) -> list[dict]:
    pages = wiki_get_pages(session, project_id)
    matches = []
    needle = query.lower()
    for page in pages:
        extras = mapping_row(
            session,
            """
            select
                coalesce((select group_concat(alias, ' ') from aliases where page_id = :page_id), '') as aliases_text,
                coalesce((select group_concat(tags.name, ' ') from tags join page_tags on page_tags.tag_id = tags.id where page_tags.page_id = :page_id), '') as tags_text,
                coalesce((select group_concat(sources.title, ' ') from sources join page_sources on page_sources.source_id = sources.id where page_sources.page_id = :page_id), '') as source_text,
                coalesce((select group_concat(claim_text, ' ') from claims where page_id = :page_id), '') as claims_text,
                coalesce((select group_concat(title || ' ' || coalesce(description, ''), ' ') from tasks where related_page_id = :page_id), '') as task_text,
                coalesce((select group_concat(title || ' ' || coalesce(description, ''), ' ') from open_questions where related_page_id = :page_id), '') as question_text,
                coalesce((select group_concat(title || ' ' || coalesce(description, ''), ' ') from lint_findings where related_page_id = :page_id), '') as lint_text
            """,
            page_id=page["id"],
        ) or {}
        haystack = " ".join(
            [
                page["title"] or "",
                page["slug"] or "",
                page["summary"] or "",
                page["body"] or "",
                extras.get("aliases_text") or "",
                extras.get("tags_text") or "",
                extras.get("source_text") or "",
                extras.get("claims_text") or "",
                extras.get("task_text") or "",
                extras.get("question_text") or "",
                extras.get("lint_text") or "",
            ]
        ).lower()
        if needle in haystack:
            matches.append(wiki_summary_page(page))
    return matches


def wiki_get_graph(session: Session, project_id: str) -> dict:
    pages = wiki_get_pages(session, project_id)
    edges = mapping_rows(
        session,
        """
        select
            id,
            project_id,
            source_page_id as source_node_id,
            target_page_id as target_node_id,
            relation_type,
            description,
            coalesce(strength, 'medium') as strength
        from wiki_links
        where project_id = :project_id
        order by relation_type, id
        """,
        project_id=project_id,
    )
    return {
        "project_id": project_id,
        "nodes": [
            {
                **wiki_summary_page(page),
                "parent_id": page["parent_id"],
            }
            for page in pages
        ],
        "edges": edges,
    }


def wiki_get_dashboard(session: Session, project_id: str) -> dict:
    pages = wiki_get_pages(session, project_id)
    recent = sorted(pages, key=lambda page: page.get("updated_at") or "", reverse=True)[:8]
    links_count = scalar_value(session, "select count(*) from wiki_links where project_id = :project_id", project_id=project_id)
    sources_count = scalar_value(session, "select count(*) from sources where project_id = :project_id", project_id=project_id)
    questions = wiki_global_enrichment(
        session,
        """
        select id, related_page_id, title, description, priority, status
        from open_questions
        where project_id = :project_id and status = 'open'
        order by case priority when 'high' then 0 when 'medium' then 1 else 2 end, updated_at desc
        limit 8
        """,
        project_id,
    )
    tasks = wiki_global_enrichment(
        session,
        """
        select id, related_page_id, title, description, priority, status
        from tasks
        where project_id = :project_id and status = 'open'
        order by case priority when 'high' then 0 when 'medium' then 1 else 2 end, updated_at desc
        limit 8
        """,
        project_id,
    )
    findings = wiki_global_enrichment(
        session,
        """
        select id, related_page_id, title, description, finding_type, severity, status
        from lint_findings
        where project_id = :project_id and status = 'open'
        order by case severity when 'high' then 0 when 'medium' then 1 else 2 end, updated_at desc
        limit 8
        """,
        project_id,
    )
    claims = wiki_global_enrichment(
        session,
        """
        select id, page_id as related_page_id, claim_text as title, claim_text as description, claim_type, confidence, status
        from claims
        where project_id = :project_id and status = 'active'
        order by confidence desc, updated_at desc
        limit 8
        """,
        project_id,
    )
    return {
        "counts": {
            "nodes": len(pages),
            "edges": links_count,
            "sources": sources_count,
            "active": sum(1 for page in pages if page["status"] == "active"),
            "high_importance": sum(1 for page in pages if page["importance"] == "high"),
        },
        "active_experiments": [],
        "open_questions": [],
        "writing_and_grants": [],
        "recent_nodes": [wiki_summary_page(page) for page in recent],
        "wiki_dashboard": {
            "counts": {
                "claims": scalar_value(session, "select count(*) from claims where project_id = :project_id", project_id=project_id),
                "tasks": scalar_value(session, "select count(*) from tasks where project_id = :project_id", project_id=project_id),
                "open_questions": scalar_value(session, "select count(*) from open_questions where project_id = :project_id", project_id=project_id),
                "lint_findings": scalar_value(session, "select count(*) from lint_findings where project_id = :project_id", project_id=project_id),
            },
            "tasks": tasks,
            "open_questions": questions,
            "lint_findings": findings,
            "claims": claims,
        },
    }


def wiki_global_enrichment(session: Session, sql: str, project_id: str) -> list[dict]:
    rows = mapping_rows(session, sql, project_id=project_id)
    title_by_page = wiki_page_titles(
        session,
        {row["related_page_id"] for row in rows if row.get("related_page_id")},
    )
    for row in rows:
        related_page_id = row.get("related_page_id")
        row["related_page_title"] = title_by_page.get(related_page_id) if related_page_id else None
    return rows


def wiki_summary_page(page: dict) -> dict:
    return {
        "id": page["id"],
        "title": page["title"],
        "category": page["category"],
        "status": page["status"] or "active",
        "importance": page["importance"] or "medium",
        "summary": page["summary"],
    }


def wiki_export_project(session: Session, project_id: str) -> dict:
    project = wiki_get_project(session, project_id)
    pages = wiki_get_pages(session, project_id)
    edges = mapping_rows(
        session,
        """
        select
            id,
            project_id,
            source_page_id as source_node_id,
            target_page_id as target_node_id,
            relation_type,
            description,
            coalesce(strength, 'medium') as strength,
            created_at,
            updated_at
        from wiki_links
        where project_id = :project_id
        order by relation_type, id
        """,
        project_id=project_id,
    )
    detail_blocks = [
        {
            "id": f"body_{page['id']}",
            "node_id": page["id"],
            "block_type": "overview",
            "title": "Page Body",
            "content": page["body"],
            "sort_order": 0,
        }
        for page in pages
        if page.get("body")
    ]
    return {
        "project": project,
        "nodes": [
            {
                "id": page["id"],
                "project_id": page["project_id"],
                "title": page["title"],
                "slug": page["slug"],
                "category": page["category"],
                "summary": page["summary"],
                "description": None,
                "status": page["status"] or "active",
                "importance": page["importance"] or "medium",
                "parent_id": page["parent_id"],
                "created_at": page["created_at"],
                "updated_at": page["updated_at"],
            }
            for page in pages
        ],
        "edges": edges,
        "detail_blocks": detail_blocks,
        "tags": mapping_rows(session, "select id, name, color from tags order by name"),
        "node_tags": mapping_rows(
            session,
            "select page_id as node_id, tag_id from page_tags order by page_id, tag_id",
        ),
        "sources": mapping_rows(
            session,
            """
            select
                id,
                project_id,
                source_type,
                title,
                path_or_label as path_or_url,
                null as citation_key,
                note,
                created_at,
                updated_at
            from sources
            where project_id = :project_id
            order by title
            """,
            project_id=project_id,
        ),
        "node_sources": mapping_rows(
            session,
            """
            select
                page_sources.page_id as node_id,
                page_sources.source_id,
                page_sources.evidence_note,
                null as source_span
            from page_sources
            join sources on sources.id = page_sources.source_id
            where sources.project_id = :project_id
            order by page_sources.page_id, page_sources.source_id
            """,
            project_id=project_id,
        ),
        "attachments": [],
        "node_aliases": mapping_rows(
            session,
            """
            select aliases.id, aliases.page_id as node_id, aliases.alias
            from aliases
            join wiki_pages on wiki_pages.id = aliases.page_id
            where wiki_pages.project_id = :project_id
            order by aliases.alias
            """,
            project_id=project_id,
        ),
    }


def rows_to_csv(rows: list[dict]) -> str:
    if not rows:
        return ""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()), lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


def escape_mermaid(value: str) -> str:
    return value.replace('"', "'").replace("|", "/")


def safe_filename(value: str) -> str:
    return "".join(ch if ch.isalnum() or ch in {" ", "-", "_"} else "_" for ch in value).strip()


def row_to_dict(row) -> dict:
    return {column.name: getattr(row, column.name) for column in row.__table__.columns}
