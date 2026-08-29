import { useState } from "react";
import { useShoppingList, useMarkPurchased, useAddShoppingListItem } from "../api/client";
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

const priorityTone = { high: "warn", normal: "neutral", low: "neutral" } as const;

export default function ShoppingList() {
  const { data, isLoading, isError } = useShoppingList();
  const markPurchased = useMarkPurchased();
  const addItem = useAddShoppingListItem();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    quantity: 1,
    priority: "normal" as "low" | "normal" | "high",
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    addItem.mutate(
      {
        description: formData.description,
        quantity: formData.quantity || 1,
        priority: formData.priority,
      },
      {
        onSuccess: () => {
          setFormData({ description: "", quantity: 1, priority: "normal" });
          setShowForm(false);
        },
      }
    );
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load the shopping list." />;

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
              <FieldLabel>What do you need?</FieldLabel>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Tamiya XF-1 Flat Black"
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
                  setFormData({ description: "", quantity: 1, priority: "normal" });
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
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-100 truncate">{row.item.description}</div>
                  <div className="text-xs text-slate-400">
                    Qty {row.item.quantity}
                    {row.paint ? ` · ${row.paint.name}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge tone={priorityTone[row.item.priority as keyof typeof priorityTone] ?? "neutral"}>
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
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Purchased ({purchased.length})</h2>
          <div className="flex flex-col gap-2 opacity-60">
            {purchased.map((row) => (
              <Card key={row.item.id}>
                <span className="text-sm line-through">{row.item.description}</span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
