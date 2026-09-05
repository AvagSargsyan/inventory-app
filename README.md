# FakeStore — inventory app

Small inventory manager: categories and products, one category per product. Built as a learning
project — Postgres with raw parameterised SQL, no ORM.

> **Status** — both packages are TypeScript. The API is complete: all endpoints, the
> reassign-and-delete transaction, and image upload. The React frontend (`web/`) is under way —
> the app shell, `/categories` and `/categories/:id` are built; forms and the delete flow are not.

## Stack

- **api** — Node 22 (ESM), **TypeScript**, Express 5, PostgreSQL 18, `pg` with raw parameterised
  SQL, `express-validator`, `multer`, `cors`, `dotenv`. No ORM.
- **web** — Vite + React 19, **TypeScript**, React Router v7, Tailwind v4 with shadcn/ui,
  plain `fetch`.

## Structure

Layered architecture: each layer depends only on the one below it.

```
api/
├── tsconfig.json             strict, plus the two options below
├── db/
│   ├── schema.sql            tables, constraints, indexes
│   └── seed.ts               runs schema.sql, then inserts sample data
└── src/
    ├── server.ts             binds the port
    ├── app.ts                middleware order, mounting
    ├── routes/               paths + middleware chains
    ├── controllers/          HTTP in → service → HTTP out
    ├── services/             business rules, transactions, image lifecycle
    ├── repositories/         all SQL; the only files importing the pool
    ├── validators/           express-validator chains
    ├── middleware/           validate, upload, error boundary
    ├── lib/                  errors, money, storage
    └── db/                   pool, Postgres error codes, withTransaction
```

### TypeScript

Node 22.18 strips types natively, so **development needs no build step** — `npm run dev` runs
`src/server.ts` directly. Two consequences drive the setup:

- **Stripping never type-checks.** Node deletes the annotations and runs what is left, so a
  program full of type errors starts happily. `npm run typecheck` is the only thing that will
  ever tell you, which is why it is a separate script rather than folded into `dev`.
- **Stripping only handles erasable syntax.** `enum`, `namespace` and parameter properties throw
  `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` at runtime, so `erasableSyntaxOnly` makes `tsc` reject
  exactly that set at compile time instead. Use unions of string literals in place of `enum`.

Imports carry `.ts` extensions so Node can resolve them when running the source;
`rewriteRelativeImportExtensions` turns them into `.js` on the way into `dist/`. Production runs
the built output — deploying stripped source would ship code nothing has checked.

Row types live beside the SQL that produces them. `pool.query<CategoryRow>(…)` is an _assertion_,
not a check: change the `SELECT` list and the type quietly becomes a lie. That is the cost of
raw SQL, and the reason the type sits in the same file as the query.

## Setup

Requires Node 22.18+ (for native type stripping) and a running PostgreSQL 16+.

```bash
createdb fakestore

cd api
npm install
cp .env.example .env         # set DATABASE_URL
npm run seed                 # drops and recreates the tables, then seeds
npm run dev                  # http://localhost:3000
```

Verify with `curl localhost:3000/api/categories` — four categories with product counts.

### Scripts

| Command                | Does                                                        |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | run `src/server.ts` with `--watch`, no build step           |
| `npm run typecheck`    | `tsc --noEmit` — the only thing that checks types           |
| `npm run build`        | `tsc` → `dist/`                                             |
| `npm start`            | run the built output (what a deploy platform runs)          |
| `npm run seed`         | reset the database to a known state                         |
| `npm run format`       | Prettier over `api/`                                        |
| `npm run format:check` | verify formatting, non-zero exit if anything is unformatted |

### Environment

`api/.env` — gitignored; `api/.env.example` is committed.

```
DATABASE_URL=postgresql://USER@localhost:5432/fakestore
PORT=3000
CORS_ORIGIN=http://localhost:5173
UPLOAD_DIR=./uploads
MAX_UPLOAD_BYTES=2097152
```

## Schema

Two tables. `products.category_id` references `categories(id)` with `ON DELETE RESTRICT`.

Money is stored as integer cents (`price_cents`) — the form sends `189.99`, the database holds
`18999`, the UI renders `$189.99`. Never a float: binary floating point cannot represent decimal
fractions exactly, so errors accumulate across sums and `WHERE price = 19.99` stops matching.

Category names are unique **case-insensitively**, enforced by a functional index on `lower(name)`.
The plain `UNIQUE` constraint is case-sensitive and would accept both `Office` and `office`; a
pre-flight `SELECT` would race a concurrent insert, an index cannot.

See [`api/db/schema.sql`](./api/db/schema.sql) for the full definition.

> `npm run seed` **drops and recreates** both tables. That is what makes it idempotent, and it is
> fine for a learning project — a production app would use versioned migrations instead.

## API

