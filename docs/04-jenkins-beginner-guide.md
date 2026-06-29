# Jenkins Beginner Guide

Do not begin Jenkins until these commands work locally:

```powershell
cd apps\web
npm ci
npm run lint
npm run build

cd ..\api
npm ci
npm run lint
npm test
npm run build
```

## Important terms

- Controller: the Jenkins service that manages jobs.
- Pipeline: the automated workflow.
- Stage: a major section such as Test or Build.
- Step: one command inside a stage.
- Build: one execution of the pipeline.
- Agent: the machine or container that performs work.
- Jenkinsfile: pipeline code stored in Git.

## Start Jenkins

Ensure Docker Desktop uses Linux containers.

```powershell
docker compose -f compose.jenkins.yaml up -d --build
docker compose -f compose.jenkins.yaml ps
```

Open:

```text
http://localhost:8080
```

Get the initial password:

```powershell
docker exec proofchain-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

## Initial setup

1. Paste the initial password.
2. Install suggested plugins.
3. Create an admin user.
4. Create a Pipeline job.
5. Connect it to the GitHub repository.
6. Configure it to use the repository `Jenkinsfile`.

## First Jenkins goal

Your first pipeline needs only:

1. Checkout
2. Install dependencies
3. Lint
4. Test
5. Build

Do not add deployment on the first Jenkins day.

## Later stages

After the basic pipeline is stable:

- PostgreSQL integration test
- Docker image build
- Security scan
- Staging deployment
- Health check
- Rollback
