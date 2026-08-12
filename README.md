# FakeStore — inventory app

Small inventory manager: categories and products, one category per product.

> Status: in progress — the setup steps below describe the target layout.

## Stack

- **api** — Node 22 (ESM), Express 5, PostgreSQL, `pg` with raw parameterised SQL, `express-validator`. No ORM.
- **web** — Vite + React 18, React Router v6, plain `fetch`.

```
inventory-app/
├── api/   # express + postgres
└── web/   # vite + react
```

## Setup

```bash
# api
cd api && npm install
cp .env.example .env        # set DATABASE_URL, PORT, CORS_ORIGIN
npm run seed                # runs schema.sql, then inserts sample data (idempotent)
npm run dev                 # http://localhost:3000

# web
cd web && npm install
cp .env.example .env        # set VITE_API_URL
npm run dev                 # http://localhost:5173
```

## Schema

Two tables. `products.category_id` references `categories(id)` with `ON DELETE RESTRICT`.

Money is stored as integer cents (`price_cents`) — the form takes `189.99`, the DB holds `18999`, the UI renders `$189.99`. Never a float.

See [`api/db/schema.sql`](./api/db/schema.sql) for the full definition.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/categories` | includes `product_count`, computed in SQL |
| GET | `/api/categories/:id` | |
| GET | `/api/categories/:id/products` | |
| POST | `/api/categories` | 201 |
| PUT | `/api/categories/:id` | |
| DELETE | `/api/categories/:id` | 204, or 409 if it has products |
| GET | `/api/products` | `?category=&q=&sort=` |
| GET | `/api/products/:id` | |
| POST | `/api/products` | 201 |
| PUT | `/api/products/:id` | |
| DELETE | `/api/products/:id` | 204 |

Errors are uniform: `{ "error": "Validation failed", "fields": { "name": "Name is required" } }`.
400 malformed · 404 missing · 409 conflict · 422 validation · 500 otherwise.

## Delete policy

_(rationale to be written — why `ON DELETE RESTRICT` over `CASCADE`, and how the reassign-then-delete transaction works)_
