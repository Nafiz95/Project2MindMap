from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_session
from app.schemas import CandidatePatchIn, CanonicalIngestionIn, CandidatesOut, CommitOut, IngestionJobCreateOut
from app.services.database_profiles import LLM_WIKI_PROFILE, detect_session_profile
from app.services.ingestion_service import (
    commit_job,
    create_ingestion_job,
    get_candidates,
    get_job,
    patch_candidate,
    reject_job,
)

router = APIRouter()


def require_mutable_profile(session: Session) -> None:
    if detect_session_profile(session) == LLM_WIKI_PROFILE:
        raise HTTPException(
            status_code=409,
            detail="Ingestion review and commit are not supported for llm_wiki databases in this phase.",
        )


@router.post("/projects/{project_id}/ingestion/jobs", response_model=IngestionJobCreateOut)
def create_job(project_id: str, payload: CanonicalIngestionIn, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    if payload.project_id != project_id:
        raise HTTPException(status_code=400, detail="Payload project_id must match route project_id")
    return create_ingestion_job(session, project_id, payload)


@router.get("/ingestion/jobs/{job_id}")
def read_job(job_id: str, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    job = get_job(session, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Ingestion job not found")
    return {column.name: getattr(job, column.name) for column in job.__table__.columns}


@router.get("/ingestion/jobs/{job_id}/candidates", response_model=CandidatesOut)
def read_candidates(job_id: str, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    if not get_job(session, job_id):
        raise HTTPException(status_code=404, detail="Ingestion job not found")
    return get_candidates(session, job_id)


@router.patch("/ingestion/candidates/{kind}/{candidate_id}")
def update_candidate(kind: str, candidate_id: str, patch: CandidatePatchIn, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    if kind not in {"nodes", "edges", "details"}:
        raise HTTPException(status_code=404, detail="Candidate kind not found")
    item = patch_candidate(session, kind, candidate_id, patch)
    if not item:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return item


@router.post("/ingestion/jobs/{job_id}/commit", response_model=CommitOut)
def commit(job_id: str, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    try:
        return commit_job(session, job_id)
    except IntegrityError as exc:
        raise HTTPException(status_code=409, detail=str(exc.orig)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/ingestion/jobs/{job_id}/reject")
def reject(job_id: str, session: Session = Depends(get_session)):
    require_mutable_profile(session)
    try:
        return reject_job(session, job_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
