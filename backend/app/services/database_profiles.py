import sqlite3
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

LEGACY_PROFILE = "legacy_mindmap"
LLM_WIKI_PROFILE = "llm_wiki"
INVALID_PROFILE = "invalid"

LEGACY_TABLES = {"projects", "nodes", "edges", "detail_blocks"}
LLM_WIKI_TABLES = {"projects", "wiki_pages", "wiki_links", "aliases", "tags", "page_tags", "sources", "page_sources"}


def profile_from_tables(tables: set[str]) -> str:
    if LEGACY_TABLES.issubset(tables):
        return LEGACY_PROFILE
    if LLM_WIKI_TABLES.issubset(tables):
        return LLM_WIKI_PROFILE
    return INVALID_PROFILE


def detect_session_profile(session: Session) -> str:
    rows = session.execute(text("select name from sqlite_master where type = 'table'")).all()
    return profile_from_tables({row[0] for row in rows})


def inspect_database_file(db_path: Path) -> dict:
    if not db_path.exists():
        return empty_inspection("database file does not exist")

    connection = None
    try:
        connection = sqlite3.connect(db_path)
        tables = {
            row[0]
            for row in connection.execute(
                "select name from sqlite_master where type = 'table'"
            ).fetchall()
        }
        profile = profile_from_tables(tables)
        if profile == INVALID_PROFILE:
            missing_legacy = ", ".join(sorted(LEGACY_TABLES - tables))
            missing_wiki = ", ".join(sorted(LLM_WIKI_TABLES - tables))
            return empty_inspection(
                f"schema does not match supported profiles; missing legacy tables: {missing_legacy}; missing llm wiki tables: {missing_wiki}"
            )

        if profile == LEGACY_PROFILE:
            project_count = scalar_count(connection, "projects")
            node_count = scalar_count(connection, "nodes")
            edge_count = scalar_count(connection, "edges")
            status = ready_status(project_count, node_count, "nodes")
            return {
                "database_profile": profile,
                "is_populated": project_count > 0 and node_count > 0,
                "project_count": project_count,
                "node_count": node_count,
                "edge_count": edge_count,
                "page_count": 0,
                "link_count": 0,
                "claim_count": 0,
                "task_count": 0,
                "question_count": 0,
                "lint_count": 0,
                "status": status,
            }

        project_count = scalar_count(connection, "projects")
        page_count = scalar_count(connection, "wiki_pages")
        link_count = scalar_count(connection, "wiki_links")
        claim_count = scalar_count(connection, "claims") if "claims" in tables else 0
        task_count = scalar_count(connection, "tasks") if "tasks" in tables else 0
        question_count = scalar_count(connection, "open_questions") if "open_questions" in tables else 0
        lint_count = scalar_count(connection, "lint_findings") if "lint_findings" in tables else 0
        status = ready_status(project_count, page_count, "wiki pages")
        return {
            "database_profile": profile,
            "is_populated": project_count > 0 and page_count > 0,
            "project_count": project_count,
            "node_count": page_count,
            "edge_count": link_count,
            "page_count": page_count,
            "link_count": link_count,
            "claim_count": claim_count,
            "task_count": task_count,
            "question_count": question_count,
            "lint_count": lint_count,
            "status": status,
        }
    except sqlite3.DatabaseError as exc:
        return empty_inspection(f"invalid sqlite database: {exc}")
    finally:
        if connection is not None:
            connection.close()


def empty_inspection(status: str) -> dict:
    return {
        "database_profile": INVALID_PROFILE,
        "is_populated": False,
        "project_count": 0,
        "node_count": 0,
        "edge_count": 0,
        "page_count": 0,
        "link_count": 0,
        "claim_count": 0,
        "task_count": 0,
        "question_count": 0,
        "lint_count": 0,
        "status": status,
    }


def scalar_count(connection: sqlite3.Connection, table_name: str) -> int:
    return int(connection.execute(f"select count(*) from {table_name}").fetchone()[0])


def ready_status(project_count: int, item_count: int, item_label: str) -> str:
    if project_count == 0:
        return "empty database: no projects found"
    if item_count == 0:
        return f"empty database: no {item_label} found"
    return "ready"
