import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  usePaintDetail,
  useAddPaintToInventory,
  useRemovePaintFromInventory,
  useUpdatePaint,
  useDeletePaint,
  useManufacturers,
} from "../api/client";
import {
  Card,
  LoadingState,
  ErrorState,
  Badge,
  Button,
  Input,
  Select,
  Textarea,
  FieldLabel,
} from "../components/ui";
import { useState } from "react";
import { useFormatCurrency } from "../lib/currency";

const PAINT_TYPES = [
  "Acrylic",
  "Enamel",
  "Lacquer",
  "Primer",
  "Wash",
  "Panel Liner",
  "Metallic",
  "Weathering",
  "Other",
];

export default function PaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // location.key is "default" when there's no in-app history to go back to
  // (e.g. a direct link or page refresh) — fall back to the plain list route
  // rather than navigating the browser away from the app entirely.
  const goBackToPaints = () => (location.key === "default" ? navigate("/paints") : navigate(-1));
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    quantity: 1,
    fillLevel: "Full",
    storageLocation: "",
    purchasePrice: "",
    notes: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    manufacturerId: string;
    productCode: string;
    name: string;
    type: string;
    finish: string;
    sizeMl: string;
    colorHex: string;
    colorFamily: string;
    notes: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: paint, isLoading, isError } = usePaintDetail(Number(id));
  const { data: manufacturers } = useManufacturers();
  const { mutate: addToInventory, isPending } = useAddPaintToInventory();
  const removeFromInventory = useRemovePaintFromInventory();
  const updatePaint = useUpdatePaint();
  const deletePaint = useDeletePaint();
  const formatCurrency = useFormatCurrency();

  if (!id || isNaN(Number(id))) {
    return <ErrorState message="Invalid paint ID." />;
  }

  if (isLoading) {
    return <LoadingState />;
  }
  if (isError || !paint) {
    return <ErrorState message="Could not load paint." />;
  }

  const handleAddToInventory = (e: React.FormEvent) => {
    e.preventDefault();
    addToInventory(
      {
        paintId: paint.id,
        quantity: formData.quantity || 1,
        fillLevel: formData.fillLevel as "Full" | "Mostly Full" | "Half" | "Low" | "Empty",
        storageLocation: formData.storageLocation || undefined,
        purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
        notes: formData.notes || undefined,
      },
      {
        onSuccess: () => {
          setShowAddForm(false);
          setFormData({
            quantity: 1,
            fillLevel: "Full",
            storageLocation: "",
            purchasePrice: "",
            notes: "",
          });
        },
      },
    );
  };

  const handleStartEdit = () => {
    setEditForm({
      manufacturerId: String(paint.manufacturerId),
      productCode: paint.productCode,
      name: paint.name,
      type: paint.type,
      finish: paint.finish ?? "",
      sizeMl: paint.sizeMl ? String(paint.sizeMl) : "",
      colorHex: paint.colorHex ?? "",
      colorFamily: paint.colorFamily ?? "",
      notes: paint.notes ?? "",
    });
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) {
      return;
    }
    updatePaint.mutate(
      {
        id: paint.id,
        data: {
          manufacturerId: Number(editForm.manufacturerId),
          productCode: editForm.productCode.trim(),
          name: editForm.name.trim(),
          type: editForm.type,
          finish: editForm.finish || undefined,
          sizeMl: editForm.sizeMl ? Number(editForm.sizeMl) : undefined,
          colorHex: editForm.colorHex || undefined,
          colorFamily: editForm.colorFamily || undefined,
          notes: editForm.notes || undefined,
        },
      },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleDelete = () => {
    setDeleteError(null);
    if (!confirm(`Delete "${paint.name}"? This can't be undone.`)) {
      return;
    }
    deletePaint.mutate(paint.id, {
      onSuccess: () => goBackToPaints(),
      onError: (err) => setDeleteError(err.message),
    });
  };

  const isInInventory = paint.inventory && paint.inventory.length > 0;
  const totalQuantity = paint.inventory?.reduce((sum, inv) => sum + inv.quantity, 0) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" onClick={goBackToPaints} className="self-start -ml-2.5">
        ← Back to paints
      </Button>

      <Card className="flex flex-col gap-6 lg:flex-row">
        {!isEditing && (
          <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-xl border border-workshop-border bg-workshop-panelmuted lg:h-40 lg:w-40">
            <div
              className="h-24 w-24 rounded-xl border border-slate-600 shadow-lg"
              style={{ backgroundColor: paint.colorHex ?? "#334155" }}
            />
          </div>
        )}

        <div className="flex-1">
          {isEditing && editForm ? (
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
              <div>
                <FieldLabel>Manufacturer</FieldLabel>
                <Select
                  value={editForm.manufacturerId}
                  onChange={(e) => setEditForm({ ...editForm, manufacturerId: e.target.value })}
                >
                  {manufacturers?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Product code</FieldLabel>
                  <Input
                    value={editForm.productCode}
                    onChange={(e) => setEditForm({ ...editForm, productCode: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <FieldLabel>Type</FieldLabel>
                  <Select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  >
                    {PAINT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel>Finish</FieldLabel>
                  <Input
                    value={editForm.finish}
                    onChange={(e) => setEditForm({ ...editForm, finish: e.target.value })}
                    placeholder="Matt, Gloss…"
                  />
                </div>
                <div>
                  <FieldLabel>Size (ml)</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    value={editForm.sizeMl}
                    onChange={(e) => setEditForm({ ...editForm, sizeMl: e.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel>Color family</FieldLabel>
                  <Input
                    value={editForm.colorFamily}
                    onChange={(e) => setEditForm({ ...editForm, colorFamily: e.target.value })}
                    placeholder="Red, Grey…"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Color</FieldLabel>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      /^#[0-9A-Fa-f]{6}$/.test(editForm.colorHex) ? editForm.colorHex : "#334155"
                    }
                    onChange={(e) => setEditForm({ ...editForm, colorHex: e.target.value })}
                    className="h-9 w-12 flex-shrink-0 cursor-pointer rounded border border-workshop-border bg-transparent"
                  />
                  <Input
                    value={editForm.colorHex}
                    onChange={(e) => setEditForm({ ...editForm, colorHex: e.target.value })}
                    placeholder="#RRGGBB"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Notes</FieldLabel>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updatePaint.isPending} className="flex-1">
                  {updatePaint.isPending ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h1 className="mb-2 text-2xl font-bold text-slate-100">{paint.name}</h1>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{paint.type}</Badge>
                    {paint.finish && <Badge variant="secondary">{paint.finish}</Badge>}
                    {paint.colorFamily && <Badge variant="secondary">{paint.colorFamily}</Badge>}
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {deleteError && (
                <div className="mb-4 rounded-lg border border-amber-900 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
                  {deleteError}
                </div>
              )}

              <div className="mb-4 space-y-2 text-sm">
                <p>
                  <span className="font-medium text-slate-300">Manufacturer:</span>{" "}
                  <span className="text-slate-400">{paint.manufacturer?.name ?? "Unknown"}</span>
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
                          onChange={(e) =>
                            setFormData({ ...formData, quantity: parseInt(e.target.value) })
                          }
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
                          onChange={(e) =>
                            setFormData({ ...formData, storageLocation: e.target.value })
                          }
                          placeholder="Storage location"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.purchasePrice}
                          onChange={(e) =>
                            setFormData({ ...formData, purchasePrice: e.target.value })
                          }
                          placeholder="Price paid (optional)"
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
                          <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setShowAddForm(false)}
                          >
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
            </>
          )}
        </div>
      </Card>

      {isInInventory && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-300">Your inventory</h2>
          <ul className="space-y-2">
            {paint.inventory.map((inv) => (
              <li
                key={inv.id}
                className="group flex items-center justify-between rounded-lg border border-workshop-border p-2 text-sm"
              >
                <div>
                  <div className="font-medium text-slate-100">
                    {inv.quantity} bottle{inv.quantity !== 1 ? "s" : ""} - {inv.fillLevel}
                  </div>
                  {inv.storageLocation && (
                    <div className="text-xs text-slate-500">Location: {inv.storageLocation}</div>
                  )}
                  {inv.purchasePrice != null && (
                    <div className="text-xs text-slate-500">
                      Paid: {formatCurrency(inv.purchasePrice)}
                    </div>
                  )}
                  {inv.notes && <div className="text-xs text-slate-500">Notes: {inv.notes}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    removeFromInventory.mutate(
                      { id: inv.id, paintId: paint.id },
                      {
                        onSuccess: () => {
                          toast(`Removed "${paint.name}" from inventory`, {
                            action: {
                              label: "Undo",
                              onClick: () =>
                                addToInventory({
                                  paintId: paint.id,
                                  quantity: inv.quantity,
                                  fillLevel: inv.fillLevel as
                                    | "Full"
                                    | "Mostly Full"
                                    | "Half"
                                    | "Low"
                                    | "Empty",
                                  storageLocation: inv.storageLocation ?? undefined,
                                  purchasePrice: inv.purchasePrice ?? undefined,
                                  notes: inv.notes ?? undefined,
                                }),
                            },
                          });
                        },
                      },
                    );
                  }}
                  className="text-xs text-slate-600 opacity-0 hover:text-red-400 group-hover:opacity-100"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
