import { useState } from "react";
import { toast } from "sonner";
import {
  useSupplies,
  useCreateSupply,
  useUpdateSupply,
  useDeleteSupply,
  type Supply,
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
  ListCard,
  ListCardRow,
  ListCardBody,
  ListCardTitle,
  ListCardMeta,
  ListCardActions,
} from "../components/ui";

const SUPPLY_CATEGORIES = [
  "brush",
  "knife",
  "cement",
  "tape",
  "airbrush",
  "putty",
  "sandpaper",
  "other",
] as const;

const LOW_STOCK_THRESHOLD = 1;

export default function Supplies() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const { data, isLoading, isError } = useSupplies(search, category || undefined);
  const createSupply = useCreateSupply();
  const updateSupply = useUpdateSupply();
  const deleteSupply = useDeleteSupply();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: 1,
    storageLocation: "",
    purchasePrice: "",
  });

  const resetForm = () =>
    setFormData({ name: "", category: "", quantity: 1, storageLocation: "", purchasePrice: "" });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createSupply.mutate(
      {
        name: formData.name,
        category: formData.category || undefined,
        quantity: formData.quantity || 1,
        storageLocation: formData.storageLocation || undefined,
        purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : undefined,
      },
      {
        onSuccess: () => {
          resetForm();
          setShowForm(false);
        },
      },
    );
  };

  const adjustQuantity = (supply: Supply, delta: number) => {
    const quantity = Math.max(0, supply.quantity + delta);
    updateSupply.mutate({ id: supply.id, data: { quantity } });
  };

  const handleDelete = (supply: Supply) => {
    deleteSupply.mutate(supply.id, {
      onSuccess: () => {
        toast(`Removed "${supply.name}"`, {
          action: {
            label: "Undo",
            onClick: () =>
              createSupply.mutate({
                name: supply.name,
                category: supply.category ?? undefined,
                quantity: supply.quantity,
                storageLocation: supply.storageLocation ?? undefined,
                purchasePrice: supply.purchasePrice ?? undefined,
              }),
          },
        });
      },
    });
  };

  if (isLoading) {
    return <LoadingState />;
  }
  if (isError) {
    return <ErrorState message="Could not load supplies." />;
  }

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Supplies"
        description="Brushes, cement, tape, and other consumables — separate from your paint stash."
        actions={!showForm && <Button onClick={() => setShowForm(true)}>+ Add supply</Button>}
      />

      {showForm && (
        <Card>
          <form onSubmit={handleAdd} className="flex flex-col gap-3">
            <div>
              <FieldLabel>Name</FieldLabel>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Tamiya Extra Thin Cement"
                required
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <FieldLabel>Category</FieldLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">—</option>
                  {SUPPLY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c[0]!.toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex-1">
                <FieldLabel>Quantity</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <FieldLabel>Storage location</FieldLabel>
                <Input
                  type="text"
                  value={formData.storageLocation}
                  onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                  placeholder="e.g. Drawer 2"
                />
              </div>
              <div className="flex-1">
                <FieldLabel>Price paid</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createSupply.isPending} className="flex-1">
                {createSupply.isPending ? "Adding..." : "Add"}
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

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search supplies…"
          className="flex-1"
        />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-48">
          <option value="">All categories</option>
          {SUPPLY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c[0]!.toUpperCase() + c.slice(1)}
            </option>
          ))}
        </Select>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="No supplies tracked yet. Click 'Add supply' to get started!" />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((supply) => {
            const lowStock = supply.quantity <= LOW_STOCK_THRESHOLD;
            return (
              <ListCard key={supply.id}>
                <ListCardRow>
                  <ListCardBody>
                    <ListCardTitle>{supply.name}</ListCardTitle>
                    <ListCardMeta>
                      {supply.category && <Badge variant="secondary">{supply.category}</Badge>}
                      {lowStock && <Badge tone="warn">Low stock</Badge>}
                      <span>{supply.storageLocation ?? "No storage location set"}</span>
                    </ListCardMeta>
                  </ListCardBody>
                </ListCardRow>
                <ListCardActions className="items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-workshop-border px-2 py-1">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-100"
                      onClick={() => adjustQuantity(supply, -1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm text-slate-100">
                      {supply.quantity}
                    </span>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-100"
                      onClick={() => adjustQuantity(supply, 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(supply)}
                    disabled={deleteSupply.isPending}
                  >
                    Remove
                  </Button>
                </ListCardActions>
              </ListCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
