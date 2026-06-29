# ProofChain Beginner Starter

This repository is the starting environment for ProofChain.

## Start in this order

1. Install the required software on both computers.
2. Copy `.env.example` to `.env`.
3. Run `docker compose up -d`.
4. Confirm PostgreSQL and MinIO are working.
5. Run `scripts/setup-apps.ps1` once to create the Next.js and NestJS applications.
6. Develop the first health-check workflow.
7. Add Jenkins only after the frontend, backend, database, and MinIO work locally.

## Required software

Install directly on Windows:

- Git
- Node.js LTS
- Visual Studio Code
- Docker Desktop with WSL 2 and Linux containers
- A GitHub account
- Optional: DBeaver Community for viewing PostgreSQL

Do not install PostgreSQL, MinIO, or Jenkins directly on Windows. The supplied Docker files run them in containers.

## Verify installation

Open PowerShell in this folder:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
.\scripts\check-environment.ps1
```

## Configure environment variables

```powershell
Copy-Item .env.example .env
```

Open `.env` and replace all values containing `change_me`.

Never commit `.env`.

## Start PostgreSQL and MinIO

```powershell
docker compose up -d
docker compose ps
```

Expected local services:

- PostgreSQL: `localhost:5432`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

Test PostgreSQL:

```powershell
docker compose exec postgres psql -U proofchain -d proofchain -c "\dt"
```

Open MinIO Console and sign in with the values in `.env`.

## Create the frontend and backend

Run once:

```powershell
.\scripts\setup-apps.ps1
```

This creates:

- `apps/web` — Next.js frontend
- `apps/api` — NestJS backend

After generation, use two terminals.

Terminal 1:

```powershell
cd apps\api
npm run start:dev
```

Terminal 2:

```powershell
cd apps\web
npm run dev
```

Initial local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000` after you change the NestJS port
- MinIO Console: `http://localhost:9001`

## First development milestone

Do not begin authentication or evidence transfers immediately.

Complete this smaller milestone first:

1. All four developers' tools work. In this project there are two developers, so both machines must pass the check script.
2. Both developers can clone the same GitHub repository.
3. `docker compose up -d` starts PostgreSQL and MinIO.
4. The NestJS API exposes `GET /api/health`.
5. The health endpoint confirms the API and PostgreSQL are running.
6. The Next.js home page calls the health endpoint and displays `ProofChain API is healthy`.
7. Both developers create branches and complete one pull request each.

## Jenkins

Jenkins is intentionally separated into `compose.jenkins.yaml`.

Do not start it on the first day. Start it after both applications can build and test locally:

```powershell
docker compose -f compose.jenkins.yaml up -d --build
```

Open `http://localhost:8080`.

Read `docs/04-jenkins-beginner-guide.md` before starting it.

## Useful commands

```powershell
# Start infrastructure
docker compose up -d

# View services
docker compose ps

# View PostgreSQL logs
docker compose logs -f postgres

# View MinIO logs
docker compose logs -f minio

# Stop containers
docker compose down

# Stop and erase local database/storage data
docker compose down -v
```

`docker compose down -v` permanently removes local development data. Do not use it accidentally.

## Repository workflow

- `main` — stable release
- `develop` — integrated development
- `feature/<name>` — individual work
- Pull requests must be reviewed by the other developer.
- Never push directly to `main`.

Read `docs/03-team-workflow.md`.
