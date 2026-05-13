from pathlib import Path

from sqlalchemy import select

from app.database import ROOT_DIR, SessionLocal, configure_database, get_active_db_path
from app.models import Project
from app.runtime import API_PREFIX, CODE_PROFILE_VERSION, FRONTEND_DIST, SERVER_STARTED_AT, frontend_is_built
from app.services.database_profiles import detect_session_profile, inspect_database_file


def safe_workspace_file(name: str, suffix: str) -> Path:
    candidate = Path(name)
    if candidate.name != name:
        raise ValueError("Use a filename only, not a path")
    if candidate.suffix.lower() != suffix:
        raise ValueError(f"Filename must end with {suffix}")
    resolved = (ROOT_DIR / candidate.name).resolve()
    if not str(resolved).startswith(str(ROOT_DIR.resolve())):
        raise ValueError("File must stay inside the Project2MindMap workspace")
    return resolved


def list_databases() -> list[dict]:
    active = get_active_db_path().resolve()
    rows = []
    for path in sorted(ROOT_DIR.glob("*.db")):
        inspection = inspect_database_file(path)
        rows.append(
            {
                "name": path.name,
                "path": str(path.resolve()),
                "size_bytes": path.stat().st_size,
                "active": path.resolve() == active,
                "is_populated": inspection["is_populated"],
                "database_profile": inspection["database_profile"],
                "project_count": inspection["project_count"],
                "node_count": inspection["node_count"],
                "edge_count": inspection["edge_count"],
                "page_count": inspection["page_count"],
                "link_count": inspection["link_count"],
                "claim_count": inspection["claim_count"],
                "task_count": inspection["task_count"],
                "question_count": inspection["question_count"],
                "lint_count": inspection["lint_count"],
                "status": inspection["status"],
            }
        )
    return rows


def active_project_id() -> str | None:
    if not inspect_database_file(get_active_db_path())["is_populated"]:
        return None
    with SessionLocal() as session:
        if detect_session_profile(session) == "invalid":
            return None
        project = session.scalar(select(Project).order_by(Project.name))
        return project.id if project else None


def metadata_payload() -> dict:
    db_path = get_active_db_path().resolve()
    schema_path = ROOT_DIR / "project2mindmap_schema.sql"
    inspection = inspect_database_file(db_path)
    return {
        "app": "Project2MindMap",
        "runtime_store": "sqlite",
        "database_path": str(db_path),
        "database_name": db_path.name,
        "database_exists": db_path.exists(),
        "database_size_bytes": db_path.stat().st_size if db_path.exists() else 0,
        "is_populated": inspection["is_populated"],
        "database_profile": inspection["database_profile"],
        "active_database_profile": inspection["database_profile"],
        "server_started_at": SERVER_STARTED_AT,
        "code_profile_version": CODE_PROFILE_VERSION,
        "api_prefix": API_PREFIX,
        "frontend_served_by_backend": frontend_is_built(),
        "frontend_dist_path": str(FRONTEND_DIST.resolve()),
        "frontend_index_exists": frontend_is_built(),
        "project_count": inspection["project_count"],
        "node_count": inspection["node_count"],
        "edge_count": inspection["edge_count"],
        "page_count": inspection["page_count"],
        "link_count": inspection["link_count"],
        "claim_count": inspection["claim_count"],
        "task_count": inspection["task_count"],
        "question_count": inspection["question_count"],
        "lint_count": inspection["lint_count"],
        "database_status": inspection["status"],
        "available_databases": list_databases(),
        "schema_sql_path": str(schema_path.resolve()),
        "schema_sql_exists": schema_path.exists(),
        "active_project_id": active_project_id(),
        "notes": [
            "The running app reads and writes only the active SQLite database file.",
            "The Database tab switches between existing populated .db files in the workspace.",
            "LLM Wiki databases are read natively and are preferred at startup when llm_wiki.db is present.",
            "Empty or invalid .db files are rejected instead of being seeded from the UI.",
            "The SQL file is a schema artifact/reference; SQLAlchemy models create the runtime schema.",
        ],
    }


def switch_database(database_name: str) -> dict:
    db_path = safe_workspace_file(database_name, ".db")
    if not db_path.exists():
        raise FileNotFoundError(f"Database does not exist: {database_name}")
    inspection = inspect_database_file(db_path)
    if not inspection["is_populated"]:
        raise ValueError(f"Database is not populated: {inspection['status']}")
    configure_database(db_path)
    return metadata_payload()
