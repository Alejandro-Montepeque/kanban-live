# kanban-live

Collaborative Kanban with real-time sync. Multiple users can edit the same board and see updates instantly via WebSockets — drag a card, others see it move without refreshing.

## Stack

**Backend**
- NestJS (TypeScript) with modular architecture
- Prisma ORM + PostgreSQL
- Socket.IO for real-time events
- JWT with refresh token rotation
- Jest + supertest for unit and integration tests

**Frontend**
- React 18 + TypeScript + Vite
- TailwindCSS for styling
- TanStack Query for server state and cache
- Zustand for client state
- dnd-kit for accessible drag and drop
- Socket.IO client for real-time
- Vitest for unit tests
- Playwright for end-to-end tests

**Infrastructure**
- Cloud Run (backend)
- Vercel (frontend)
- Neon (PostgreSQL serverless)
- Upstash Redis (optional, for multi-instance Socket.IO)
- GitHub Actions with Workload Identity Federation

## Local development

```bash
# 1. Clone and install
git clone https://github.com/Alejandro-Montepeque/kanban-live.git
cd kanban-live

# 2. Copy env example and fill in
cp backend/.env.example backend/.env

# 3. Start everything (db + backend + frontend)
docker compose up

# Backend:  http://localhost:3000
# Frontend: http://localhost:5173
# Postgres: localhost:5432
```

## Testing

Tests are first-class citizens in this project and gate every deploy.

```bash
# Backend
cd backend
npm run test            # unit tests with Jest
npm run test:e2e        # integration tests with supertest
npm run test:cov        # coverage report

# Frontend
cd frontend
npm run test            # unit tests with Vitest
npm run test:e2e        # end-to-end tests with Playwright
```

## Project structure

```
kanban-live/
├── backend/                 NestJS API + WebSocket gateway
│   ├── src/
│   │   ├── modules/         feature modules (auth, workspaces, boards, ...)
│   │   ├── prisma/          prisma service wrapper
│   │   └── main.ts          bootstrap
│   ├── prisma/
│   │   └── schema.prisma    data model
│   └── test/                e2e tests
│
├── frontend/                React SPA
│   ├── src/
│   │   ├── api/             axios client + interceptors
│   │   ├── features/        feature-scoped components
│   │   ├── components/      shared UI primitives
│   │   ├── hooks/
│   │   └── stores/
│   └── tests/               Playwright specs
│
├── .github/workflows/       CI/CD pipelines
├── scripts/                 one-off setup scripts
└── docker-compose.yml       local dev stack
```

## License

MIT
