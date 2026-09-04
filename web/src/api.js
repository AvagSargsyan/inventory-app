const BASE_URL = import.meta.env.VITE_API_URL ?? "";

// A response the server did answer, carrying the { error, fields } shape the
// API documents. `body` keeps the rest of it — the non-empty-category 409
// arrives with a product_count the reassign dialog needs.
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.fields = body?.fields ?? null;
    this.body = body;
  }
}

// No response at all: offline, DNS, CORS, connection refused. Distinct from a
// 500, which means the server answered and said it broke.
export class NetworkError extends Error {
  constructor(cause) {
    super("Could not reach the server.");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

async function request(path, { method = "GET", json, form } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      // No Content-Type for FormData — the browser has to add the multipart
      // boundary itself.
      ...(json !== undefined && {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      }),
      ...(form !== undefined && { body: form }),
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  const body = response.status === 204 ? null : await readJson(response);
  if (!response.ok) throw new ApiError(response.status, body);
  return body;
}

// An error can come from a proxy rather than the API, so a non-JSON body must
// not turn into a parse exception that hides the status.
async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function query(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  }
  const string = search.toString();
  return string ? `?${string}` : "";
}

export const listCategories = () => request("/api/categories");

export const getCategory = (id) => request(`/api/categories/${id}`);

export const listCategoryProducts = (id) => request(`/api/categories/${id}/products`);

export const createCategory = (data) => request("/api/categories", { method: "POST", json: data });

export const updateCategory = (id, data) =>
  request(`/api/categories/${id}`, { method: "PUT", json: data });

// reassignTo moves the products into that category first, in one transaction.
// Without it, a category holding products is a 409.
export const deleteCategory = (id, { reassignTo } = {}) =>
  request(`/api/categories/${id}${query({ reassign_to: reassignTo })}`, { method: "DELETE" });

export const listProducts = ({ category, q, sort } = {}) =>
  request(`/api/products${query({ category, q, sort })}`);

export const getProduct = (id) => request(`/api/products/${id}`);

export const createProduct = (data) =>
  request("/api/products", { method: "POST", form: toProductForm(data) });

export const updateProduct = (id, data) =>
  request(`/api/products/${id}`, { method: "PUT", form: toProductForm(data) });

export const deleteProduct = (id) => request(`/api/products/${id}`, { method: "DELETE" });

// Keys match the API's field names so a 422's `fields` maps straight onto the
// form inputs. Price goes as a decimal string; the API stores cents.
function toProductForm({ category_id, name, price, stock_quantity, image, remove_image }) {
  const form = new FormData();
  form.set("category_id", category_id ?? "");
  form.set("name", name ?? "");
  form.set("price", price ?? "");
  form.set("stock_quantity", stock_quantity ?? "");
  if (image) form.set("image", image);
  if (remove_image) form.set("remove_image", "true");
  return form;
}

// image_url is stored relative, so it needs the API origin to be loadable.
export function imageUrl(path) {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${BASE_URL}${path}`;
}
