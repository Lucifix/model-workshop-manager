import { useState } from "react";
import { useManufacturers, useCreateManufacturer, useCreatePaint } from "../api/client";
import { Button, Input, Select, Textarea, FieldLabel, Card } from "./ui";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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

interface CreatedPaint {
  id: number;
  name: string;
  productCode: string;
}

export function AddPaintForm({
  onCreated,
  onCancel,
}: {
  onCreated: (paint: CreatedPaint) => void;
  onCancel?: () => void;
}) {
  const { data: manufacturers } = useManufacturers();
  const createManufacturer = useCreateManufacturer();
  const createPaint = useCreatePaint();

  const [manufacturerId, setManufacturerId] = useState("");
  const [newManufacturerName, setNewManufacturerName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<string>(PAINT_TYPES[0]!);
  const [finish, setFinish] = useState("");
  const [sizeMl, setSizeMl] = useState("");
  const [colorHex, setColorHex] = useState("");
  const [colorFamily, setColorFamily] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isCreatingNewManufacturer = manufacturerId === "__new__";
  const isSubmitting = createManufacturer.isPending || createPaint.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!productCode.trim() || !name.trim()) {
      setError("Product code and name are required.");
      return;
    }

    try {
      let mfrId: number;
      if (isCreatingNewManufacturer) {
        if (!newManufacturerName.trim()) {
          setError("Enter a name for the new manufacturer.");
          return;
        }
        const mfr = await createManufacturer.mutateAsync({
          name: newManufacturerName.trim(),
          slug: slugify(newManufacturerName),
        });
        mfrId = mfr.id;
      } else {
        if (!manufacturerId) {
          setError("Choose a manufacturer, or add a new one.");
          return;
        }
        mfrId = Number(manufacturerId);
      }

      const created = await createPaint.mutateAsync({
        manufacturerId: mfrId,
        productCode: productCode.trim(),
        name: name.trim(),
        type,
        finish: finish || undefined,
        sizeMl: sizeMl ? Number(sizeMl) : undefined,
        colorHex: colorHex || undefined,
        colorFamily: colorFamily || undefined,
        notes: notes || undefined,
      });
      onCreated(created);
    } catch {
      setError("Could not save this paint. Check the fields and try again.");
    }
  };

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-slate-300">Add a new paint</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <FieldLabel>Manufacturer</FieldLabel>
          <Select value={manufacturerId} onChange={(e) => setManufacturerId(e.target.value)}>
            <option value="">Select manufacturer…</option>
            {manufacturers?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value="__new__">+ New manufacturer…</option>
          </Select>
          {isCreatingNewManufacturer && (
            <Input
              value={newManufacturerName}
              onChange={(e) => setNewManufacturerName(e.target.value)}
              placeholder="Manufacturer name"
              className="mt-2"
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Product code</FieldLabel>
            <Input
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="XF-1"
              required
            />
          </div>
          <div>
            <FieldLabel>Name</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Flat Black"
              required
            />
          </div>
          <div>
            <FieldLabel>Type</FieldLabel>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
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
              value={finish}
              onChange={(e) => setFinish(e.target.value)}
              placeholder="Matt, Gloss…"
            />
          </div>
          <div>
            <FieldLabel>Size (ml)</FieldLabel>
            <Input
              type="number"
              min="0"
              value={sizeMl}
              onChange={(e) => setSizeMl(e.target.value)}
              placeholder="10"
            />
          </div>
          <div>
            <FieldLabel>Color family</FieldLabel>
            <Input
              value={colorFamily}
              onChange={(e) => setColorFamily(e.target.value)}
              placeholder="Black, Red…"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Color</FieldLabel>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9A-Fa-f]{6}$/.test(colorHex) ? colorHex : "#334155"}
              onChange={(e) => setColorHex(e.target.value)}
              className="h-9 w-12 flex-shrink-0 cursor-pointer rounded border border-workshop-border bg-transparent"
            />
            <Input
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              placeholder="#RRGGBB"
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Notes</FieldLabel>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Saving…" : "Save paint"}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
