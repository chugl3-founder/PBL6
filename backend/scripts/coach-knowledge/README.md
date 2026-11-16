# AI Coach knowledge base

The AI Coach chatbot runs inside the Spring Boot backend (`/api/coach/**`, see `CoachController`,
`CoachService` and `CoachTools`). This folder only holds the documents it searches and the script that loads them.

- `data/`: badminton documents by category (`01_rules`, `02_tactics`, `03_techniques`, `04_fitness_injury`).
- `ingest.py`: cuts the documents into chunks, embeds them with `gemini-embedding-001` (768 dimensions) and
  rebuilds the `knowledge_embeddings` table (created by Flyway migration `V13__add_coach_chat.sql`).

Run it again only after adding or changing documents, from the repository root:

```bash
pip install -r backend/scripts/coach-knowledge/requirements.txt
python backend/scripts/coach-knowledge/ingest.py
```

It reads `GEMINI_API_KEY` and the `SPRING_DATASOURCE_*` settings from the `.env` file at the repository root.
