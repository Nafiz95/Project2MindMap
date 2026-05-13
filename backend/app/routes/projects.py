from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_session
from sqlalchemy.exc import IntegrityError

from app.schemas import (
    DetailBlockCreateIn,
    DetailBlockOut,
    DetailBlockPatchIn,
    EdgeCreateIn,
    EdgeOut,
    EdgePatchIn,
    NodeCreateIn,
    NodeDetailOut,
    NodeOut,
    NodePatchIn,
    ProjectOut,
    TreeOut,
)
from app.services.edit_service import (
    create_detail,
    create_edge,
    create_node,
    delete_detail,
    delete_edge,
    delete_node,
    update_detail,
    update_edge,
    update_node,
)
from app.services.database_profiles import LLM_WIKI_PROFILE, detect_session_profile
from app.services.query_service import get_dashboard, get_graph, get_node_detail, get_project, get_tree, list_projects, search_nodes

router = APIRouter()


def require_mutable_profile(session: Session) -> None:
    if detect_session_profile(session) == LLM_WIKI_PROFILE:
        raise HTTPException(
            status_code=409,
            detail="Write operations are not supported for llm_wiki databases in this phase.",
        )


@router.get("/projects", response_model=list[ProjectOut])
def projects(session: Session = Depends(get_session)):
    return list_projects(session)


@router.get("/projects/{project_id}", response_model=ProjectOut)
def project(project_id: str, session: Session = Depends(get_session)):
    item = get_project(session, project_id)
    if not item:
        raise HTTPException(status_code=404, detail="Project not found")
    return item


@router.get("/projects/{project_id}/tree", response_model=TreeOut)
def tree(project_id: str, session: Session = Depends(get_session)):
    if not get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return get_tree(session, project_id)


@router.get("/projects/{project_id}/nodes")
def nodes(project_id: str, session: Session = Depends(get_session)):
    return get_tree(session, project_id)["nodes"]


@router.post("/projects/{project_id}/nodes", response_model=NodeOut)
def create_project_node(project_id: str, payload: NodeCreateIn, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    try:
        return create_node(session, project_id, payload)
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail=str(exc.orig)) from exc


@router.patch("/projects/{project_id}/nodes/{node_id}", response_model=NodeOut)
def patch_project_node(project_id: str, node_id: str, payload: NodePatchIn, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    try:
        item = update_node(session, project_id, node_id, payload)
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail=str(exc.orig)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Node not found")
    return item


@router.delete("/projects/{project_id}/nodes/{node_id}")
def remove_project_node(project_id: str, node_id: str, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    if not delete_node(session, project_id, node_id):
        raise HTTPException(status_code=404, detail="Node not found")
    return {"deleted": node_id}


@router.get("/projects/{project_id}/nodes/{node_id}", response_model=NodeDetailOut)
def node_detail(project_id: str, node_id: str, session: Session = Depends(get_session)):
    item = get_node_detail(session, project_id, node_id)
    if not item:
        raise HTTPException(status_code=404, detail="Node not found")
    return item


@router.get("/projects/{project_id}/search")
def search(project_id: str, q: str, session: Session = Depends(get_session)):
    return search_nodes(session, project_id, q)


@router.get("/projects/{project_id}/graph")
def graph(project_id: str, session: Session = Depends(get_session)):
    if not get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return get_graph(session, project_id)


@router.get("/projects/{project_id}/dashboard")
def dashboard(project_id: str, session: Session = Depends(get_session)):
    if not get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return get_dashboard(session, project_id)


@router.post("/projects/{project_id}/edges", response_model=EdgeOut)
def create_project_edge(project_id: str, payload: EdgeCreateIn, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    try:
        return create_edge(session, project_id, payload)
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail=str(exc.orig)) from exc


@router.patch("/projects/{project_id}/edges/{edge_id}", response_model=EdgeOut)
def patch_project_edge(project_id: str, edge_id: str, payload: EdgePatchIn, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    try:
        item = update_edge(session, project_id, edge_id, payload)
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail=str(exc.orig)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Edge not found")
    return item


@router.delete("/projects/{project_id}/edges/{edge_id}")
def remove_project_edge(project_id: str, edge_id: str, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    if not delete_edge(session, project_id, edge_id):
        raise HTTPException(status_code=404, detail="Edge not found")
    return {"deleted": edge_id}


@router.post("/nodes/{node_id}/details", response_model=DetailBlockOut)
def create_node_detail(node_id: str, payload: DetailBlockCreateIn, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    try:
        return create_detail(session, node_id, payload)
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail=str(exc.orig)) from exc


@router.patch("/details/{detail_id}", response_model=DetailBlockOut)
def patch_node_detail(detail_id: str, payload: DetailBlockPatchIn, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    item = update_detail(session, detail_id, payload)
    if not item:
        raise HTTPException(status_code=404, detail="Detail block not found")
    return item


@router.delete("/details/{detail_id}")
def remove_node_detail(detail_id: str, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    if not delete_detail(session, detail_id):
        raise HTTPException(status_code=404, detail="Detail block not found")
    return {"deleted": detail_id}
