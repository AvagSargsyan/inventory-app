// Runs schema.sql, then inserts sample data.

import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));

type SeedCategory = { name: string; description: string };
type SeedProduct = {
  category: string;
  name: string;
  price_cents: number;
  stock_quantity: number;
};

const CATEGORIES: SeedCategory[] = [
  { name: "Electronics", description: "Phones, audio, wearables, and everyday gadgets." },
  { name: "Computers", description: "Laptops, monitors, peripherals, and storage." },
  { name: "Office", description: "Desks, chairs, lighting, and workspace essentials." },
  { name: "Home and Kitchen", description: "Small appliances and tools for the home." },
];

const PRODUCTS: SeedProduct[] = [
  { category: "Electronics", name: "Wireless Earbuds", price_cents: 7999, stock_quantity: 42 },
  { category: "Electronics", name: "Bluetooth Speaker", price_cents: 4599, stock_quantity: 18 },
  { category: "Electronics", name: "Smart Watch", price_cents: 19999, stock_quantity: 7 },
  {
    category: "Electronics",
    name: "Noise-Cancelling Headphones",
    price_cents: 24900,
    stock_quantity: 0,
  },
  { category: "Electronics", name: "USB-C Fast Charger", price_cents: 2499, stock_quantity: 120 },
  { category: "Electronics", name: "4K Action Camera", price_cents: 32900, stock_quantity: 12 },

  { category: "Computers", name: '14" Laptop', price_cents: 54900, stock_quantity: 5 },
  { category: "Computers", name: '27" 4K Monitor', price_cents: 29900, stock_quantity: 9 },
  { category: "Computers", name: "Mechanical Keyboard", price_cents: 12900, stock_quantity: 33 },
  { category: "Computers", name: "1TB External SSD", price_cents: 11900, stock_quantity: 21 },
  { category: "Computers", name: "Wireless Mouse", price_cents: 3499, stock_quantity: 64 },

  { category: "Office", name: "Ergonomic Desk Chair", price_cents: 34900, stock_quantity: 4 },
  { category: "Office", name: "Standing Desk Converter", price_cents: 21900, stock_quantity: 11 },
  { category: "Office", name: "LED Desk Lamp", price_cents: 4299, stock_quantity: 27 },
  { category: "Office", name: "Notebook Set", price_cents: 799, stock_quantity: 95 },
];

async function seed(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Copy api/.env.example to api/.env first.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    const schema = await readFile(join(here, "schema.sql"), "utf8");
    await client.query(schema);

    const categoryIdByName = new Map<string, number>();
    for (const category of CATEGORIES) {
      const { rows } = await client.query<{ id: number; name: string }>(
        `INSERT INTO categories (name, description)
         VALUES ($1, $2)
         RETURNING id, name`,
        [category.name, category.description],
      );
      // INSERT ... RETURNING always yields exactly one row.
      const inserted = rows[0]!;
      categoryIdByName.set(inserted.name, inserted.id);
    }

    for (const product of PRODUCTS) {
      await client.query(
        `INSERT INTO products (category_id, name, price_cents, stock_quantity)
         VALUES ($1, $2, $3, $4)`,
        [
          categoryIdByName.get(product.category),
          product.name,
          product.price_cents,
          product.stock_quantity,
        ],
      );
    }

    await client.query("COMMIT");

    const { rows } = await client.query<{ name: string; product_count: number }>(
      `SELECT c.name, COUNT(p.id)::int AS product_count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id, c.name
        ORDER BY c.name`,
    );
    console.log("Seeded:");
    for (const row of rows) {
      console.log(`  ${row.name.padEnd(18)} ${row.product_count} products`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

seed().catch((error: unknown) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
