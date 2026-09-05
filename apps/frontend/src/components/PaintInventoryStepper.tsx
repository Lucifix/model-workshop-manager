import { memo } from "react";
import { toast } from "sonner";
import { useAddPaintToInventory, useRemovePaintFromInventory } from "../api/client";

interface InventoryEntry {
  id: number;
  quantity: number;
  fillLevel: string;
  storageLocation?: string;
  purchasePrice?: number;
  notes?: string;
}

export const PaintInventoryStepper = memo(function PaintInventoryStepper({
  paintId,
  paintName,
  inventory,
  size = "sm",
  className = "",
}: {
  paintId: number;
  paintName: string;
  inventory: InventoryEntry[];
  size?: "sm" | "md";
  className?: string;
}) {
  const addToInventory = useAddPaintToInventory();
  const removeFromInventory = useRemovePaintFromInventory();
  const busy = addToInventory.isPending || removeFromInventory.isPending;
  const totalQty = inventory.reduce((sum, i) => sum + i.quantity, 0);
  const inStock = totalQty > 0;
  const buttonSize = size === "md" ? "h-8 w-8 text-base" : "h-6 w-6 text-sm";

  return (
    <div
      className={`flex shrink-0 items-center gap-0.5 rounded-lg border py-0.5 pl-0.5 pr-1 ${
        inStock ? "border-emerald-800/60 bg-emerald-950/20" : "border-workshop-border"
      } ${className}`}
    >
      <button
        type="button"
        title="Remove one (undo)"
        disabled={busy || !inStock}
        onClick={(e) => {
          e.stopPropagation();
          const last = inventory[inventory.length - 1]!;
          removeFromInventory.mutate(
            { id: last.id, paintId },
            {
              onSuccess: () => {
                toast(`Removed "${paintName}" from inventory`, {
                  action: {
                    label: "Undo",
                    onClick: () =>
                      addToInventory.mutate({
                        paintId,
                        quantity: last.quantity,
                        fillLevel: last.fillLevel,
                        storageLocation: last.storageLocation,
                        purchasePrice: last.purchasePrice,
                        notes: last.notes,
                      }),
                  },
                });
              },
            },
          );
        }}
        className={`flex ${buttonSize} items-center justify-center rounded font-medium text-slate-400 transition-colors hover:text-red-400 disabled:opacity-30`}
      >
        −
      </button>
      <span
        className={`w-5 text-center text-xs font-semibold tabular-nums ${
          inStock ? "text-emerald-400" : "text-slate-500"
        }`}
      >
        {totalQty}
      </span>
      <button
        type="button"
        title="Add one"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          addToInventory.mutate({ paintId, quantity: 1 });
        }}
        className={`flex ${buttonSize} items-center justify-center rounded font-medium text-slate-400 transition-colors hover:text-emerald-400 disabled:opacity-50`}
      >
        +
      </button>
    </div>
  );
});
