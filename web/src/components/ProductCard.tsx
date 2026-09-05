import { Link } from "react-router-dom";
import { imageUrl } from "@/api";
import type { Product, ProductWithCategory } from "@/api";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteProductDialog } from "@/components/DeleteProductDialog";

// Accepts either shape: category_name is absent from
// /api/categories/:id/products, where the category is already the page.
type ProductCardProduct = Product | ProductWithCategory;

const categoryNameOf = (product: ProductCardProduct): string | undefined =>
  "category_name" in product ? product.category_name : undefined;

export function ProductCard({
  product,
  onDeleted,
}: {
  product: ProductCardProduct;
  onDeleted: () => void;
}) {
  const { id, name, price_cents, stock_quantity, image_url } = product;
  const categoryName = categoryNameOf(product);
  const src = imageUrl(image_url);

  return (
    <Card className="flex-1 px-5 pt-0">
      {/* -mx-5 escapes the card padding; aspect-ratio reserves the space so a
          loading image never shifts the card. */}
      <div className="-mx-5 flex aspect-[4/3] items-center justify-center bg-muted">
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm text-muted-foreground">Image</span>
        )}
      </div>

      <h2 className="text-xl font-semibold">{name}</h2>
      {categoryName && <p className="text-[0.9375rem] text-muted-foreground">{categoryName}</p>}

      <div className="flex items-center justify-between gap-3">
        <span className="text-xl font-bold">{formatPrice(price_cents)}</span>
        <Badge variant="secondary" className="whitespace-nowrap">
          {stock_quantity} in stock
        </Badge>
      </div>

      {/* Two equal halves, 8px apart — the tightest touch-target pair here. */}
      <div className="mt-auto grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <Link to={`/products/${id}/edit`}>Edit</Link>
        </Button>
        <DeleteProductDialog product={{ id, name }} onDeleted={onDeleted} />
      </div>
    </Card>
  );
}
