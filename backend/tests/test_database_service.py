import sqlite3
from pathlib import Path

import pytest

from app.database import ROOT_DIR
from app.services.database_service import inspect_database_file, switch_database


def test_inspect_database_file_reports_empty_database(tmp_path: Path):
    db_path = tmp_path / "empty.db"
    sqlite3.connect(db_path).close()

    inspection = inspect_database_file(db_path)

    assert inspection["is_populated"] is False
    assert inspection["project_count"] == 0
    assert "supported profiles" in inspection["status"]


def test_switch_database_rejects_empty_workspace_database():
    db_path = ROOT_DIR / "empty_switch_test.db"
    db_path.unlink(missing_ok=True)
    connection = sqlite3.connect(db_path)
    connection.close()

    try:
        with pytest.raises(ValueError, match="Database is not populated"):
            switch_database(db_path.name)
    finally:
        db_path.unlink(missing_ok=True)
