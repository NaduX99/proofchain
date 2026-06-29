# First Week Plan

## Day 1 — Install and verify

Both developers:

- Install Git, Node.js, VS Code, and Docker Desktop.
- Run `scripts/check-environment.ps1`.
- Create GitHub accounts if needed.
- Learn `git clone`, `git status`, `git add`, `git commit`, `git push`, and `git pull`.

Deliverable: both machines pass the environment check.

## Day 2 — Repository and infrastructure

Developer A:

- Create GitHub repository.
- Add Developer B as collaborator.
- Create `develop` branch.

Both:

- Clone repository.
- Copy `.env.example` to `.env`.
- Change local passwords.
- Run `docker compose up -d`.

Deliverable: PostgreSQL and MinIO work on both machines.

## Day 3 — Create applications

Run `scripts/setup-apps.ps1`.

Developer A:

- Start NestJS.
- Change API port to 4000.
- Add `/api/health`.

Developer B:

- Start Next.js.
- Replace the default page with a simple ProofChain status page.

Deliverable: both applications start locally.

## Day 4 — First integration

Developer A:

- Connect the API to PostgreSQL.
- Add a database health check.

Developer B:

- Call `/api/health` from the frontend.
- Display API and database status.

Deliverable: browser displays healthy API and database status.

## Day 5 — Git workflow

Developer A creates `feature/api-health`.
Developer B creates `feature/web-health-dashboard`.

Each person:

- Commits only their own task.
- Pushes the branch.
- Opens a pull request to `develop`.
- Reviews the other person's pull request.

Deliverable: two reviewed and merged pull requests.

## Days 6–7 — Learn before adding features

Study:

- Docker image vs container vs volume
- PostgreSQL table, primary key, foreign key, transaction
- Jenkins job, pipeline, stage, and build
- HTTP GET, POST, PATCH, DELETE
- JWT basics

Do not implement complete login during the first week.
