import * as categories from '../repositories/categories.repository.js';
import * as products from '../repositories/products.repository.js';
import { withTransaction } from '../db/transaction.js';
import { isRestrictViolation, isUniqueViolation } from '../db/errors.js';
import { badRequest, conflict, notFound, validationFailed } from '../lib/errors.js';

export const list = () => categories.findAll();

export const create = (data) => categories.insert(data);

export async function get(id) {
  const category = await categories.findById(id);
  if (!category) throw notFound('Category not found');
  return category;
}

export async function listProducts(id) {
  if (!(await categories.exists(id))) throw notFound('Category not found');
  return products.findByCategory(id);
}

export async function update(id, data) {
  const updated = await categories.update(id, data);
  if (!updated) throw notFound('Category not found');
  return updated;
}

export async function remove(id) {
  try {
    if (!(await categories.remove(id))) throw notFound('Category not found');
  } catch (error) {
    if (!isRestrictViolation(error)) throw error;

    // Not empty. Report how many products block the delete so the client can
    // offer to reassign them.
    const count = await products.countByCategory(id);
    throw conflict(`Category still has ${count} product${count === 1 ? '' : 's'}.`, {
      product_count: count,
    });
  }
}

// Moves every product into another category and deletes the original, as one
// unit: either the products moved and the category is gone, or nothing changed.
export async function reassignAndDelete(sourceId, targetId) {
  if (!Number.isInteger(targetId) || targetId < 1) {
    throw badRequest('Invalid reassign_to');
  }
  if (targetId === sourceId) {
    throw badRequest('reassign_to must be a different category');
  }

  try {
    await withTransaction(async (client) => {
      if (!(await categories.existsForUpdate(sourceId, client))) {
        throw notFound('Category not found');
      }
      if (!(await categories.exists(targetId, client))) {
        throw validationFailed({ reassign_to: 'Category does not exist.' });
      }
      await products.moveToCategory(sourceId, targetId, client);
      await categories.remove(sourceId, client);
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    const names = await products.namesSharedWith(sourceId, targetId);
    throw conflict(
      `Cannot reassign: the target category already has ${names.map((name) => `"${name}"`).join(', ')}.`,
    );
  }
}
