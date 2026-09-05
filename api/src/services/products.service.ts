import * as products from "../repositories/products.repository.ts";
import { SORT_OPTIONS, isSortKey } from "../repositories/products.repository.ts";
import type {
  ProductRowInput,
  ProductWithCategoryRow,
  SortKey,
} from "../repositories/products.repository.ts";
import { isForeignKeyViolation } from "../db/errors.ts";
import { badRequest, notFound, validationFailed } from "../lib/errors.ts";
import { toCents } from "../lib/money.ts";
import * as storage from "../lib/storage.ts";
import type { VerifiedImage } from "../middleware/upload.ts";

const DEFAULT_SORT: SortKey = "name_asc";

// What the validated request body carries. Values arrive as strings over
// multipart and as numbers over JSON; both are valid pg parameters.
export type ProductInput = {
  category_id: string | number;
  name: string;
  price: string | number;
  stock_quantity?: string | number;
  remove_image?: string;
};

// Query values are whatever the URL carried — a repeated parameter arrives as
// an array. Kept as unknown so the checks below reject those the same way the
// untyped version did, rather than silently taking the first element.
export type ProductListQuery = {
  category?: unknown;
  q?: unknown;
  sort?: unknown;
};

// On insert or update a foreign key violation means the category does not
// exist, which is a validation failure rather than a conflict.
const asMissingCategory = (error: unknown): unknown =>
  isForeignKeyViolation(error)
    ? validationFailed({ category_id: "Category does not exist." })
    : error;

const toRow = (input: ProductInput, imageUrl: string | null): ProductRowInput => ({
  categoryId: input.category_id,
  name: input.name,
  priceCents: toCents(input.price),
  // A blank multipart field arrives as '', which is falsy but not nullish.
  stockQuantity: input.stock_quantity || 0,
  imageUrl,
});

export function list({ category, q, sort }: ProductListQuery): Promise<ProductWithCategoryRow[]> {
  let categoryId: number | undefined;
  if (category !== undefined) {
    categoryId = Number(category);
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      throw badRequest("Invalid category filter");
    }
  }

  const sortKey = sort ?? DEFAULT_SORT;
  if (typeof sortKey !== "string" || !isSortKey(sortKey)) {
    throw badRequest(`Invalid sort. Allowed: ${Object.keys(SORT_OPTIONS).join(", ")}`);
  }

  return products.findAll({ categoryId, search: String(q ?? "").trim(), sort: sortKey });
}

export async function get(id: string): Promise<ProductWithCategoryRow> {
  const product = await products.findById(id);
  if (!product) throw notFound("Product not found");
  return product;
}

export async function create(
  input: ProductInput,
  image: VerifiedImage | undefined,
): Promise<ProductWithCategoryRow | null> {
  const imageUrl = image ? await storage.save(image.buffer, image.extension) : null;

  try {
    return await products.insert(toRow(input, imageUrl));
  } catch (error) {
    if (imageUrl) await storage.remove(imageUrl);
    throw asMissingCategory(error);
  }
}

export async function update(
  id: string,
  input: ProductInput,
  image: VerifiedImage | undefined,
): Promise<ProductWithCategoryRow> {
  const existing = await products.findImage(id);
  if (!existing) throw notFound("Product not found");
  const previousImageUrl = existing.image_url;

  let imageUrl = previousImageUrl;
  let savedImageUrl: string | null = null;
  if (image) {
    savedImageUrl = await storage.save(image.buffer, image.extension);
    imageUrl = savedImageUrl;
  } else if (input.remove_image === "true") {
    imageUrl = null;
  }

  let updated: ProductWithCategoryRow | null;
  try {
    updated = await products.update(id, toRow(input, imageUrl));
    if (!updated) throw notFound("Product not found");
  } catch (error) {
    if (savedImageUrl) await storage.remove(savedImageUrl);
    throw asMissingCategory(error);
  }

  // Only once the row is committed, so a failed update never destroys the
  // image the product still points at.
  if (previousImageUrl && previousImageUrl !== imageUrl) {
    await storage.remove(previousImageUrl);
  }
  return updated;
}

export async function remove(id: string): Promise<void> {
  const deleted = await products.remove(id);
  if (!deleted) throw notFound("Product not found");
  await storage.remove(deleted.image_url);
}
