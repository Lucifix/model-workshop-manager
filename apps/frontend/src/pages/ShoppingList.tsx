import { useState } from "react";
import {
  useShoppingList,
  useMarkPurchased,
  useAddShoppingListItem,
  useAddPaintToInventory,
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

export default function ShoppingList() {
  const { data, isLoading, isError } = useShoppingList();
  const markPurchased = useMarkPurchased();
  const addItem = useAddShoppingListItem();
  const addToInventory = useAddPaintToInventory();
  const [showForm, setShowForm] = useState(false);
  const [selectedPaint, setSelectedPaint] = useState<PickedPaint | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    quantity: 1,
    priority: "normal" as "low" | "normal" | "high",
  });
  const [addedToInventory, setAddedToInventory] = useState<Set<number>>(new Set());

  const resetForm = () => {
    setFormData({ description: "", quantity: 1, priority: "normal" });
    setSelectedPaint(null);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    addItem.mutate(
      {
        description: formData.description,
        quantity: formData.quantity || 1,
        priority: formData.priority,
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

  const handleAddToInventory = (paintId: number, quantity: number) => {
    addToInventory.mutate(
      { paintId, quantity, fillLevel: "Full" },
      { onSuccess: () => setAddedToInventory((prev) => new Set(prev).add(paintId)) },
    );
  };

  if (isLoading) {
    return <LoadingState />;
  }
  if (isError) {
    return <ErrorState message="Could not load the shopping list." />;
  }

  const pending = data?.filter((r) => !r.item.purchased) ?? [];
  const purchased = data?.filter((r) => r.item.purchased) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Shopping List"
        description="Paints and supplies you still need."
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
              <p className="mt-1.5 text-xs text-slate-500">
                Linking lets "purchased" go straight into your paint inventory. Skip it for generic
                supplies.
              </p>
            </div>

            <div>
              <FieldLabel>What do you need?</FieldLabel>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Tamiya XF-1 Flat Black, or a new hobby knife"
                required
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                placeholder="Quantity"
                className="flex-1"
              />
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
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

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">To buy ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState message="Nothing on your list right now. Click 'Add item' to get started!" />
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((row) => (
              <Card key={row.item.id} className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  {row.paint && (
                    <span
                      className="h-6 w-6 flex-shrink-0 rounded-full border border-workshop-border"
                      style={{ backgroundColor: row.paint.colorHex ?? "#334155" }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-100 truncate">
                      {row.item.description}
                    </div>
                    <div className="text-xs text-slate-400">
                      Qty {row.item.quantity}
                      {row.paint ? ` · ${row.paint.name}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    tone={priorityTone[row.item.priority as keyof typeof priorityTone] ?? "neutral"}
                  >
                    {row.item.priority}
                  </Badge>
                  <Button size="sm" onClick={() => markPurchased.mutate(row.item.id)}>
                    ✓ Done
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {purchased.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-300">
            Purchased ({purchased.length})
          </h2>
          <div className="flex flex-col gap-2">
            {purchased.map((row) => (
              <Card
                key={row.item.id}
                className="flex items-center justify-between gap-2 opacity-70"
              >
                <span className="truncate text-sm line-through">{row.item.description}</span>
                {row.paint &&
                  (addedToInventory.has(row.paint.id) ? (
                    <span className="flex-shrink-0 text-xs text-emerald-400">✓ In inventory</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-shrink-0"
                      onClick={() => handleAddToInventory(row.paint!.id, row.item.quantity)}
                      disabled={addToInventory.isPending}
                    >
                      + Add to inventory
                    </Button>
                  ))}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
