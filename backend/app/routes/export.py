import io
import zipfile

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database import get_session
from app.services.query_service import export_csv_bundle, export_markdown, export_mermaid, export_obsidian, export_project, get_project

router = APIRouter()


@router.get("/projects/{project_id}/export/json")
def export_json(project_id: str, session: Session = Depends(get_session)):
    if not get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return export_project(session, project_id)


@router.get("/projects/{project_id}/export/markdown")
def markdown(project_id: str, session: Session = Depends(get_session)):
    if not get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return Response(export_markdown(session, project_id), media_type="text/markdown")


@router.get("/projects/{project_id}/export/mermaid")
def mermaid(project_id: str, session: Session = Depends(get_session)):
    if not get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return Response(export_mermaid(session, project_id), media_type="text/plain")


@router.get("/projects/{project_id}/export/csv")
def csv_export(project_id: str, session: Session = Depends(get_session)):
    if not get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return zip_response(export_csv_bundle(session, project_id), f"{project_id}_csv.zip")


@router.get("/projects/{project_id}/export/obsidian")
def obsidian(project_id: str, session: Session = Depends(get_session)):
    if not get_project(session, project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return zip_response(export_obsidian(session, project_id), f"{project_id}_obsidian.zip")


def zip_response(files: dict[str, str], filename: str) -> Response:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for path, content in files.items():
            archive.writestr(path, content)
    return Response(
        buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
