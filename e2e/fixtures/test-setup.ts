import { randomUUID } from "node:crypto";
import { test as base } from "@playwright/test";

const API_URL = process.env.API_URL ?? "http://localhost:3100";

export type Category = {
  id: number;
  name: string;
  description: string | null;
  product_count: number;
};

type Fixtures = {
  // Arranging a test's starting data through the API, rather than by filling
  // in another page's forms first, keeps a broken form failing only the test
  // that is about that form.
  api: { createCategory: (name: string) => Promise<Category> };
  // Names nothing else uses, so specs can run at the same time and assert on
  // their own rows instead of on totals.
  unique: (prefix: string) => string;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} -> ${response.status} ${body}`);
  }
  // The API owns this shape and there is no runtime schema to check it against.
  return (body ? JSON.parse(body) : null) as T;
}

async function discard(path: string): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, { method: "DELETE" });
  // Already gone is the normal outcome when the test deleted it itself.
  if (!response.ok && response.status !== 404) {
    console.error(`Cleanup failed: DELETE ${path} -> ${response.status}`);
  }
}

export const test = base.extend<Fixtures>({
  api: async ({}, use) => {
    const createdIds: number[] = [];

    await use({
      async createCategory(name) {
        const category = await request<Category>("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description: "Created by an E2E test" }),
        });
        createdIds.push(category.id);
        return category;
      },
    });

    // This runs even when the test fails. The end of a test body does not, so
    // a failure would otherwise leave rows behind.
    for (const id of createdIds.reverse()) {
      // A category holding products answers 409, and the test may well have
      // added some through the UI, which nothing here recorded.
      const products = await request<{ id: number }[]>(`/api/categories/${id}/products`).catch(
        () => [],
      );
      for (const product of products) await discard(`/api/products/${product.id}`);
      await discard(`/api/categories/${id}`);
    }
  },

  unique: async ({}, use) => {
    await use((prefix) => `${prefix} ${randomUUID().slice(0, 8)}`);
  },
});

export { expect } from "@playwright/test";
