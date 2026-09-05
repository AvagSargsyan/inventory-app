import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { listCategories } from "@/api";
import { useApi } from "@/hooks/useApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CardGrid, CardGridItem } from "@/components/CardGrid";
import { Container } from "@/components/Container";

export default function Categories() {
  const state = useApi(listCategories);

  return (
    <Container className="py-6 md:py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-heading text-[clamp(1.5rem,5vw,2rem)] font-bold">Categories</h1>
        <Button asChild>
          <Link to="/categories/new">+ Add Category</Link>
        </Button>
      </div>

      {state.status === "loading" && <LoadingGrid />}

      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Could not load categories</AlertTitle>
          <AlertDescription>{state.error.message}</AlertDescription>
        </Alert>
      )}

      {state.status === "ready" && state.data.length === 0 && (
        <Card className="items-center gap-4 py-10 text-center">
          <p className="text-muted-foreground">No categories yet.</p>
          <Button asChild>
            <Link to="/categories/new">Add the first one</Link>
          </Button>
        </Card>
      )}

      {state.status === "ready" && state.data.length > 0 && (
        <CardGrid as="ul">
          {state.data.map((category) => (
            <CardGridItem key={category.id}>
              <CategoryCard category={category} />
            </CardGridItem>
          ))}
        </CardGrid>
      )}
    </Container>
  );
}

function CategoryCard({ category }) {
  const { id, name, description, product_count } = category;
  return (
    <Card className="flex-1 px-5">
      <h2 className="text-xl font-semibold">
        <Link to={`/categories/${id}`} className="hover:text-primary">
          {name}
        </Link>
      </h2>
      {description && <p className="text-[0.9375rem] text-muted-foreground">{description}</p>}
      <Badge variant="secondary" className="w-fit">
        {product_count} {product_count === 1 ? "product" : "products"}
      </Badge>
      <Button asChild variant="outline" className="mt-auto">
        <Link to={`/categories/${id}/edit`}>Edit</Link>
      </Button>
    </Card>
  );
}

function LoadingGrid() {
  return (
    <CardGrid aria-busy="true" aria-label="Loading categories">
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="px-5">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-auto h-11 w-full" />
        </Card>
      ))}
    </CardGrid>
  );
}
