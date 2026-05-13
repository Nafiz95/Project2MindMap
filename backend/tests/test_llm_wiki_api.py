from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import get_session
from app.main import app

ROOT = Path(__file__).resolve().parents[2]
LLM_WIKI_PATH = ROOT / "llm_wiki.db"
PROJECT_ID = "biomedclip_radiology_alignment_finetuning"


@pytest.fixture()
def llm_wiki_client() -> Generator[TestClient, None, None]:
    engine = create_engine(f"sqlite:///{LLM_WIKI_PATH.as_posix()}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_session():
        with TestingSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    engine.dispose()


def test_llm_wiki_tree_graph_detail_dashboard_and_search(llm_wiki_client: TestClient):
    projects = llm_wiki_client.get("/api/projects")
    assert projects.status_code == 200
    assert projects.json()[0]["id"] == PROJECT_ID

    tree = llm_wiki_client.get(f"/api/projects/{PROJECT_ID}/tree")
    assert tree.status_code == 200
    tree_payload = tree.json()
    assert len(tree_payload["root_ids"]) > 1
    root_node = next(node for node in tree_payload["nodes"] if node["category"] == "root")
    assert root_node["title"] == "Project Overview"

    detail = llm_wiki_client.get(f"/api/projects/{PROJECT_ID}/nodes/{root_node['id']}")
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert detail_payload["detail_blocks"]
    assert detail_payload["sources"]
    assert {"claims", "tasks", "open_questions", "lint_findings"}.issubset(detail_payload)

    graph = llm_wiki_client.get(f"/api/projects/{PROJECT_ID}/graph")
    assert graph.status_code == 200
    assert graph.json()["edges"]

    dashboard = llm_wiki_client.get(f"/api/projects/{PROJECT_ID}/dashboard")
    assert dashboard.status_code == 200
    dashboard_payload = dashboard.json()
    assert dashboard_payload["wiki_dashboard"]["counts"]["tasks"] > 0

    search = llm_wiki_client.get(f"/api/projects/{PROJECT_ID}/search", params={"q": "CheXBert"})
    assert search.status_code == 200
    assert search.json()


def test_llm_wiki_exports_and_write_guardrails(llm_wiki_client: TestClient):
    export_json = llm_wiki_client.get(f"/api/projects/{PROJECT_ID}/export/json")
    assert export_json.status_code == 200
    assert export_json.json()["nodes"]

    markdown = llm_wiki_client.get(f"/api/projects/{PROJECT_ID}/export/markdown")
    assert markdown.status_code == 200
    assert "Project Overview" in markdown.text

    mermaid = llm_wiki_client.get(f"/api/projects/{PROJECT_ID}/export/mermaid")
    assert mermaid.status_code == 200
    assert "graph TD" in mermaid.text

    create_node = llm_wiki_client.post(
        f"/api/projects/{PROJECT_ID}/nodes",
        json={
            "title": "Should Not Write",
            "category": "Dataset",
            "status": "idea",
            "importance": "medium",
        },
    )
    assert create_node.status_code == 409
    assert "not supported" in create_node.json()["detail"].lower()

    ingestion = llm_wiki_client.get("/api/ingestion/jobs/not_real")
    assert ingestion.status_code == 409
    assert "not supported" in ingestion.json()["detail"].lower()