| Method | Path                                   | Notes                                                |
| ------ | -------------------------------------- | ---------------------------------------------------- |
| GET    | `/api/categories`                      | each row includes `product_count`, computed in SQL   |
| GET    | `/api/categories/:id`                  | 404 if missing                                       |
| GET    | `/api/categories/:id/products`         | 404 if the category is missing, `[]` if it is empty  |
| POST   | `/api/categories`                      | 201 + created row                                    |
| PUT    | `/api/categories/:id`                  | 200 + updated row                                    |
| DELETE | `/api/categories/:id`                  | 204, or 409 with `product_count` if it has products  |
| DELETE | `/api/categories/:id?reassign_to=<id>` | moves the products, then deletes — one transaction   |
| GET    | `/api/products`                        | `?category=` `?q=` `?sort=`; joins the category name |
| GET    | `/api/products/:id`                    | 404 if missing                                       |
| POST   | `/api/products`                        | 201; `multipart/form-data` with an optional `image`  |
| PUT    | `/api/products/:id`                    | 200; same, plus `remove_image=true` to clear it      |
| DELETE | `/api/products/:id`                    | 204; also deletes the image file                     |
| GET    | `/uploads/:filename`                   | uploaded images, served statically                   |

`?sort=` accepts `name_asc` (default), `name_desc`, `price_asc`, `price_desc`, `stock_asc`,
`stock_desc`, `newest`. Anything else is a 400 — column names cannot be parameterised, so sort keys
map to fixed SQL fragments rather than being interpolated.

Prices are sent as decimal strings (`"189.99"`) and returned as `price_cents`. The conversion parses
the digits rather than multiplying by 100, which is inexact: `1.005 * 100` is `100.49999999999999`.

### Errors

One shape everywhere:

```json
{ "error": "Validation failed", "fields": { "name": "Name is required" } }
```

400 malformed · 404 missing · 409 conflict · 422 validation · 500 otherwise.

Postgres constraint violations are translated, never surfaced as a 500: `23505` (unique) → 409,
`23503` (foreign key) → 422 on write, `23001` (restrict) → 409 on delete. Note that
`ON DELETE RESTRICT` raises **`23001`**, not the `23503` you might expect — `23503` is what
`NO ACTION` would raise.

## Delete policy

Because `category_id` is `NOT NULL`, every product must always belong to some category. So deleting
a category that still holds products has only three possible resolutions:

| Option                | What happens                          | Why not                                                                            |
| --------------------- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| `ON DELETE CASCADE`   | category **and its products** vanish  | one click silently destroys inventory; you wanted to remove a label, not the stock |
| `RESTRICT`, just 409  | nothing happens                       | safe, but a dead end — the admin must hand-edit every product first                |
| `RESTRICT` + reassign | products move, then the category goes | what this app does                                                                 |

The schema uses `ON DELETE RESTRICT`, which makes it **physically impossible** for the database to
orphan a product. The API then builds the useful path on top: `DELETE /api/categories/:id` returns
409 with `product_count`, so the client can say "this category holds 4 products" and offer a target
category. Sending `?reassign_to=<id>` moves them and deletes the original.

That reassignment is two statements — `UPDATE products`, then `DELETE FROM categories` — so it runs
in a single transaction on one checked-out client (`pool.query` would put `BEGIN` and `COMMIT` on
different connections, making the transaction meaningless). Either the products moved and the
category is gone, or nothing changed at all.

Two details that make it correct under concurrency:

- The source row is locked with `SELECT … FOR UPDATE`. Inserting a product takes a `FOR KEY SHARE`
  lock on its category row, which conflicts with `FOR UPDATE`, so no product can join the category
  between the `UPDATE` and the `DELETE`.
- Products are unique by `(category_id, name)`, so the move can fail if the target already has a
  product of the same name. The transaction rolls back and the 409 names the colliding products,
  rather than reporting a generic conflict.

## Image uploads

One optional image per product, sent with the product itself as `multipart/form-data`. **Files are
stored on local disk** under `api/uploads/` and served from `/uploads`.

- The file is buffered in memory and its type verified from its **magic bytes** before anything is
  written — the extension and `Content-Type` are client-controlled and prove nothing. JPEG, PNG and
  WebP only; SVG is excluded because it can execute scripts.
- Stored names are generated UUIDs, never the client's filename, which can carry `../` or a
  misleading extension. Because names are never reused, `/uploads` is served `immutable` with a
  one-year cache.
- A failed insert deletes the file it just wrote; a replaced image is deleted only **after** the new
  row commits, so a failed write never destroys an image the product still points at.

**Local disk is a deliberate learning-project choice.** Container filesystems on Railway/Render/Fly
are ephemeral, so uploads would vanish on redeploy. All disk access sits behind
[`api/src/lib/storage.ts`](./api/src/lib/storage.ts) — swapping in S3, R2 or Cloudinary means
reimplementing that one module and nothing else.
