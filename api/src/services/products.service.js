import * as products from "../repositories/products.repository.js";
import { SORT_OPTIONS } from "../repositories/products.repository.js";
import { isForeignKeyViolation } from "../db/errors.js";
import { badRequest, notFound, validationFailed } from "../lib/errors.js";
import { toCents } from "../lib/money.js";
import * as storage from "../lib/storage.js";

const DEFAULT_SORT = "name_asc";

// On insert or update a foreign key violation means the category does not
// exist, which is a validation failure rather than a conflict.
const asMissingCategory = (error) =>
  isForeignKeyViolation(error)
    ? validationFailed({ category_id: "Category does not exist." })
    : error;

const toRow = (input, imageUrl) => ({
  categoryId: input.category_id,
  name: input.name,
  priceCents: toCents(input.price),
  stockQuantity: input.stock_quantity ?? 0,
  imageUrl,
});

export function list({ category, q, sort }) {
  let categoryId;
  if (category !== undefined) {
    categoryId = Number(category);
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      throw badRequest("Invalid category filter");
    }
  }

  const sortKey = sort ?? DEFAULT_SORT;
  if (!SORT_OPTIONS[sortKey]) {
    throw badRequest(`Invalid sort. Allowed: ${Object.keys(SORT_OPTIONS).join(", ")}`);
  }

  return products.findAll({ categoryId, search: String(q ?? "").trim(), sort: sortKey });
}

export async function get(id) {
  const product = await products.findById(id);
  if (!product) throw notFound("Product not found");
  return product;
}

export async function create(input, image) {
  const imageUrl = image ? await storage.save(image.buffer, image.extension) : null;

  try {
    return await products.insert(toRow(input, imageUrl));
  } catch (error) {
    if (imageUrl) await storage.remove(imageUrl);
    throw asMissingCategory(error);
  }
}

export async function update(id, input, image) {
  const existing = await products.findImage(id);
  if (!existing) throw notFound("Product not found");
  const previousImageUrl = existing.image_url;

  let imageUrl = previousImageUrl;
  let savedImageUrl = null;
  if (image) {
    savedImageUrl = await storage.save(image.buffer, image.extension);
    imageUrl = savedImageUrl;
  } else if (input.remove_image === "true") {
    imageUrl = null;
  }

  let updated;
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

export async function remove(id) {
  const deleted = await products.remove(id);
  if (!deleted) throw notFound("Product not found");
  await storage.remove(deleted.image_url);
}
