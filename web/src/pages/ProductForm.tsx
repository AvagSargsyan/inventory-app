import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import {
  createProduct,
  errorMessage,
  getProduct,
  imageUrl,
  isApiError,
  listCategories,
  updateProduct,
} from "@/api";
import type { Category, FieldErrors, ProductInput, ProductWithCategory } from "@/api";
import { useApi } from "@/hooks/useApi";
import { toSubmitFailure } from "@/lib/formErrors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/Container";
import { FormField } from "@/components/FormField";
import { FormShell } from "@/components/FormShell";

// The chosen file and its object URL travel together, so the URL cannot
// outlive the file it previews.
type Preview = { file: File; url: string };

type Values = {
  name: string;
  price: string;
  stock_quantity: string;
  category_id: string;
};

// One component for both routes, told apart by whether the URL carries an id.
export default function ProductForm() {
  const { id } = useParams();
  return id ? <EditProduct key={id} id={id} /> : <CreateProduct />;
}

function CreateProduct() {
  const state = useApi(listCategories);

  if (state.status === "loading") return <LoadingView title="Add Product" />;
  if (state.status === "error") return <LoadError title="Add Product" error={state.error} />;
  if (state.data.length === 0) return <NoCategories />;

  // §4: the first category is preselected, so the field is never empty.
  const first = state.data[0]!;
  return (
    <ProductFormView
      categories={state.data}
      initial={{ name: "", price: "", stock_quantity: "", category_id: String(first.id) }}
      existingImageUrl={null}
    />
  );
}

function EditProduct({ id }: { id: string }) {
  const state = useApi(() => Promise.all([getProduct(id), listCategories()]));

  if (state.status === "loading") return <LoadingView title="Edit Product" />;
  if (state.status === "error") return <LoadError title="Edit Product" error={state.error} />;

  const [product, categories] = state.data;
  return (
    <ProductFormView
      id={id}
      categories={categories}
      initial={toValues(product)}
      existingImageUrl={product.image_url}
    />
  );
}

const toValues = (product: ProductWithCategory): Values => ({
  name: product.name,
  // Cents back to the decimal string the form and the API both speak.
  price: (product.price_cents / 100).toFixed(2),
  stock_quantity: String(product.stock_quantity),
  category_id: String(product.category_id),
});

type ProductFormViewProps = {
  id?: string;
  categories: Category[];
  initial: Values;
  existingImageUrl: string | null;
};

function ProductFormView({ id, categories, initial, existingImageUrl }: ProductFormViewProps) {
  const navigate = useNavigate();
  const [values, setValues] = useState(initial);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editing = id !== undefined;

  const file = preview?.file ?? null;

  // The URL is created in the handler, so exactly one exists per chosen file —
  // StrictMode double-invokes effects on mount, and creating it there would
  // leak the first one. This releases it when it is replaced and on unmount;
  // on mount there is nothing to release, so the double-invoke is harmless.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  const clearError = (field: string) =>
    setFieldErrors((errors) => {
      if (!errors[field]) return errors;
      const next = { ...errors };
      delete next[field];
      return next;
    });

  const setField = (field: keyof Values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    clearError(field);
  };

  // Choosing a file cancels a pending removal: the two cannot both apply, and
  // the new file is what the user last asked for.
  const chooseFile = (next: File | null) => {
    setPreview(next ? { file: next, url: URL.createObjectURL(next) } : null);
    if (next) setRemoveExisting(false);
    clearError("image");
  };

  const showingExisting = Boolean(existingImageUrl) && !removeExisting && !file;
  const shownImage = preview?.url ?? (showingExisting ? imageUrl(existingImageUrl) : null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    const input: ProductInput = {
      category_id: values.category_id,
      name: values.name,
      // A decimal string the whole way; the API parses the digits, and a float
      // here would undo that precision.
      price: values.price,
      stock_quantity: values.stock_quantity,
      ...(file && { image: file }),
      // Only meaningful when no replacement was chosen.
      ...(removeExisting && !file && { remove_image: true }),
    };

    try {
      if (editing) await updateProduct(id, input);
      else await createProduct(input);
      navigate("/products");
    } catch (error) {
      const failure = toSubmitFailure(error, "name");
      setFieldErrors(failure.fields);
      setFormError(failure.message);
      setSubmitting(false);
    }
  }

  return (
    <FormShell title={editing ? "Edit Product" : "Add Product"}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {formError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Could not save</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <FormField id="product-name" label="Product name" error={fieldErrors.name}>
          {(props) => (
            <Input
              {...props}
              name="name"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
            />
          )}
        </FormField>

        <FormField id="product-price" label="Price" error={fieldErrors.price}>
          {(props) => (
            <Input
              {...props}
              name="price"
              inputMode="decimal"
              placeholder="0.00"
              value={values.price}
              onChange={(event) => setField("price", event.target.value)}
            />
          )}
        </FormField>

        <FormField id="product-stock" label="Stock quantity" error={fieldErrors.stock_quantity}>
          {(props) => (
            <Input
              {...props}
              name="stock_quantity"
              inputMode="numeric"
              placeholder="0"
              value={values.stock_quantity}
              onChange={(event) => setField("stock_quantity", event.target.value)}
            />
          )}
        </FormField>

        <FormField id="product-category" label="Category" error={fieldErrors.category_id}>
          {(props) => (
            <Select
              value={values.category_id}
              onValueChange={(value) => setField("category_id", value)}
            >
              <SelectTrigger {...props} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>

        <FormField id="product-image" label="Image" error={fieldErrors.image}>
          {(props) => (
            <Input
              {...props}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
          )}
        </FormField>

        {shownImage && (
          <div className="flex items-center gap-4">
            <img
              src={shownImage}
              alt={file ? "Selected image preview" : `Current image for ${values.name}`}
              className="aspect-[4/3] w-32 rounded-lg border border-border object-cover"
            />
            {showingExisting && (
              <Button type="button" variant="outline" onClick={() => setRemoveExisting(true)}>
                Remove image
              </Button>
            )}
          </div>
        )}

        {removeExisting && !file && (
          <p className="text-sm text-muted-foreground">
            The image will be removed when you save.{" "}
            <button
              type="button"
              className="text-primary underline"
              onClick={() => setRemoveExisting(false)}
            >
              Keep it
            </button>
          </p>
        )}

        <div className="mt-2 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {editing ? "Save changes" : "Add product"}
          </Button>
        </div>
      </form>
    </FormShell>
  );
}

function NoCategories() {
  return (
    <Container className="py-6 md:py-8">
      <Card className="items-center gap-4 py-10 text-center">
        <p className="text-muted-foreground">A product needs a category, and there are none yet.</p>
        <Button asChild>
          <Link to="/categories/new">Add a category first</Link>
        </Button>
      </Card>
    </Container>
  );
}

function LoadError({ title, error }: { title: string; error: unknown }) {
  const missing = isApiError(error) && error.status === 404;
  return (
    <FormShell title={title}>
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>{missing ? "Product not found" : "Could not load this page"}</AlertTitle>
        <AlertDescription>
          {missing ? "It may have been deleted." : errorMessage(error)}
        </AlertDescription>
      </Alert>
    </FormShell>
  );
}

function LoadingView({ title }: { title: string }) {
  return (
    <FormShell title={title}>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
        <Skeleton className="ml-auto h-11 w-48" />
      </div>
    </FormShell>
  );
}
