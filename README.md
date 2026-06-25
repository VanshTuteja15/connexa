# Connexa

> AI-powered natural language database queries. Connect your PostgreSQL database, ask questions in plain English, get SQL and results instantly.

## Features

- 🔌 Connect any PostgreSQL database securely
- 🤖 Natural language to SQL via local AI (Ollama/LLaMA 3)
- 🛡️ Read-only safety guard — only SELECT queries allowed
- 📊 Schema explorer with relationships
- 🕐 Full query history
- 📤 Export results as CSV or Excel
- 🏢 Multi-tenant — one instance, many organizations

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + pgvector |
| AI | Ollama (Llama 3) + LangChain.js |
| Auth | JWT (access + refresh) + bcrypt |

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Ollama ([ollama.ai](https://ollama.ai))

## Setup

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Generate a 32-byte encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database setup

```bash
psql -U postgres -c "CREATE DATABASE connexa;"
psql -U postgres -d connexa -f backend/database/schema.sql
cd backend && npm run migrate
```

### 4. Ollama

```bash
ollama pull llama3
```

### 5. Demo Database

```bash
cd backend
npm run seed:demo
```

This seeds a sample customers/orders/products database and registers a demo connection for your first organization.

### 6. Run

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001/api

## First Steps

1. Register at http://localhost:5173/register
2. Go to **Connections** and add a PostgreSQL database (or use the demo connection after `seed:demo`)
3. Open **Schema** to explore tables
4. Use **AI Query** to ask: "Show top 10 customers by total orders"
5. Export results as CSV or Excel

## API Overview

All endpoints return `{ success: boolean, data?, error? }`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/connections/test` | Test a database connection |
| POST | `/api/connections/save` | Save a connection |
| GET | `/api/connections` | List connections (no passwords) |
| GET | `/api/schema/:connectionId` | Introspect database schema |
| POST | `/api/query/generate` | NL → SQL |
| POST | `/api/query/run` | Execute validated SELECT |
| GET | `/api/history` | Query history |

## Security

- Passwords encrypted with AES-256-GCM at rest
- All queries validated by `validateSQL()` before execution
- Organization scoping on every Connexa DB query via JWT
- Rate limiting: 100 req/15min global, 10 req/min on query endpoints
- Helmet security headers

## License

MIT
