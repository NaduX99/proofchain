# ProofChain - Digital Evidence Integrity and Chain of Custody System

ProofChain is a digital evidence management system developed to register, store, verify, and track digital evidence during investigations.

The system supports organization-based login, role-based access, investigation management, evidence registration, evidence file upload, SHA-256 integrity verification, custody chain tracking, transfer requests, audit logs, dashboard summaries, and CSV reports.

---

## Project Owner

| Field | Details |
|---|---|
| Name | NaduX |
| Email | mindmasterx99@gmail.com |
| GitHub | @NaduX99 |

---

## Project Overview

Digital evidence must be handled carefully during investigations. If a file is changed, replaced, deleted, or moved without proper tracking, the evidence may lose trust.

ProofChain solves this problem by giving investigators and evidence handlers a structured system to manage digital evidence safely.

Main goals:

- Register investigations
- Register evidence under investigations
- Upload evidence files
- Generate SHA-256 hash values
- Verify file integrity
- Track chain of custody
- Handle evidence transfers
- Record audit logs
- Generate reports

---

## Main System Users

| Role | Main Work |
|---|---|
| Admin | Manage organizations, users, investigations, evidence, reports, and audit logs |
| Investigator | Create investigations, register evidence, view custody chain, and reports |
| Evidence Officer | Handle evidence records, upload files, manage custody events, and transfers |
| Forensic Analyst | Upload and verify evidence files, view custody chain, and reports |
| Custodian | Manage evidence custody, custody chain, and evidence transfers |

---

## Demo Login Accounts

Use this organization slug for all demo users:

```text
proofchain-security-lab
```

Common password for all demo users:

```text
Password123
```

| Role | Name | Email | Password |
|---|---|---|---|
| Admin | Nadul Laknidu | nadul@example.com | Password123 |
| Evidence Officer | Evidence Officer | officer@example.com | Password123 |
| Forensic Analyst | Forensic Analyst | analyst@example.com | Password123 |
| Evidence Custodian | Evidence Custodian | custodian@example.com | Password123 |
| Investigation Officer | Investigation Officer | investigator@example.com | Password123 |
| Case Manager | Case Manager | manager@example.com | Password123 |

> These accounts are only for demo and academic testing. Do not use these passwords in a real production system.

---

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Axios

### Backend

- NestJS
- TypeScript
- PostgreSQL
- MinIO
- JWT Authentication
- Docker

### Database and Storage

- PostgreSQL for system data
- MinIO for evidence file storage
- SHA-256 hashing for evidence file integrity

---

## Main Libraries and Tools

| Library / Tool | Usage |
|---|---|
| Next.js | Frontend framework |
| React | UI component development |
| TypeScript | Type-safe coding |
| Tailwind CSS | Styling frontend pages |
| Axios | API requests from frontend |
| NestJS | Backend API framework |
| PostgreSQL | Main database |
| MinIO | Object storage for evidence files |
| JWT | Login authentication |
| Docker | Running backend services |
| Swagger | API documentation and testing |

---

## Main Frontend Pages

| Page | Route | Purpose |
|---|---|---|
| Login | `/login` | Login using organization slug, email, and password |
| Dashboard | `/dashboard` | View system summary and quick actions |
| Organizations | `/organizations` | Admin creates and views organizations |
| Users | `/users` | Admin creates users, investigators, officers, analysts, and custodians |
| Investigations | `/investigations` | Create and manage investigations |
| Evidence | `/evidence` | Register evidence under investigations |
| Evidence Files | `/evidence-files` | Upload, verify, and download evidence files |
| Custody Chain | `/custody` | Add custody events and verify custody chain |
| Transfers | `/transfers` | Create and manage evidence transfer requests |
| Audit Logs | `/audit-logs` | View system activity logs |
| Reports | `/reports` | Download CSV reports |

---

## Backend API Endpoints

### Authentication

```text
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/profile
```

### Organizations

```text
POST /api/organizations
GET  /api/organizations
GET  /api/organizations/:id
```

### Users

```text
POST  /api/users
GET   /api/users
GET   /api/users/:id
PATCH /api/users/:id/status
```

### Investigations

```text
POST  /api/investigations
GET   /api/investigations
GET   /api/investigations/:id
PATCH /api/investigations/:id
PATCH /api/investigations/:id/status
```

### Evidence

```text
POST /api/investigations/:investigationId/evidence
GET  /api/investigations/:investigationId/evidence
GET  /api/evidence/:evidenceId
```

### Evidence Files

```text
POST /api/evidence/:evidenceId/files
GET  /api/evidence/:evidenceId/files
POST /api/evidence/:evidenceId/files/:fileId/verify
GET  /api/evidence/:evidenceId/files/:fileId/download
```

### Custody Chain

