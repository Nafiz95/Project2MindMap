from fastapi import APIRouter, HTTPException

from app.schemas import DatabaseSwitchIn
from app.services.database_service import list_databases, metadata_payload, switch_database

router = APIRouter()


@router.get("/metadata")
def metadata():
    return metadata_payload()


@router.get("/runtime")
def runtime():
    payload = metadata_payload()
    return {
        "server_started_at": payload["server_started_at"],
        "code_profile_version": payload["code_profile_version"],
        "api_prefix": payload["api_prefix"],
        "frontend_served_by_backend": payload["frontend_served_by_backend"],
        "active_database_profile": payload["active_database_profile"],
        "database_name": payload["database_name"],
        "database_status": payload["database_status"],
    }


@router.get("/databases")
def databases():
    return {
        "databases": list_databases(),
    }


@router.post("/databases/switch")
def switch(payload: DatabaseSwitchIn):
    try:
        return switch_database(payload.database_name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
