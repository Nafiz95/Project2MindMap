from pathlib import Path

from app.services.seed_service import validate_seed_file

ROOT = Path(__file__).resolve().parents[2]


def test_seed_validates_against_contract():
    assert validate_seed_file(ROOT / "project2mindmap_seed.json") == []
