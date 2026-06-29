# First Application Files to Create

After scaffolding Next.js and NestJS, create these files in this order.

## NestJS API

```text
apps/api/
├── .env
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── health/
│   │   ├── health.module.ts
│   │   ├── health.controller.ts
│   │   └── health.service.ts
│   ├── database/
│   │   ├── database.module.ts
│   │   └── database.service.ts
│   └── common/
│       └── config/
│           └── env.validation.ts
└── test/
    └── health.e2e-spec.ts
```

Create only the health and database modules first.

Future modules:

```text
auth
organizations
users
investigations
evidence
custody
integrity
audit
```

## Next.js Web

```text
apps/web/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── system-status.tsx
├── lib/
│   └── api.ts
└── types/
    └── health.ts
```

Future route groups:

```text
(auth)
(dashboard)
investigations
evidence
audit
settings
```

## Root files

Already supplied:

```text
.env.example
.gitignore
compose.yaml
compose.jenkins.yaml
Jenkinsfile
README.md
```

Do not create 30 modules on the first day.
