import { useState } from "react";
import {
  useManufacturers,
  useCreateManufacturer,
  useCreateModel,
  useCatalogSearch,
  type CatalogSearchResult,
} from "../api/client";
import { Button, Input, Select, Textarea, FieldLabel, Card } from "./ui";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface CreatedModel {
  id: number;
  name: string;
  kitNumber: string;
}

export function AddModelForm({
  onCreated,
  onCancel,
}: {
  onCreated: (model: CreatedModel) => void;
  onCancel?: () => void;
}) {
  const { data: manufacturers } = useManufacturers();
  const createManufacturer = useCreateManufacturer();
  const createModel = useCreateModel();
  const catalogSearch = useCatalogSearch();

  const [manufacturerId, setManufacturerId] = useState("");
  const [newManufacturerName, setNewManufacturerName] = useState("");
  const [kitNumber, setKitNumber] = useState("");
  const [name, setName] = useState("");
  const [scale, setScale] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [partCount, setPartCount] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageBroken, setImageBroken] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [instructionUrl, setInstructionUrl] = useState("");
  const [barcodeQuery, setBarcodeQuery] = useState("");
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateHint, setDuplicateHint] = useState<CreatedModel | null>(null);

  const isCreatingNewManufacturer = manufacturerId === "__new__";
  const isSubmitting = createManufacturer.isPending || createModel.isPending;

  const handleLookup = async () => {
    if (!barcodeQuery.trim()) return;
    setLookupMessage(null);
    try {
      const results = await catalogSearch.mutateAsync(barcodeQuery.trim());
      const hit = results[0] as CatalogSearchResult | undefined;
      if (!hit) {
        setLookupMessage(
          "No match — this lookup is sourced from US retail listings, so European/import kits are often missing. Paste an image URL below, or upload your own photo after saving."
        );
        return;
      }
      if (hit.name) setName(hit.name);
      if (hit.imageUrl) {
        setImageUrl(hit.imageUrl);
        setLookupMessage(`Found: ${hit.name}. Review the fields below before saving.`);
      } else {
        setLookupMessage(
          `Found: ${hit.name} — but no image for it. Paste one below, or upload your own photo after saving.`
        );
      }
    } catch {
      setLookupMessage("Lookup unavailable right now.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDuplicateHint(null);

    if (!kitNumber.trim() || !name.trim()) {
      setError("Kit number and name are required.");
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

      // Duplicate check (mirrors the CSV importer's manufacturer+kitNumber check).
      const existingRes = await fetch(`/api/models?q=${encodeURIComponent(kitNumber.trim())}`);
      if (existingRes.ok) {
        const existingRows: Array<{ model: CreatedModel & { manufacturerId: number } }> =
          await existingRes.json();
        const dupe = existingRows.find(
          (r) =>
            r.model.manufacturerId === mfrId &&
            r.model.kitNumber.toLowerCase() === kitNumber.trim().toLowerCase()
        );
        if (dupe) {
          setDuplicateHint(dupe.model);
          return;
        }
      }

      const created = await createModel.mutateAsync({
        manufacturerId: mfrId,
        kitNumber: kitNumber.trim(),
        name: name.trim(),
        scale: scale || undefined,
        category: category || undefined,
        difficulty: difficulty || undefined,
        partCount: partCount ? Number(partCount) : undefined,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        sourceUrl: sourceUrl || undefined,
        instructionUrl: instructionUrl || undefined,
      });
      onCreated(created);
    } catch {
      setError("Could not save this model. Check the fields and try again.");
    }
  };

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-slate-300">Add a new model</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <FieldLabel>Look up by barcode (optional)</FieldLabel>
          <div className="flex gap-2">
            <Input
              value={barcodeQuery}
              onChange={(e) => setBarcodeQuery(e.target.value)}
              placeholder="UPC / EAN on the box"
              className="flex-1"
            />
            <Button type="button" variant="secondary" onClick={handleLookup} disabled={catalogSearch.isPending}>
              {catalogSearch.isPending ? "Looking up…" : "Look up"}
            </Button>
          </div>
          {lookupMessage && <p className="mt-1.5 text-xs text-slate-400">{lookupMessage}</p>}
        </div>

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
            <FieldLabel>Kit number</FieldLabel>
            <Input value={kitNumber} onChange={(e) => setKitNumber(e.target.value)} placeholder="05239" required />
          </div>
          <div>
            <FieldLabel>Name</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Smit Houston" required />
          </div>
          <div>
            <FieldLabel>Scale</FieldLabel>
            <Input value={scale} onChange={(e) => setScale(e.target.value)} placeholder="1:200" />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ship" />
          </div>
          <div>
            <FieldLabel>Difficulty</FieldLabel>
            <Input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="Intermediate" />
          </div>
          <div>
            <FieldLabel>Part count</FieldLabel>
            <Input
              type="number"
              min="1"
              value={partCount}
              onChange={(e) => setPartCount(e.target.value)}
              placeholder="200"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        <div>
          <FieldLabel>Image URL (optional)</FieldLabel>
          <Input
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setImageBroken(false);
            }}
            placeholder="Paste the product image URL from the manufacturer's own page"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Copy the image address from the kit's official product page — the app won't fetch it
            for you (see docs/DATA_SOURCES.md). You can also upload your own photo after saving.
          </p>
          {imageUrl && !imageBroken && (
            <img
              src={imageUrl}
              alt="Preview"
              onError={() => setImageBroken(true)}
              className="mt-2 h-24 w-24 rounded-lg border border-workshop-border object-cover"
            />
          )}
          {imageBroken && <p className="mt-1.5 text-xs text-amber-400">Couldn't load that image URL.</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Official page (optional)</FieldLabel>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="Link to the manufacturer's product page"
            />
          </div>
          <div>
            <FieldLabel>Instructions PDF link (optional)</FieldLabel>
            <Input
              value={instructionUrl}
              onChange={(e) => setInstructionUrl(e.target.value)}
              placeholder="Link to the manual, if you have one"
            />
            <p className="mt-1.5 text-xs text-slate-500">You can also attach a PDF file after saving.</p>
          </div>
        </div>

        {duplicateHint && (
          <div className="rounded-lg border border-amber-900 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
            "{duplicateHint.name}" ({duplicateHint.kitNumber}) is already in your catalog.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => onCreated(duplicateHint)}
            >
              Use it instead
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Saving…" : "Save model"}
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