```text
POST /api/evidence/:evidenceId/custody-events
GET  /api/evidence/:evidenceId/custody-events
GET  /api/evidence/:evidenceId/custody-events/verify-chain
```

### Transfer Requests

```text
POST /api/evidence/:evidenceId/transfer-requests
GET  /api/evidence/:evidenceId/transfer-requests
POST /api/transfer-requests/:requestId/approve
POST /api/transfer-requests/:requestId/reject
POST /api/transfer-requests/:requestId/complete
```

### Audit Logs

```text
GET /api/audit-logs
GET /api/audit-logs/users/:userId
```

### Dashboard

```text
GET /api/dashboard/summary
GET /api/dashboard/evidence-status
GET /api/dashboard/investigation-status
GET /api/dashboard/recent-custody-events
GET /api/dashboard/integrity-warnings
```

### Reports

```text
GET /api/reports/summary
GET /api/reports/evidence.csv
GET /api/reports/investigations.csv
GET /api/reports/custody-events.csv
GET /api/reports/audit-logs.csv
```

---

## How the System Works

### 1. Login

Users login using:

```text
Organization Slug
Email
Password
```

After login, the backend returns a JWT access token. The frontend stores the token in browser local storage and sends it with API requests.

---

### 2. Organization Management

Admin can create organizations. Each organization has a unique slug.

Example:

```text
Organization Name: ProofChain Security Lab
Organization Slug: proofchain-security-lab
```

Slug rules:

```text
Only lowercase letters, numbers, and hyphens are allowed.
```

Valid:

```text
proofchain-security-lab
```

Invalid:

```text
ProofChain Security Lab
proofchain_security_lab
proofchain security lab
```

---

### 3. User Management

Admin can create users with different roles:

```text
ADMIN
INVESTIGATOR
OFFICER
ANALYST
CUSTODIAN
```

Each role has different sidebar functions and responsibilities.

---

### 4. Investigation Management

Investigators and admins can create investigations.

Each investigation contains:

```text
Case code
Title
Description
Status
Created date
```

Evidence records are created under investigations.

---

### 5. Evidence Registration

Evidence is registered under a selected investigation.

Each evidence record can contain:

```text
Evidence code
Title
Description
Evidence type
Status
Current custodian
```

---

### 6. Evidence File Upload

When a file is uploaded:

```text
1. File is stored in MinIO
2. SHA-256 hash is generated
3. File metadata is saved in PostgreSQL
4. Custody event is recorded
```

---

### 7. File Integrity Verification

When a file is verified:

```text
1. System reads the uploaded file
2. System calculates SHA-256 hash again
3. New hash is compared with stored hash
4. If both hashes match, file is valid
5. If hashes do not match, an integrity warning is shown
```

Outcomes:

```text
VALID   - File has not changed
INVALID - File may be modified or corrupted
```

---

### 8. Custody Chain

Custody chain records important evidence actions.

Examples:

```text
Evidence registered
File uploaded
Evidence accessed
Evidence transferred
Integrity verified
Note added
Evidence archived
```

This proves who handled evidence and when it was handled.

---

### 9. Transfer Requests

Evidence can be transferred from one user to another.

Transfer workflow:

```text
1. Create transfer request
2. Approve or reject request
3. Complete approved transfer
4. Update custody chain
```

---

### 10. Audit Logs

Audit logs record system activities.

Examples:

```text
User login
Evidence created
File uploaded
Custody event added
Transfer approved
Report downloaded
```

Audit logs help trace all important system actions.

---

### 11. Reports

The system can export CSV reports:

```text
Evidence report
Investigation report
Custody events report
Audit logs report
```

Reports can be used for project submission, investigation review, and documentation.

---

## Clone and Run Guide

### 1. Clone Repository

```bash
git clone https://github.com/NaduX99/ProofChain.git
cd ProofChain
```

If your repository URL is different, replace the URL with your real GitHub repository URL.

---

### 2. Start Backend Services

Make sure Docker Desktop is running.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Check running containers:

```bash
docker ps
```

Expected containers:

```text
proofchain-api-prod
proofchain-postgres-prod
proofchain-minio-prod
```

Backend API URL:

```text
http://localhost:4000/api
```

Swagger API Docs:

```text
http://localhost:4000/api/docs
```

Health Check:

```text
http://localhost:4000/api/health
```

---

### 3. Start Frontend

Open another terminal:

```bash
cd apps/web
npm install
```

Create this file:

```text
apps/web/.env.local
```

Add this:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

Run frontend:

```bash
npm run dev -- --port 3005
```

Frontend URL:

```text
http://localhost:3005
```

Login URL:

```text
http://localhost:3005/login
```

---

## Test Workflow

After login, test this full workflow:

```text
1. Login as Admin
2. Create organization
3. Create investigator/officer/analyst/custodian users
4. Create investigation
5. Register evidence
6. Upload evidence file
7. Verify evidence file
8. Add custody event
9. Verify custody chain
10. Create transfer request
11. Approve, reject, or complete transfer
12. Check audit logs
13. Download reports
14. Check dashboard summary
```

