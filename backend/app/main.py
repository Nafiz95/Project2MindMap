from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.database import get_active_db_path, init_db
from app.routes import databases, export, ingestion, projects
from app.runtime import API_PREFIX, FRONTEND_DIST, frontend_is_built
from app.services.database_profiles import LEGACY_PROFILE, inspect_database_file


@asynccontextmanager
async def lifespan(_app: FastAPI):
    active_db = get_active_db_path()
    inspection = inspect_database_file(active_db)
    if not active_db.exists() or inspection["database_profile"] == LEGACY_PROFILE:
        init_db()
    yield


app = FastAPI(title="Project2MindMap", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def frontend_missing_response() -> HTMLResponse:
    return HTMLResponse(
        """
        <!doctype html>
        <html>
          <head><title>Project2MindMap</title></head>
          <body style="font-family: system-ui; margin: 2rem; line-height: 1.5">
            <h1>Project2MindMap frontend build missing</h1>
            <p>Run <code>cd frontend</code>, then <code>npm.cmd install</code> and <code>npm.cmd run build</code>.</p>
            <p>The API is still available under <code>/api</code>.</p>
          </body>
        </html>
        """,
        status_code=200,
    )


def serve_frontend_index():
    if not frontend_is_built():
        return frontend_missing_response()
    return FileResponse(FRONTEND_DIST / "index.html")


@app.get("/health")
@app.get(f"{API_PREFIX}/health")
def health():
    return {"status": "ok", "app": "Project2MindMap"}


def include_api_routes(prefix: str = "") -> None:
    app.include_router(databases.router, prefix=prefix)
    app.include_router(projects.router, prefix=prefix)
    app.include_router(ingestion.router, prefix=prefix)
    app.include_router(export.router, prefix=prefix)


include_api_routes()
include_api_routes(API_PREFIX)


app.mount(
    "/assets",
    StaticFiles(directory=FRONTEND_DIST / "assets", check_dir=False),
    name="frontend-assets",
)


@app.get("/")
def root():
    return serve_frontend_index()


@app.get("/{full_path:path}")
def frontend_fallback(full_path: str):
    if full_path.startswith("api/"):
        return HTMLResponse("API route not found", status_code=404)
    return serve_frontend_index()
