# `llm_wiki.db` Workflow

`llm_wiki.db` is the preferred runtime database for Project2MindMap. It stores the research graph that the app reads and visualizes.

Local database files are intentionally ignored by Git. Each user should keep their own `llm_wiki.db` outside version control unless they explicitly intend to publish that data.

## Creating the first database

1. Start a new LLM session for the research project.
2. Use the repository prompt file:

   ```text
   LLM_Wiki_InitPrompt.txt
   ```

3. Follow the prompt workflow to generate the initial `llm_wiki.db`.
4. Place the generated `llm_wiki.db` in the repository root.
5. Start the app. The backend automatically prefers a valid populated `llm_wiki.db`.

## Updating an existing database

1. Start a later LLM session for the same research project.
2. Use the repository prompt file:

   ```text
   LLM_Wiki_UpdatePrompt.txt
   ```

3. Provide or link the existing `llm_wiki.db` to the LLM session.
4. The update workflow should modify the existing database rather than creating a separate replacement.
5. Place the updated `llm_wiki.db` back in the repository root before starting the app.

## Validation

After creating or updating the database, start the backend and check metadata:

```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Then in another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/metadata
```

Confirm:

- `database_name` is `llm_wiki.db`
- `database_profile` is `llm_wiki`
- `is_populated` is `true`
- project/node/link counts are non-zero for a populated project

## Privacy

Do not commit `.db` files that contain private research data, unpublished notes, protected data, or collaborator information. The repository `.gitignore` excludes common SQLite database filenames for this reason.
