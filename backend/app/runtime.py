from datetime import UTC, datetime

from app.database import ROOT_DIR

SERVER_STARTED_AT = datetime.now(UTC).isoformat()
CODE_PROFILE_VERSION = "llm_wiki_native_v1"
API_PREFIX = "/api"
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"


def frontend_is_built() -> bool:
    return (FRONTEND_DIST / "index.html").exists()
