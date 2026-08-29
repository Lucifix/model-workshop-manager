import { useShoppingList, useMarkPurchased } from "../api/client";
import { Card, LoadingState, ErrorState, EmptyState, Badge } from "../components/ui";

const priorityTone = { high: "warn", normal: "neutral", low: "neutral" } as const;

export default function ShoppingList() {
  const { data, isLoading, isError } = useShoppingList();
  const markPurchased = useMarkPurchased();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Could not load the shopping list." />;

  const pending = data?.filter((r) => !r.item.purchased) ?? [];
  const purchased = data?.filter((r) => r.item.purchased) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">To buy</h2>
        {pending.length === 0 ? (
          <EmptyState message="Nothing on your list right now." />
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((row) => (
              <Card key={row.item.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-100">{row.item.description}</div>
                  <div className="text-xs text-slate-400">
                    Qty {row.item.quantity}
                    {row.paint ? ` · ${row.paint.name}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={priorityTone[row.item.priority as keyof typeof priorityTone] ?? "neutral"}>
                    {row.item.priority}
                  </Badge>
                  <button
                    onClick={() => markPurchased.mutate(row.item.id)}
                    className="rounded-lg bg-workshop-accent px-3 py-1.5 text-xs font-medium text-slate-900"
                  >
                    Mark purchased
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {purchased.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Purchased</h2>
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
