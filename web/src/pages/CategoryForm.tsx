import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { createCategory, errorMessage, getCategory, isApiError, updateCategory } from "@/api";
import type { Category, CategoryInput, FieldErrors } from "@/api";
import { useApi } from "@/hooks/useApi";
import { toSubmitFailure } from "@/lib/formErrors";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/FormField";
import { FormShell } from "@/components/FormShell";

type Values = { name: string; description: string };

const EMPTY: Values = { name: "", description: "" };

// One component for both routes, told apart by whether the URL carries an id.
export default function CategoryForm() {
  const { id } = useParams();
  return id ? <EditCategory key={id} id={id} /> : <CategoryFormView initial={EMPTY} />;
}

function EditCategory({ id }: { id: string }) {
  const state = useApi(() => getCategory(id));

  if (state.status === "loading") return <LoadingView />;

  if (state.status === "error") {
    const missing = isApiError(state.error) && state.error.status === 404;
    return (
      <FormShell title="Edit Category">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{missing ? "Category not found" : "Could not load this category"}</AlertTitle>
          <AlertDescription>
            {missing ? "It may have been deleted." : errorMessage(state.error)}
          </AlertDescription>
        </Alert>
      </FormShell>
    );
  }

  return <CategoryFormView id={id} initial={toValues(state.data)} />;
}

const toValues = (category: Category): Values => ({
  name: category.name,
  description: category.description ?? "",
});

function CategoryFormView({ id, initial }: { id?: string; initial: Values }) {
  const navigate = useNavigate();
  const [values, setValues] = useState(initial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const editing = id !== undefined;

  // Editing a field clears its error: the message described the value that was
  // submitted, not the one now in the box.
  const setField = (field: keyof Values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((errors) => {
      if (!errors[field]) return errors;
      const next = { ...errors };
      delete next[field];
      return next;
    });
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    // The server trims and length-checks; the only shaping done here is
    // blank-to-null, so an emptied description clears the column.
    const input: CategoryInput = {
      name: values.name,
      description: values.description.trim() === "" ? null : values.description,
    };

    try {
      if (editing) await updateCategory(id, input);
      else await createCategory(input);
      navigate("/categories");
    } catch (error) {
      const failure = toSubmitFailure(error, "name");
      setFieldErrors(failure.fields);
      setFormError(failure.message);
      setSubmitting(false);
    }
  }

  return (
    <FormShell title={editing ? "Edit Category" : "Add Category"}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {formError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Could not save</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <FormField id="category-name" label="Category name" error={fieldErrors.name}>
          {(props) => (
            <Input
              {...props}
              name="name"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
            />
          )}
        </FormField>

        <FormField id="category-description" label="Description" error={fieldErrors.description}>
          {(props) => (
            <Textarea
              {...props}
              name="description"
              rows={4}
              value={values.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          )}
        </FormField>

        <div className="mt-2 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {editing ? "Save changes" : "Add category"}
          </Button>
        </div>
      </form>
    </FormShell>
  );
}

function LoadingView() {
  return (
    <FormShell title="Edit Category">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="ml-auto h-11 w-48" />
      </div>
    </FormShell>
  );
}
