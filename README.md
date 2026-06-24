# CaseCore — AI-Powered Case Management SaaS (TypeScript)

A multi-tenant, white-label case management platform with Excel-style tables, natural language AI chat, and complete organization data isolation. Built with **strict TypeScript** across the full stack.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, TanStack Table |
| Backend | Node.js, Express, TypeScript, ts-node-dev |
| Database | PostgreSQL + pgvector |
| AI | Ollama (Llama 3) + LangChain.js |
| Auth | JWT (access + refresh) + bcrypt |
| Billing | Stripe subscriptions |
| Export | SheetJS (xlsx) |

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+ with [pgvector](https://github.com/pgvector/pgvector)
- **Ollama** ([ollama.ai](https://ollama.ai))

## 1. Clone and Install

```bash
cd backend
npm install

cd ../frontend
npm install
```

## 2. Database Setup

```bash
psql -U postgres -c "CREATE DATABASE casecore;"
psql -U postgres -d casecore -f backend/database/schema.sql
```

## 3. Environment Variables

### Backend (`backend/.env`)

```bash
cp backend/.env.example backend/.env
```

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/casecore
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
OLLAMA_BASE_URL=http://localhost:11434
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env` — optional)

```env
VITE_API_URL=/api
```

## 4. Ollama Setup

```bash
ollama pull llama3
ollama pull nomic-embed-text
```

## 5. Run Development Servers

```bash
# Terminal 1 — Backend (TypeScript with hot reload)
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health

## 6. Production Build

```bash
cd backend && npm run build && npm start
cd frontend && npm run build
```

## 7. First Steps

1. Register at http://localhost:5173/register
2. Create your first case via **New Case**
3. Open **AI Chat** and try: "Show open cases", "Summarize this week"
4. Export cases to Excel with the **Export** button

## Project Structure

```
project/
├── backend/
│   ├── src/
│   │   ├── types/          # Shared TypeScript interfaces
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── app.ts
│   ├── database/schema.sql
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── types/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── hooks/
│   │   └── api/
│   └── tsconfig.json
└── README.md
```

## TypeScript Conventions

- All source files use `.ts` or `.tsx` extensions
- Strict mode enabled — no `any` types
- Shared interfaces in `src/types/index.ts` (backend and frontend)
- Express `AuthRequest` extends `Request` with typed `user` property
- All API functions return typed `Promise<T>`

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register org + admin |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/refresh` | No | Refresh access token |
| GET | `/api/auth/me` | Yes | Current user profile |
| GET | `/api/cases` | Yes | List cases (filtered) |
| POST | `/api/cases` | Yes | Create case |
| PUT | `/api/cases/:id` | Yes | Update case |
| DELETE | `/api/cases/:id` | Yes | Soft delete |
| GET | `/api/cases/stats` | Yes | Dashboard statistics |
| POST | `/api/ai/chat` | Yes | AI chat with RAG/SQL |
| GET | `/api/export/cases` | Yes | Export to Excel |
| POST | `/api/billing/checkout` | Yes | Stripe checkout |

## Security

- All queries scoped by `organization_id`
- Passwords hashed with bcrypt (12 rounds)
- JWT access tokens: 15 min | Refresh tokens: 7 days
- AI SQL generation restricted to SELECT only
- Stripe webhooks verified with signing secret

## License

MIT
