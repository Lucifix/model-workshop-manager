import { useState } from "react";
import { toast } from "sonner";
import {
  useWishlist,
  useAddWishlistItem,
  useDeleteWishlistItem,
  useMoveWishlistItemToShoppingList,
  type WishlistRow,
} from "../api/client";
import {
  Card,
  LoadingState,
  ErrorState,
  EmptyState,
  Badge,
  PageHeader,
  Button,
  Input,
  Select,
  FieldLabel,
} from "../components/ui";
import { PaintPicker, type PickedPaint } from "../components/PaintPicker";

const priorityTone = { high: "warn", normal: "neutral", low: "neutral" } as const;

export default function Wishlist() {
  const { data, isLoading, isError } = useWishlist();
  const addItem = useAddWishlistItem();
  const deleteItem = useDeleteWishlistItem();
  const moveToShoppingList = useMoveWishlistItemToShoppingList();
  const [showForm, setShowForm] = useState(false);
  const [selectedPaint, setSelectedPaint] = useState<PickedPaint | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    priority: "normal" as "low" | "normal" | "high",
    targetPrice: "",
  });

  const resetForm = () => {
    setFormData({ description: "", priority: "normal", targetPrice: "" });
    setSelectedPaint(null);
  };

  const handleDelete = (row: WishlistRow) => {
    deleteItem.mutate(row.item.id, {
      onSuccess: () => {
        toast(`Removed "${row.item.description}" from wishlist`, {
          action: {
            label: "Undo",
            onClick: () =>
              addItem.mutate({
                description: row.item.description,
                priority: row.item.priority as "low" | "normal" | "high",
                targetPrice: row.item.targetPrice ?? undefined,
                paintId: row.paint?.id,
              }),
          },
        });
      },
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    addItem.mutate(
      {
        description: formData.description,
        priority: formData.priority,
        targetPrice: formData.targetPrice ? Number(formData.targetPrice) : undefined,
        paintId: selectedPaint?.id,
      },
      {
        onSuccess: () => {
          resetForm();
          setShowForm(false);
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingState />;
  }
  if (isError) {
    return <ErrorState message="Could not load the wishlist." />;
  }

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Wishlist"
        description="Things you'd like eventually — not committed to buying yet."
        actions={!showForm && <Button onClick={() => setShowForm(true)}>+ Add item</Button>}
      />

      {showForm && (
        <Card>
          <form onSubmit={handleAddItem} className="flex flex-col gap-3">
            <div>
              <FieldLabel>Link to a catalog paint (optional)</FieldLabel>
              {!selectedPaint ? (
                <PaintPicker
                  onSelect={(p) => {
                    setSelectedPaint(p);
                    if (!formData.description.trim()) {
                      setFormData({ ...formData, description: p.name });
                    }
                  }}
                />
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-workshop-border p-2 text-sm">
                  <span
                    className="h-4 w-4 flex-shrink-0 rounded-full border border-workshop-border"
                    style={{ backgroundColor: selectedPaint.colorHex ?? "#334155" }}
                  />
                  <span className="flex-1 truncate text-slate-200">{selectedPaint.name}</span>
                  <button
                    type="button"
                    className="text-xs text-slate-500 hover:text-slate-300"
                    onClick={() => setSelectedPaint(null)}
                  >
                    unlink
                  </button>
                </div>
              )}
            </div>

            <div>
              <FieldLabel>What do you want?</FieldLabel>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Tamiya XF-1 Flat Black, or a new airbrush"
                required
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="flex-1"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.targetPrice}
                onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
                placeholder="Target price (optional)"
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={addItem.isPending} className="flex-1">
                {addItem.isPending ? "Adding..." : "Add"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {rows.length === 0 ? (
        <EmptyState message="Nothing on your wishlist yet. Click 'Add item' to get started!" />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Card key={row.item.id} className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                {row.paint && (
                  <span
                    className="h-6 w-6 flex-shrink-0 rounded-full border border-workshop-border"
                    style={{ backgroundColor: row.paint.colorHex ?? "#334155" }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="break-words text-sm font-medium text-slate-100">
                    {row.item.description}
                  </div>
                  <div className="text-xs text-slate-400">
                    {row.item.targetPrice != null
                      ? `Target $${row.item.targetPrice.toFixed(2)}`
                      : ""}
                    {row.paint ? ` · ${row.paint.name}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0 sm:flex-nowrap">
                <Badge
                  tone={priorityTone[row.item.priority as keyof typeof priorityTone] ?? "neutral"}
                >
                  {row.item.priority}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => moveToShoppingList.mutate(row.item.id)}
                  disabled={moveToShoppingList.isPending}
                >
                  → Shopping list
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(row)}
                  disabled={deleteItem.isPending}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
