def ingestion_payload():
    return {
        "project_id": "vlm_radiology",
        "source": {
            "source_type": "chat",
            "title": "I-JEPA pretrained reproduction planning",
            "path_or_url": None,
            "citation_key": None,
            "note": "User project update converted into Project2MindMap candidates.",
        },
        "nodes": [
            {
                "id": "new_ijepa_validation_note",
                "title": "New I-JEPA validation note",
                "category": "Experiment",
                "summary": "Track a new I-JEPA validation note.",
                "description": "Structured ingestion test candidate.",
                "status": "active",
                "importance": "high",
                "tags": ["ijepa"],
                "detail_blocks": [
                    {
                        "block_type": "overview",
                        "title": "Experiment goal",
                        "content": "Confirm the ingestion review flow.",
                    }
                ],
            }
        ],
        "edges": [
            {
                "source": "new_ijepa_validation_note",
                "target": "ijepa",
                "relation_type": "evaluates",
                "description": "The note evaluates I-JEPA.",
                "strength": "strong",
            }
        ],
    }


def test_ingestion_creates_candidates(client):
    response = client.post("/projects/vlm_radiology/ingestion/jobs", json=ingestion_payload())
    assert response.status_code == 200
    job_id = response.json()["job_id"]
    candidates = client.get(f"/ingestion/jobs/{job_id}/candidates").json()
    assert len(candidates["node_candidates"]) == 1
    assert len(candidates["edge_candidates"]) == 1
    assert len(candidates["detail_candidates"]) == 1
    assert candidates["blocking_errors"] == []


def test_ingestion_commit_creates_node_edge_and_detail(client):
    response = client.post("/projects/vlm_radiology/ingestion/jobs", json=ingestion_payload())
    job_id = response.json()["job_id"]
    candidates = client.get(f"/ingestion/jobs/{job_id}/candidates").json()
    for candidate in candidates["node_candidates"]:
        client.patch(f"/ingestion/candidates/nodes/{candidate['id']}", json={"review_status": "approved"})
    for candidate in candidates["edge_candidates"]:
        client.patch(f"/ingestion/candidates/edges/{candidate['id']}", json={"review_status": "approved"})
    for candidate in candidates["detail_candidates"]:
        client.patch(f"/ingestion/candidates/details/{candidate['id']}", json={"review_status": "approved"})

    commit = client.post(f"/ingestion/jobs/{job_id}/commit")
    assert commit.status_code == 200
    payload = commit.json()
    assert payload["created"]["nodes"] == ["new_ijepa_validation_note"]
    detail = client.get("/projects/vlm_radiology/nodes/new_ijepa_validation_note").json()
    assert detail["detail_blocks"][0]["title"] == "Experiment goal"


def test_unresolved_edge_blocks_commit(client):
    payload = ingestion_payload()
    payload["edges"][0]["target"] = "missing_node"
    response = client.post("/projects/vlm_radiology/ingestion/jobs", json=payload)
    job_id = response.json()["job_id"]
    candidates = client.get(f"/ingestion/jobs/{job_id}/candidates").json()
    assert candidates["blocking_errors"]
    for candidate in candidates["edge_candidates"]:
        client.patch(f"/ingestion/candidates/edges/{candidate['id']}", json={"review_status": "approved"})
    commit = client.post(f"/ingestion/jobs/{job_id}/commit")
    assert commit.status_code == 400
