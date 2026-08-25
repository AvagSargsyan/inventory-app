-- Drops and recreates both tables; running the seed resets the database.

DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(60) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_not_blank CHECK (btrim(name) <> '')
);

-- Case-insensitive uniqueness.
CREATE UNIQUE INDEX categories_name_lower_idx ON categories (lower(name));

CREATE TABLE products (
  id             SERIAL PRIMARY KEY,
  category_id    INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name           VARCHAR(80) NOT NULL,
  price_cents    INTEGER NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  image_url      VARCHAR(500),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_price_nonneg CHECK (price_cents >= 0),
  CONSTRAINT products_stock_nonneg CHECK (stock_quantity >= 0),
  CONSTRAINT products_name_unique_in_category UNIQUE (category_id, name)
);

CREATE INDEX products_category_id_idx ON products(category_id);
