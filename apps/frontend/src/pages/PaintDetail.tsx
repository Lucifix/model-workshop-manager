import { useParams, useNavigate } from "react-router-dom";
import { usePaintDetail, useAddPaintToInventory } from "../api/client";
import { Card, LoadingState, ErrorState, Badge, Button, Input, Select, Textarea } from "../components/ui";
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
      <Button variant="ghost" size="sm" onClick={() => navigate("/paints")} className="self-start -ml-2.5">
        ← Back to paints
      </Button>

      <Card className="flex flex-col gap-6 lg:flex-row">
        <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-xl border border-workshop-border bg-workshop-panelmuted lg:h-40 lg:w-40">
          <div
            className="h-24 w-24 rounded-xl border border-slate-600 shadow-lg"
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
                  <Button onClick={() => setShowAddForm(true)}>Add to my paints</Button>
                ) : (
                  <form onSubmit={handleAddToInventory} className="flex w-full flex-col gap-3">
                    <Input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                      placeholder="Quantity"
                    />
                    <Select
                      value={formData.fillLevel}
                      onChange={(e) => setFormData({ ...formData, fillLevel: e.target.value })}
                    >
                      <option value="Full">Full</option>
                      <option value="Mostly Full">Mostly Full</option>
                      <option value="Half">Half</option>
                      <option value="Low">Low</option>
                      <option value="Empty">Empty</option>
                    </Select>
                    <Input
                      type="text"
                      value={formData.storageLocation}
                      onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                      placeholder="Storage location"
                    />
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isPending} className="flex-1">
                        {isPending ? "Adding..." : "Add"}
                      </Button>
                      <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-emerald-900 bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-400">
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
                className="flex items-center justify-between rounded-lg border border-workshop-border p-2 text-sm"
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
