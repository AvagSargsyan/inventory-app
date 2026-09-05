const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export type FieldErrors = Record<string, string>;

// The error shape the API documents. `product_count` rides along on the
// non-empty-category 409 so the reassign dialog can name the number.
export type ApiErrorBody = {
  error: string;
  fields?: FieldErrors;
  product_count?: number;
};

export type Category = {
  id: number;
  name: string;
  description: string | null;
  product_count: number;
  // ISO strings over the wire, Date in the database row.
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: number;
  category_id: number;
  name: string;
  price_cents: number;
  stock_quantity: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

// GET /api/products joins the category name; GET /api/categories/:id/products
// does not, because the category is already the resource being viewed.
export type ProductWithCategory = Product & { category_name: string };

export type CategoryInput = {
  name: string;
  description?: string | null;
};

export type ProductInput = {
  category_id: number | string;
  name: string;
  price: string;
  stock_quantity?: number | string;
  image?: Blob;
  remove_image?: boolean;
};

export type ProductFilters = {
  category?: number | string;
  q?: string;
  sort?: string;
};

// A response the server did answer, carrying the { error, fields } shape.
// `body` keeps the rest of it for callers that need product_count.
export class ApiError extends Error {
  readonly status: number;
  readonly fields: FieldErrors | null;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
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
  override readonly cause: unknown;

  constructor(cause: unknown) {
    super("Could not reach the server.");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

type RequestOptions = {
  method?: string;
  json?: unknown;
  form?: FormData;
};

async function request<T>(path: string, { method = "GET", json, form }: RequestOptions = {}) {
  let response: Response;
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
  if (!response.ok) throw new ApiError(response.status, body as ApiErrorBody | null);
  // The server owns this contract; there is no runtime schema to check it
  // against, so this is the one place a response shape is claimed.
  return body as T;
}

// An error can come from a proxy rather than the API, so a non-JSON body must
// not turn into a parse exception that hides the status.
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

type QueryValue = string | number | boolean | undefined | null;

function query(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const string = search.toString();
  return string ? `?${string}` : "";
}

export const listCategories = () => request<Category[]>("/api/categories");

export const getCategory = (id: number | string) => request<Category>(`/api/categories/${id}`);

export const listCategoryProducts = (id: number | string) =>
  request<Product[]>(`/api/categories/${id}/products`);

export const createCategory = (data: CategoryInput) =>
  request<Category>("/api/categories", { method: "POST", json: data });

export const updateCategory = (id: number | string, data: CategoryInput) =>
  request<Category>(`/api/categories/${id}`, { method: "PUT", json: data });

// reassignTo moves the products into that category first, in one transaction.
// Without it, a category holding products is a 409.
export const deleteCategory = (id: number | string, { reassignTo }: { reassignTo?: number } = {}) =>
  request<null>(`/api/categories/${id}${query({ reassign_to: reassignTo })}`, { method: "DELETE" });

export const listProducts = ({ category, q, sort }: ProductFilters = {}) =>
  request<ProductWithCategory[]>(`/api/products${query({ category, q, sort })}`);

export const getProduct = (id: number | string) =>
  request<ProductWithCategory>(`/api/products/${id}`);

export const createProduct = (data: ProductInput) =>
  request<ProductWithCategory>("/api/products", { method: "POST", form: toProductForm(data) });

export const updateProduct = (id: number | string, data: ProductInput) =>
  request<ProductWithCategory>(`/api/products/${id}`, {
    method: "PUT",
    form: toProductForm(data),
  });

export const deleteProduct = (id: number | string) =>
  request<null>(`/api/products/${id}`, { method: "DELETE" });

// Keys match the API's field names so a 422's `fields` maps straight onto the
// form inputs. Price goes as a decimal string; the API stores cents.
function toProductForm({
  category_id,
  name,
  price,
  stock_quantity,
  image,
  remove_image,
}: ProductInput): FormData {
  const form = new FormData();
  form.set("category_id", String(category_id ?? ""));
  form.set("name", name ?? "");
  form.set("price", String(price ?? ""));
  form.set("stock_quantity", String(stock_quantity ?? ""));
  if (image) form.set("image", image);
  if (remove_image) form.set("remove_image", "true");
  return form;
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

// A rejection can be anything, so callers narrow through here rather than
// assuming `.message` exists.
export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// image_url is stored relative, so it needs the API origin to be loadable.
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${BASE_URL}${path}`;
}
