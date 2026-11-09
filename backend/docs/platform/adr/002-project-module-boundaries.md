# ADR 002: Project and AI module boundaries

## Status

Accepted.

## Context

The workspace contains two independently deployable systems:

- `PBL6`: web application, persistence, object storage and job orchestration.
- `AI_Classifier`: model inference, analytics and its read-only result API.

Mixing model code into the Spring backend or putting database/domain logic in
the classifier makes releases, testing and ownership harder. Generated files,
model checkpoints and research scripts must also stay outside importable source
packages.

## Decision

### Web platform (`PBL6`)

Keep the Spring Boot code in a conventional layered architecture because this
is the architecture required by the project:

```text
backend/src/main/java/com/badminton/
  common/          shared response and exception types
  config/          framework and infrastructure configuration
  controller/      HTTP adapters only
  dto/<feature>/   API request/response contracts
  service/         transactions and use cases
  repository/      persistence ports
  entity/          JPA persistence model
```

Controllers must not call repositories directly. Entities must not be exposed
as HTTP responses. Flyway migrations are the database source of truth;
Hibernate validates/maps them rather than evolving production schemas.

### AI classifier (`AI_Classifier`)

```text
src/ai_classifier/
  api/             optional FastAPI delivery adapter
  analytics/       scoreboard, tactics, movement and insights
  datasets/        reusable dataset loaders
  features/        reusable feature extraction
  localization/    hit/contact/shuttle localization
  models/          model definitions only; no checkpoint binaries
  pipeline/        production inference orchestration
scripts/
  data/            one-off dataset preparation commands
  evaluation/      benchmarks and reports
  inference/       operator-facing inference commands
  training/        experiment/training commands
configs/           versioned, human-readable configuration
models/checkpoints local model artifacts, ignored by Git
tests/             mirrors reusable package behavior
```

Reusable logic belongs under `src/ai_classifier`; scripts should parse CLI
arguments and delegate to that package. New production code must not import a
module from `scripts/`.

### Worker boundary

`ai-worker/app/` owns infrastructure configuration and worker adapters. It may
invoke the public `ai_classifier` package, but it must not import evaluation or
training scripts. All secrets are injected through environment variables; the
repository contains only `.env.example`.

The worker writes both:

- lossless/versioned AI JSON into `ai_analyses.raw_result`;
- queryable business projections into normalized analytics tables.

This lets the AI contract evolve without losing results while keeping common
backend queries efficient.

## Consequences

- Backend and AI can be released and tested independently.
- Database migrations remain reproducible.
- Research scripts cannot silently become production dependencies.
- Model artifacts and secrets are not source code.
- A future extraction of the worker into its own repository does not require a
  backend package redesign.
