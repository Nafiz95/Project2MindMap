def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "app": "Project2MindMap"}

    api_response = client.get("/api/health")
    assert api_response.status_code == 200
    assert api_response.json() == {"status": "ok", "app": "Project2MindMap"}


def test_metadata_reports_runtime_database(client):
    response = client.get("/api/metadata")
    assert response.status_code == 200
    payload = response.json()
    assert payload["runtime_store"] == "sqlite"
    assert payload["database_path"].endswith("llm_wiki.db")
    assert payload["database_profile"] == "llm_wiki"
    assert payload["active_database_profile"] == "llm_wiki"
    assert payload["code_profile_version"] == "llm_wiki_native_v1"
    assert payload["api_prefix"] == "/api"
    assert payload["server_started_at"]
    assert payload["database_status"] == "ready"
    assert payload["is_populated"] is True
    assert "active SQLite database file" in " ".join(payload["notes"])

    legacy_response = client.get("/metadata")
    assert legacy_response.status_code == 200
    assert legacy_response.json()["database_profile"] == "llm_wiki"


def test_runtime_endpoint_reports_core_fields(client):
    response = client.get("/api/runtime")
    assert response.status_code == 200
    payload = response.json()
    assert payload["code_profile_version"] == "llm_wiki_native_v1"
    assert payload["api_prefix"] == "/api"
    assert payload["active_database_profile"] == "llm_wiki"


def test_tree_contains_root_and_top_level_branches(client):
    response = client.get("/projects/vlm_radiology/tree")
    assert response.status_code == 200
    payload = response.json()
    assert payload["root_id"] == "vlm_radiology"
    titles = {node["title"] for node in payload["nodes"]}
    assert "CT-CLIP" in titles
    assert "Datasets and Cohorts" in titles


def test_node_detail_contains_related_edges(client):
    response = client.get("/projects/vlm_radiology/nodes/ct_clip")
    assert response.status_code == 200
    payload = response.json()
    assert payload["node"]["title"] == "CT-CLIP"
    assert any(edge["relation_type"] == "trained_on" for edge in payload["related_edges"])


def test_search_finds_expected_seed_nodes(client):
    for query, expected in [
        ("CT-RATE", "CT-RATE"),
        ("UIP", "CT-RATE/IPF/UIP Limitations Log"),
        ("grant", "CIHR CT-ILD Grant"),
        ("I-JEPA", "I-JEPA"),
    ]:
        response = client.get("/projects/vlm_radiology/search", params={"q": query})
        assert response.status_code == 200
        assert expected in {item["title"] for item in response.json()}


def test_json_export_contains_graph_tables(client):
    response = client.get("/projects/vlm_radiology/export/json")
    assert response.status_code == 200
    payload = response.json()
    assert payload["project"]["id"] == "vlm_radiology"
    assert payload["nodes"]
    assert payload["edges"]
    assert "detail_blocks" in payload


def test_dashboard_and_graph_endpoints(client):
    dashboard = client.get("/projects/vlm_radiology/dashboard")
    assert dashboard.status_code == 200
    assert dashboard.json()["counts"]["nodes"] == 110

    graph = client.get("/projects/vlm_radiology/graph")
    assert graph.status_code == 200
    payload = graph.json()
    assert len(payload["nodes"]) == 110
    assert len(payload["edges"]) == 171


def test_direct_editing_node_edge_detail(client):
    node = client.post(
        "/projects/vlm_radiology/nodes",
        json={
            "title": "Temporary Editing Test",
            "category": "Experiment",
            "status": "idea",
            "importance": "medium",
            "parent_id": "vlm_radiology",
        },
    )
    assert node.status_code == 200
    node_id = node.json()["id"]

    detail = client.post(
        f"/nodes/{node_id}/details",
        json={"block_type": "overview", "title": "Test detail", "content": "Created from direct editing."},
    )
    assert detail.status_code == 200

    edge = client.post(
        "/projects/vlm_radiology/edges",
        json={
            "source_node_id": node_id,
            "target_node_id": "ct_clip",
            "relation_type": "evaluates",
            "strength": "medium",
        },
    )
    assert edge.status_code == 200

    patched = client.patch("/projects/vlm_radiology/nodes/" + node_id, json={"status": "active"})
    assert patched.status_code == 200
    assert patched.json()["status"] == "active"


def test_expanded_exports(client):
    markdown = client.get("/projects/vlm_radiology/export/markdown")
    assert markdown.status_code == 200
    assert "CT-CLIP" in markdown.text

    mermaid = client.get("/projects/vlm_radiology/export/mermaid")
    assert mermaid.status_code == 200
    assert "graph TD" in mermaid.text

    csv_zip = client.get("/projects/vlm_radiology/export/csv")
    assert csv_zip.status_code == 200
    assert csv_zip.headers["content-type"] == "application/zip"
