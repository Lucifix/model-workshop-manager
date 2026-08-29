import { useState } from "react";
import { useShoppingList, useMarkPurchased, useAddShoppingListItem } from "../api/client";
import { Card, LoadingState, ErrorState, EmptyState, Badge } from "../components/ui";

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
    addItem(
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Shopping List</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-workshop-accent px-4 py-2 text-sm font-medium text-slate-900 hover:bg-workshop-accent/90"
          >
            + Add item
          </button>
        )}
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleAddItem} className="flex flex-col gap-3">
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What do you need?"
              required
              className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
            />
            <div className="flex gap-2 sm:flex-row gap-2">
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                placeholder="Quantity"
                className="flex-1 rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
              />
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addItem.isPending}
                className="flex-1 rounded bg-workshop-accent px-3 py-2 text-sm font-medium text-slate-900 hover:bg-workshop-accent/90 disabled:opacity-50"
              >
                {addItem.isPending ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ description: "", quantity: 1, priority: "normal" });
                }}
                className="flex-1 rounded border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
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
                  <button
                    onClick={() => markPurchased.mutate(row.item.id)}
                    className="rounded-lg bg-workshop-accent px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-workshop-accent/90"
                  >
                    ✓ Done
                  </button>
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
