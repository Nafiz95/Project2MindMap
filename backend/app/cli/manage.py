from pathlib import Path

import typer

from app.database import SessionLocal, init_db
from app.services.query_service import export_csv_bundle, export_markdown, export_mermaid, export_obsidian, export_project
from app.services.seed_service import seed_database, validate_seed_file

cli = typer.Typer(help="Project2MindMap management commands")


@cli.command("init-db")
def init_database(drop_existing: bool = typer.Option(False, "--drop-existing")) -> None:
    init_db(drop_existing=drop_existing)
    typer.echo("Database initialized.")


@cli.command("validate-seed")
def validate_seed(input: Path = typer.Option(Path("project2mindmap_seed.json"), "--input")) -> None:
    errors = validate_seed_file(input)
    if errors:
        for error in errors:
            typer.echo(error)
        raise typer.Exit(1)
    typer.echo("Seed validates.")


@cli.command("seed")
def seed(input: Path = typer.Option(Path("project2mindmap_seed.json"), "--input")) -> None:
    init_db()
    with SessionLocal() as session:
        seed_database(session, input)
    typer.echo("Seed imported.")


@cli.command("export")
def export(
    project: str = typer.Option(..., "--project"),
    output: Path = typer.Option(..., "--output"),
    format: str = typer.Option("json", "--format"),
) -> None:
    with SessionLocal() as session:
        if format == "json":
            payload = __import__("json").dumps(export_project(session, project), indent=2)
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(payload, encoding="utf-8")
        elif format == "markdown":
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(export_markdown(session, project), encoding="utf-8")
        elif format == "mermaid":
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(export_mermaid(session, project), encoding="utf-8")
        elif format == "csv":
            output.mkdir(parents=True, exist_ok=True)
            for filename, content in export_csv_bundle(session, project).items():
                (output / filename).write_text(content, encoding="utf-8")
        elif format == "obsidian":
            output.mkdir(parents=True, exist_ok=True)
            for filename, content in export_obsidian(session, project).items():
                (output / filename).write_text(content, encoding="utf-8")
        else:
            raise typer.BadParameter("format must be json, markdown, mermaid, csv, or obsidian")
    typer.echo(f"Exported {project} to {output}.")


if __name__ == "__main__":
    cli()
