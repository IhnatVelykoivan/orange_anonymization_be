# De-ID Studio - Backend

Backend service for De-ID Studio: a platform for PII/PHI detection, anonymization, and synthetic data generation.

<img width="800" height="396" alt="ezgif-48af01a6a91b98ae" src="https://github.com/user-attachments/assets/b77e256c-0a87-44cd-b744-0dbf7c675cc7" />


> Frontend: [ZenBit-Tech/orange_anonymization_fe](https://github.com/ZenBit-Tech/orange_anonymization_fe)

## Tech Stack

- **Framework:** NestJS 10 + TypeScript
- **Database:** MySQL 8 + TypeORM
- **Auth:** Magic Link email + JWT
- **PII/PHI:** Microsoft Presidio (Docker)
- **Export:** PDFKit + ExcelJS
- **Docs:** Swagger at `/api/docs`

## Getting Started

**Prerequisites:** Node.js 20+, Docker + Docker Compose

```bash
cp .env.example .env
docker compose up mysql presidio-analyzer presidio-anonymizer -d
npm install
npm run migration:run
npm run db:seed
npm run start:dev
```

API: `http://localhost:3000/api` · Swagger: `http://localhost:3000/api/docs`

## Project Structure

```
src/
├── config/             # Typed config (db, jwt, mail, presidio)
├── database/           # Migrations and seeds
└── modules/
    ├── auth/           # Magic link + JWT
    ├── users/          # User CRUD
    ├── jobs/           # De-identification job lifecycle
    ├── synthetic-data/ # Synthetic dataset generation & export
    ├── dashboard/      # Analytics and metrics
    ├── email/          # Transactional emails
    └── health/         # Health check
```

## API Overview

Full interactive docs at `/api/docs`. All routes are prefixed with `/api`.

| Module         | Endpoints                                                    |
| -------------- | ------------------------------------------------------------ |
| Auth           | `POST /auth/magic-link`, `POST /auth/verify`                 |
| Users          | `GET /users/me`, `GET/PATCH/DELETE /users/:id`               |
| Jobs           | `POST /jobs`, `GET/PATCH /jobs/:id`, upload, process         |
| Results        | `GET /app/results/:id`, export as JSON / PDF                 |
| Synthetic Data | `POST/GET/DELETE /synthetic-data/:id`, export as CSV / Excel |
| Dashboard      | `GET /dashboard`                                             |
| Health         | `GET /health`                                                |

## Authentication

Magic link flow - no passwords:

1. `POST /api/auth/magic-link { email }` → sends a one-time link (15 min TTL)
2. `POST /api/auth/verify { token }` → returns a JWT (1 h lifetime)
3. All protected routes require `Authorization: Bearer <jwt>`


## Environment Variables

| Variable                              | Required | Description                |
| ------------------------------------- | -------- | -------------------------- |
| `DB_HOST/PORT/USERNAME/PASSWORD/NAME` | Yes      | MySQL connection           |
| `JWT_SECRET`                          | Yes      | Signing secret (64+ chars) |
| `ENCRYPTION_KEY`                      | Yes      | AES key (16 chars)         |
| `MAIL_HOST/PORT/USER/PASS/FROM`       | Yes      | SMTP config                |
| `PRESIDIO_ANALYZER_URL`               |          | Default: `localhost:5001`  |
| `PRESIDIO_ANONYMIZER_URL`             |          | Default: `localhost:5002`  |
| `CORS_ORIGIN`                         |          | Default: `localhost:5173`  |
| `JWT_EXPIRES_IN`                      |          | Default: `1h`              |

## Scripts

```bash
npm run start:dev        # Development server
npm run build            # Compile to dist/
npm run test             # Unit tests
npm run test:cov         # Tests with coverage
npm run migration:run    # Apply pending migrations
npm run migration:revert # Revert last migration
npm run db:seed          # Seed initial data
npm run lint             # ESLint (auto-fix)
```

## License

Private and confidential.
