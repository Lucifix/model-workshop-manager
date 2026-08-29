import { useParams, useNavigate } from "react-router-dom";
import { usePaintDetail, useAddPaintToInventory } from "../api/client";
import { Card, LoadingState, ErrorState, Badge } from "../components/ui";
import { useState } from "react";

export default function PaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    quantity: 1,
    fillLevel: "Full",
    storageLocation: "",
    notes: "",
  });

  const { data: paint, isLoading, isError } = usePaintDetail(Number(id));
  const { mutate: addToInventory, isPending } = useAddPaintToInventory();

  if (!id || isNaN(Number(id))) {
    return <ErrorState message="Invalid paint ID." />;
  }

  if (isLoading) return <LoadingState />;
  if (isError || !paint) return <ErrorState message="Could not load paint." />;

  const handleAddToInventory = (e: React.FormEvent) => {
    e.preventDefault();
    addToInventory(
      {
        paintId: paint.id,
        quantity: formData.quantity || 1,
        fillLevel: formData.fillLevel as "Full" | "Mostly Full" | "Half" | "Low" | "Empty",
        storageLocation: formData.storageLocation || undefined,
        notes: formData.notes || undefined,
      },
      {
        onSuccess: () => {
          setShowAddForm(false);
          setFormData({ quantity: 1, fillLevel: "Full", storageLocation: "", notes: "" });
        },
      }
    );
  };

  const isInInventory = paint.inventory && paint.inventory.length > 0;
  const totalQuantity = paint.inventory?.reduce((sum, inv) => sum + inv.quantity, 0) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => navigate("/paints")}
        className="mb-2 text-sm text-slate-400 hover:text-slate-100"
      >
        ← Back to paints
      </button>

      <Card className="flex flex-col gap-6 lg:flex-row">
        <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 lg:h-40 lg:w-40">
          <div
            className="h-24 w-24 rounded-lg border border-slate-600 shadow-lg"
            style={{ backgroundColor: paint.colorHex ?? "#334155" }}
          />
        </div>

        <div className="flex-1">
          <div className="mb-4">
            <h1 className="mb-2 text-2xl font-bold text-slate-100">{paint.name}</h1>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{paint.type}</Badge>
              {paint.finish && <Badge variant="secondary">{paint.finish}</Badge>}
              {paint.colorFamily && <Badge variant="secondary">{paint.colorFamily}</Badge>}
            </div>
          </div>

          <div className="mb-4 space-y-2 text-sm">
            <p>
              <span className="font-medium text-slate-300">Manufacturer:</span>{" "}
              <span className="text-slate-400">Manufacturer ID {paint.manufacturerId}</span>
            </p>
            <p>
              <span className="font-medium text-slate-300">Product Code:</span>{" "}
              <span className="text-slate-400">{paint.productCode}</span>
            </p>
            {paint.sizeMl && (
              <p>
                <span className="font-medium text-slate-300">Size:</span>{" "}
                <span className="text-slate-400">{paint.sizeMl}ml</span>
              </p>
            )}
            {paint.notes && (
              <p>
                <span className="font-medium text-slate-300">Notes:</span>{" "}
                <span className="text-slate-400">{paint.notes}</span>
              </p>
            )}
          </div>

          <div className="flex gap-3">
            {!isInInventory ? (
              <>
                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="rounded bg-workshop-accent px-4 py-2 text-sm font-medium text-white hover:bg-workshop-accent/90"
                  >
                    Add to my paints
                  </button>
                ) : (
                  <form onSubmit={handleAddToInventory} className="flex flex-col gap-3">
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                      placeholder="Quantity"
                      className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
                    />
                    <select
                      value={formData.fillLevel}
                      onChange={(e) => setFormData({ ...formData, fillLevel: e.target.value })}
                      className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
                    >
                      <option value="Full">Full</option>
                      <option value="Mostly Full">Mostly Full</option>
                      <option value="Half">Half</option>
                      <option value="Low">Low</option>
                      <option value="Empty">Empty</option>
                    </select>
                    <input
                      type="text"
                      value={formData.storageLocation}
                      onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                      placeholder="Storage location"
                      className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
                    />
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes"
                      rows={2}
                      className="rounded border border-slate-700 bg-workshop-panel px-3 py-2 text-sm outline-none focus:border-workshop-accent"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 rounded bg-workshop-accent px-3 py-2 text-sm font-medium text-white hover:bg-workshop-accent/90 disabled:opacity-50"
                      >
                        {isPending ? "Adding..." : "Add"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 rounded border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="rounded border border-green-900 bg-green-950/30 px-4 py-2 text-sm font-medium text-green-400">
                ✓ In your inventory ({totalQuantity} bottles)
              </div>
            )}
          </div>
        </div>
      </Card>

      {isInInventory && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-300">Your inventory</h2>
          <ul className="space-y-2">
            {paint.inventory.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between rounded border border-slate-700 p-2 text-sm"
              >
                <div>
                  <div className="font-medium text-slate-100">
                    {inv.quantity} bottle{inv.quantity !== 1 ? "s" : ""} - {inv.fillLevel}
                  </div>
                  {inv.storageLocation && (
                    <div className="text-xs text-slate-500">Location: {inv.storageLocation}</div>
                  )}
                  {inv.notes && <div className="text-xs text-slate-500">Notes: {inv.notes}</div>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
