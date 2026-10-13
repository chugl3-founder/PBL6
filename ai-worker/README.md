# AI Worker

RabbitMQ consumer that bridges the web platform and the independently owned
`AI_Classifier` package.

## Structure

```text
ai-worker/
  app/
    config.py                 environment-backed settings
    infrastructure/
      database.py             PostgreSQL adapter and job status updates
      object_storage.py       S3-compatible video download adapter
  worker.py                   compatibility entrypoint and message consumer
  .env.example               documented local configuration
  requirements.txt           worker-only dependencies
```

Model inference and analytics do not belong in this directory. They are
imported from `AI_Classifier/src/ai_classifier`. Training and evaluation
scripts must never be imported by the worker.

## Run locally

```powershell
Copy-Item .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python worker.py
```

Set `AI_CLASSIFIER_ROOT` in `.env` to the local `AI_Classifier` checkout.