---

## Role-Based Testing

### Admin

```text
Email: nadul@example.com
Password: Password123
```

Expected pages:

```text
Dashboard
Organizations
Users
Investigations
Evidence
Evidence Files
Custody Chain
Transfers
Audit Logs
Reports
```

---

### Investigator

```text
Email: investigator@example.com
Password: Password123
```

Expected pages:

```text
Dashboard
Investigations
Evidence
Evidence Files
Custody Chain
Reports
```

---

### Evidence Officer

```text
Email: officer@example.com
Password: Password123
```

Expected pages:

```text
Dashboard
Evidence
Evidence Files
Custody Chain
Transfers
```

---

### Forensic Analyst

```text
Email: analyst@example.com
Password: Password123
```

Expected pages:

```text
Dashboard
Evidence Files
Custody Chain
Reports
```

---

### Custodian

```text
Email: custodian@example.com
Password: Password123
```

Expected pages:

```text
Dashboard
Evidence
Evidence Files
Custody Chain
Transfers
```

---

## Project Folder Structure

```text
ProofChain
├── apps
│   ├── api
│   │   ├── src
│   │   ├── Dockerfile
│   │   └── tsconfig.build.json
│   │
│   └── web
│       ├── src
│       │   ├── app
│       │   ├── components
│       │   └── lib
│       ├── .env.local
│       └── next.config.ts
│
├── docker-compose.prod.yml
└── README.md
```

---

## Important Frontend Files

```text
apps/web/src/app/login/page.tsx
apps/web/src/app/dashboard/page.tsx
apps/web/src/app/organizations/page.tsx
apps/web/src/app/users/page.tsx
apps/web/src/app/investigations/page.tsx
apps/web/src/app/evidence/page.tsx
apps/web/src/app/evidence-files/page.tsx
apps/web/src/app/custody/page.tsx
apps/web/src/app/transfers/page.tsx
apps/web/src/app/audit-logs/page.tsx
apps/web/src/app/reports/page.tsx
apps/web/src/components/layout/AppShell.tsx
apps/web/src/lib/api.ts
```

---

## Common Problems and Fixes

### 1. 401 Unauthorized

Clear browser local storage:

```js
localStorage.clear()
```

Then login again.

---

### 2. Backend Not Running

Start Docker containers:

```bash
docker start proofchain-postgres-prod proofchain-minio-prod proofchain-api-prod
```

---

### 3. Frontend Port Already Running

Check port:

```bash
netstat -ano | findstr :3005
```

Kill process:

```bash
taskkill /PID YOUR_PID /F
```

Replace `YOUR_PID` with the real PID number.

---

### 4. Organization Slug Error

Error:

```text
organizationSlug must match /^[a-z0-9-]+$/ regular expression
```

Correct slug:

```text
proofchain-security-lab
```

---

### 5. Check Backend Logs

```bash
docker logs proofchain-api-prod --tail 100
```

---

## Stop Project

Stop frontend:

```text
Ctrl + C
```

Stop backend containers:

```bash
docker stop proofchain-api-prod proofchain-postgres-prod proofchain-minio-prod
```

---

## GitHub Push Guide

Check status:

```bash
git status
```

Add files:

```bash
git add README.md
git add apps/web
git add apps/api/src/main.ts
git add apps/api/tsconfig.build.json
git add docker-compose.prod.yml
git add apps/api/Dockerfile
git add apps/api/.dockerignore
```

Make sure `.env.local` is not committed:

```bash
git status
```

If `.env.local` is staged, remove it:

```bash
git restore --staged apps/web/.env.local
```

Commit:

```bash
git commit -m "Add ProofChain README and project guide"
```

Push:

```bash
git push origin HEAD
```

---

## Security Notes

This project uses demo accounts for academic testing.

For a real production system:

```text
1. Do not commit real passwords
2. Do not expose .env files
3. Use strong password hashing
4. Use HTTPS
5. Use secure JWT secrets
6. Use backend role-based authorization
7. Protect audit logs
8. Backup PostgreSQL and MinIO data
```

---

## Current Completion Status

```text
Backend API: Completed
Frontend core pages: Completed
Role-based sidebar: Completed
Evidence upload and verification: Completed
Custody chain: Completed
Reports: Completed
Dashboard: Completed
Admin organization/user pages: Added
Final testing: Required
Deployment: Pending
```

---

## Future Improvements

```text
1. Full backend RoleGuard for every route
2. Email notification for transfer requests
3. PDF report generation
4. Advanced search filters
5. Evidence QR code generation
6. Blockchain-based evidence hash anchoring
7. Two-factor authentication
8. Cloud deployment
```

---

## License

This project is created for academic and learning purposes.