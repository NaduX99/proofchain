# Software Installation — Windows

Install the same tools on both developers' computers.

## 1. Git

Install Git for Windows.

After installation:

```powershell
git --version
git config --global user.name "Your Name"
git config --global user.email "your-github-email@example.com"
```

## 2. Node.js LTS

Install the current Node.js LTS release.

Check:

```powershell
node --version
npm --version
```

Do not install multiple unrelated Node versions at the beginning.

## 3. Visual Studio Code

Recommended extensions:

- ESLint
- Prettier
- Docker
- GitLens
- PostgreSQL or SQLTools
- REST Client
- Tailwind CSS IntelliSense
- Prisma later, only if the project adopts Prisma

## 4. Docker Desktop

During installation:

- Use the WSL 2 backend.
- Run Linux containers.
- Start Docker Desktop before using Docker commands.

Check:

```powershell
docker --version
docker compose version
docker run --rm hello-world
```

## 5. GitHub

One person creates the repository and adds the other person as a collaborator.

Enable:

- Pull requests
- Branch protection for `main` later
- Issues
- Projects board

## 6. Optional database GUI

Install DBeaver Community or use another PostgreSQL client.

Connection:

- Host: `localhost`
- Port: `5432`
- Database: value of `POSTGRES_DB`
- Username: value of `POSTGRES_USER`
- Password: value of `POSTGRES_PASSWORD`

## Software not required on Windows

Do not directly install these at the start:

- PostgreSQL Server
- MinIO Server
- Jenkins
- Java for Jenkins

Docker will run them.
