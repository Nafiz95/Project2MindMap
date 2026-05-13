from uuid import uuid4

from sqlalchemy.orm import Session

from app.models import DetailBlock, Edge, Node
from app.schemas import DetailBlockCreateIn, DetailBlockPatchIn, EdgeCreateIn, EdgePatchIn, NodeCreateIn, NodePatchIn
from app.services.ingestion_service import slugify


def create_node(session: Session, project_id: str, payload: NodeCreateIn) -> Node:
    node = Node(
        id=payload.id or slugify(payload.title) or f"node_{uuid4().hex[:12]}",
        project_id=project_id,
        title=payload.title,
        slug=slugify(payload.title),
        category=payload.category,
        summary=payload.summary,
        description=payload.description,
        status=payload.status,
        importance=payload.importance,
        parent_id=payload.parent_id,
    )
    session.add(node)
    session.commit()
    session.refresh(node)
    return node


def update_node(session: Session, project_id: str, node_id: str, payload: NodePatchIn) -> Node | None:
    node = session.get(Node, node_id)
    if not node or node.project_id != project_id:
        return None
    data = payload.model_dump(exclude_none=True)
    if "title" in data:
        node.slug = slugify(data["title"])
    for key, value in data.items():
        setattr(node, key, value)
    session.commit()
    session.refresh(node)
    return node


def delete_node(session: Session, project_id: str, node_id: str) -> bool:
    node = session.get(Node, node_id)
    if not node or node.project_id != project_id:
        return False
    session.delete(node)
    session.commit()
    return True


def create_edge(session: Session, project_id: str, payload: EdgeCreateIn) -> Edge:
    edge = Edge(
        id=f"edge_{uuid4().hex[:12]}",
        project_id=project_id,
        source_node_id=payload.source_node_id,
        target_node_id=payload.target_node_id,
        relation_type=payload.relation_type,
        description=payload.description,
        strength=payload.strength,
    )
    session.add(edge)
    session.commit()
    session.refresh(edge)
    return edge


def update_edge(session: Session, project_id: str, edge_id: str, payload: EdgePatchIn) -> Edge | None:
    edge = session.get(Edge, edge_id)
    if not edge or edge.project_id != project_id:
        return None
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(edge, key, value)
    session.commit()
    session.refresh(edge)
    return edge


def delete_edge(session: Session, project_id: str, edge_id: str) -> bool:
    edge = session.get(Edge, edge_id)
    if not edge or edge.project_id != project_id:
        return False
    session.delete(edge)
    session.commit()
    return True


def create_detail(session: Session, node_id: str, payload: DetailBlockCreateIn) -> DetailBlock:
    sort_order = payload.sort_order
    if sort_order is None:
        existing = session.query(DetailBlock).filter(DetailBlock.node_id == node_id).all()
        sort_order = max((block.sort_order for block in existing), default=0) + 1
    detail = DetailBlock(
        id=f"detail_{uuid4().hex[:12]}",
        node_id=node_id,
        block_type=payload.block_type,
        title=payload.title,
        content=payload.content,
        sort_order=sort_order,
    )
    session.add(detail)
    session.commit()
    session.refresh(detail)
    return detail


def update_detail(session: Session, detail_id: str, payload: DetailBlockPatchIn) -> DetailBlock | None:
    detail = session.get(DetailBlock, detail_id)
    if not detail:
        return None
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(detail, key, value)
    session.commit()
    session.refresh(detail)
    return detail


def delete_detail(session: Session, detail_id: str) -> bool:
    detail = session.get(DetailBlock, detail_id)
    if not detail:
        return False
    session.delete(detail)
    session.commit()
    return True
