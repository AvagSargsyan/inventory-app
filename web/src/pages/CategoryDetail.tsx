import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { errorMessage, getCategory, isApiError, listCategoryProducts } from "@/api";
import { useApi } from "@/hooks/useApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CardGrid, CardGridItem } from "@/components/CardGrid";
import { Container } from "@/components/Container";
import { DeleteCategoryDialog } from "@/components/DeleteCategoryDialog";
import { ProductCard } from "@/components/ProductCard";

// Keyed on the id so moving between two categories remounts rather than
// showing the previous category's products under the new heading.
export default function CategoryDetail() {
  const { id } = useParams();
  // Bumped after a product is deleted, so the list and the count refetch.
  const [version, setVersion] = useState(0);
  return (
    <CategoryDetailView
      key={`${id}|${version}`}
      id={id ?? ""}
      onChanged={() => setVersion((current) => current + 1)}
    />
  );
}

function CategoryDetailView({ id, onChanged }: { id: string; onChanged: () => void }) {
  const navigate = useNavigate();
  // One request pair, so there is one loading state and one error state. A
  // missing category rejects here rather than rendering an empty shell.
  const state = useApi(() => Promise.all([getCategory(id), listCategoryProducts(id)]));

  if (state.status === "loading") return <LoadingView />;

  if (state.status === "error") {
    const missing = isApiError(state.error) && state.error.status === 404;
    return (
      <Container className="py-6 md:py-8">
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>{missing ? "Category not found" : "Could not load this category"}</AlertTitle>
          <AlertDescription>
            {missing ? "It may have been deleted." : errorMessage(state.error)}
          </AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/categories">Back to categories</Link>
        </Button>
      </Container>
    );
  }

  const [category, products] = state.data;

  return (
    <Container className="py-6 md:py-8">
      <div className="mb-6 flex flex-col gap-4">
        <Link to="/categories" className="text-[0.9375rem] text-primary hover:underline">
          ← All categories
        </Link>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-[clamp(1.5rem,5vw,2rem)] font-bold">
              {category.name}
            </h1>
            {category.description && (
              <p className="max-w-[65ch] text-muted-foreground">{category.description}</p>
            )}
            <Badge variant="secondary" className="w-fit">
              {category.product_count} {category.product_count === 1 ? "product" : "products"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to={`/categories/${category.id}/edit`}>Edit category</Link>
            </Button>
            {/* Deleting the category one is looking at leaves nowhere to
                return to, so it navigates rather than refetching. */}
            <DeleteCategoryDialog
              category={{ id: category.id, name: category.name }}
              onDeleted={() => navigate("/categories")}
            />
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <Card className="items-center gap-4 py-10 text-center">
          <p className="text-muted-foreground">No products in this category yet.</p>
          <Button asChild>
            <Link to="/products/new">Add a product</Link>
          </Button>
        </Card>
      ) : (
        <CardGrid as="ul">
          {products.map((product) => (
            <CardGridItem key={product.id}>
              <ProductCard product={product} onDeleted={onChanged} />
            </CardGridItem>
          ))}
        </CardGrid>
      )}
    </Container>
  );
}

function LoadingView() {
  return (
    <Container className="py-6 md:py-8">
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <CardGrid aria-busy="true" aria-label="Loading products">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="px-5 pt-0">
            <Skeleton className="-mx-5 aspect-[4/3] rounded-none" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-auto h-11 w-full" />
          </Card>
        ))}
      </CardGrid>
    </Container>
  );
}
