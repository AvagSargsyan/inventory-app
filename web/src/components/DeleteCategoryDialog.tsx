import { useState } from "react";
import { deleteCategory, errorMessage, isApiError, listCategories } from "@/api";
import type { Category } from "@/api";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Phase = { step: "confirm" } | { step: "reassign"; productCount: number };

// §5: deleting a category that still holds products is a 409. Rather than a
// dead end, the dialog turns into a move-them-somewhere-else prompt.
export function DeleteCategoryDialog({
  category,
  onDeleted,
}: {
  category: { id: number; name: string };
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ step: "confirm" });
  const [targets, setTargets] = useState<Category[]>([]);
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setPhase({ step: "confirm" });
    setTargets([]);
    setTarget("");
    setError(null);
  }

  function finish() {
    setOpen(false);
    onDeleted();
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteCategory(category.id);
      finish();
    } catch (caught) {
      const count = isApiError(caught) ? caught.body?.product_count : undefined;
      if (typeof count !== "number") {
        setError(errorMessage(caught));
        return;
      }
      // Only fetched once the 409 proves it is needed, so every page does not
      // load the whole category list just in case.
      const others = (await listCategories()).filter((item) => item.id !== category.id);
      setTargets(others);
      setTarget(others[0] ? String(others[0].id) : "");
      setPhase({ step: "reassign", productCount: count });
    } finally {
      setBusy(false);
    }
  }

  async function confirmReassign() {
    setBusy(true);
    setError(null);
    try {
      await deleteCategory(category.id, { reassignTo: Number(target) });
      finish();
    } catch (caught) {
      // A collision rolls the whole transaction back and names the products
      // that blocked it.
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  const nowhereToMove = phase.step === "reassign" && targets.length === 0;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {phase.step === "confirm"
              ? `Delete “${category.name}”?`
              : `“${category.name}” still holds ${phase.productCount} ${phase.productCount === 1 ? "product" : "products"}`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {phase.step === "confirm"
              ? "This cannot be undone."
              : nowhereToMove
                ? "Deleting it would leave those products without a category. Create another category to move them into first."
                : "Deleting it would leave those products without a category, so choose where to move them."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {phase.step === "reassign" && !nowhereToMove && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="reassign-to" className="font-mono text-sm">
              Move products to
            </Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger id="reassign-to" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targets.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          {phase.step === "confirm" ? (
            <Button variant="destructive" disabled={busy} onClick={confirmDelete}>
              {busy ? "Deleting…" : "Delete"}
            </Button>
          ) : (
            !nowhereToMove && (
              <Button variant="destructive" disabled={busy || !target} onClick={confirmReassign}>
                {busy ? "Moving..." : "Move and delete"}
              </Button>
            )
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
