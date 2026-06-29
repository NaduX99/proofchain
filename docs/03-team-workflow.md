# Two-Developer Workflow

## Branches

- `main`: stable
- `develop`: combined development
- `feature/<short-name>`: one feature
- `fix/<short-name>`: one bug fix

## Beginning a task

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/api-health
```

## Saving work

```powershell
git status
git add .
git commit -m "feat(api): add health endpoint"
git push -u origin feature/api-health
```

Open a pull request from the feature branch into `develop`.

## Rules

1. Never share `.env` in chat or GitHub.
2. Never push directly to `main`.
3. Do not both edit the same file without discussing it.
4. Keep pull requests small.
5. The other developer reviews every pull request.
6. Pull `develop` before starting new work.
7. Explain database changes to each other.
8. Add a test when fixing an important bug.

## Suggested ownership

Developer A:

- Backend
- PostgreSQL
- Docker
- Jenkins

Developer B:

- Frontend
- UX
- API integration
- End-to-end workflows

Both must learn all areas. Ownership indicates responsibility, not exclusive access.
