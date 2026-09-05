import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { errorMessage, listCategories, listProducts } from "@/api";
import type { Category } from "@/api";
import { useApi } from "@/hooks/useApi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CardGrid, CardGridItem } from "@/components/CardGrid";
import { Container } from "@/components/Container";
import { ProductCard } from "@/components/ProductCard";

// Radix rejects an empty string as a SelectItem value, so "every category"
// needs a sentinel that never reaches the query string.
const ALL_CATEGORIES = "all";

const SEARCH_DEBOUNCE_MS = 300;

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const q = searchParams.get("q") ?? "";

  // Categories feed the filter and do not change with it, so they load once at
  // this level rather than with every result set.
  const categoriesState = useApi(listCategories);

  // Updates one parameter and leaves the other alone. The functional form of
  // setSearchParams keeps this callback stable, so the debounce effect below
  // is not rescheduled on every render.
  const setFilter = useCallback(
    (key: "q" | "category", value: string, { replace = false } = {}) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (value) params.set(key, value);
          else params.delete(key);
          return params;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  // Typing replaces the entry rather than pushing one, or Back would walk
  // through every keystroke. Choosing a category is a discrete act, so it
  // pushes and Back undoes it.
  const search = useCallback(
    (value: string) => setFilter("q", value, { replace: true }),
    [setFilter],
  );
  const chooseCategory = useCallback((value: string) => setFilter("category", value), [setFilter]);

  return (
    <Container className="py-6 md:py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-heading text-[clamp(1.5rem,5vw,2rem)] font-bold">Products</h1>
        <Button asChild>
          <Link to="/products/new">+ Add Product</Link>
        </Button>
      </div>

      <Filters
        category={category}
        q={q}
        categories={categoriesState.status === "ready" ? categoriesState.data : []}
        onSearch={search}
        onCategoryChange={chooseCategory}
      />

      {/* Remounting on the filters resets the request to loading, rather than
          leaving the previous results on screen under the new query. */}
      <Results
        key={`${category}|${q}`}
        category={category}
        q={q}
        filtered={Boolean(category || q)}
      />
    </Container>
  );
}

type FiltersProps = {
  category: string;
  q: string;
  categories: Category[];
  onSearch: (value: string) => void;
  onCategoryChange: (value: string) => void;
};

function Filters({ category, q, categories, onSearch, onCategoryChange }: FiltersProps) {
  const [draft, setDraft] = useState(q);
  const [applied, setApplied] = useState(q);

  // The query can change without the user typing — "Clear filters", or the
  // Back button. Adjusting state during render is React's documented
  // alternative to mirroring a prop with an effect, and it cannot be a key on
  // this component: remounting mid-keystroke would steal focus from the input.
  if (q !== applied) {
    setApplied(q);
    setDraft(q);
  }

  // Search as you type, one request after the typing stops.
  useEffect(() => {
    if (draft === q) return;
    const timer = setTimeout(() => onSearch(draft), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, q, onSearch]);

  return (
    <form
      className="mb-6 flex flex-col gap-3 md:flex-row md:items-end"
      // No submit button: Enter simply applies the pending search now instead
      // of waiting out the debounce.
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(draft);
      }}
    >
      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="product-search" className="font-mono text-sm">
          Search
        </Label>
        <Input
          id="product-search"
          name="q"
          type="search"
          placeholder="Product name"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2 md:w-56">
        <Label htmlFor="product-category" className="font-mono text-sm">
          Category
        </Label>
        <Select
          value={category || ALL_CATEGORIES}
          onValueChange={(value) => onCategoryChange(value === ALL_CATEGORIES ? "" : value)}
        >
          <SelectTrigger id="product-category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {categories.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </form>
  );
}

function Results({ category, q, filtered }: { category: string; q: string; filtered: boolean }) {
  const state = useApi(() => listProducts({ category, q }));

  if (state.status === "loading") return <LoadingGrid />;

  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Could not load products</AlertTitle>
        <AlertDescription>{errorMessage(state.error)}</AlertDescription>
      </Alert>
    );
  }

  if (state.data.length === 0) {
    return (
      <Card className="items-center gap-4 py-10 text-center">
        <p className="text-muted-foreground">
          {filtered ? "No products match these filters." : "No products yet."}
        </p>
        <Button asChild variant={filtered ? "outline" : "default"}>
          {filtered ? (
            <Link to="/products">Clear filters</Link>
          ) : (
            <Link to="/products/new">Add the first one</Link>
          )}
        </Button>
      </Card>
    );
  }

  return (
    <CardGrid as="ul">
      {state.data.map((product) => (
        <CardGridItem key={product.id}>
          <ProductCard product={product} />
        </CardGridItem>
      ))}
    </CardGrid>
  );
}

function LoadingGrid() {
  return (
    <CardGrid aria-busy="true" aria-label="Loading products">
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i} className="px-5 pt-0">
          <Skeleton className="-mx-5 aspect-[4/3] rounded-none" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-auto h-11 w-full" />
        </Card>
      ))}
    </CardGrid>
  );
}
