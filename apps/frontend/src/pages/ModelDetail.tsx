import { useParams, useNavigate } from "react-router-dom";
import { useModelDetail, useAddModelToInventory, useUploadModelImage } from "../api/client";
import { Card, LoadingState, ErrorState, Badge, Button, Input, Select, Textarea, ProgressBar } from "../components/ui";
import { useState } from "react";

export default function ModelDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    quantity: 1,
    condition: "",
    storageLocation: "",
    notes: "",
  });

  const { data: model, isLoading, isError } = useModelDetail(Number(id));
  const { mutate: addToInventory, isPending } = useAddModelToInventory();
  const uploadImage = useUploadModelImage();

  if (!id || isNaN(Number(id))) {
    return <ErrorState message="Invalid model ID." />;
  }

  if (isLoading) return <LoadingState />;
  if (isError || !model) return <ErrorState message="Could not load model." />;

  const handleAddToInventory = (e: React.FormEvent) => {
    e.preventDefault();
    addToInventory(
      {
        modelId: model.id,
        quantity: formData.quantity || 1,
        condition: formData.condition || undefined,
        storageLocation: formData.storageLocation || undefined,
        notes: formData.notes || undefined,
      },
      {
        onSuccess: () => {
          setShowAddForm(false);
          setFormData({ quantity: 1, condition: "", storageLocation: "", notes: "" });
        },
      }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage.mutate({ modelId: model.id, file });
    e.target.value = "";
  };

  const isInInventory = model.ownership && model.ownership.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/models")} className="self-start -ml-2.5">
        ← Back to models
      </Button>

      <Card className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex flex-shrink-0 flex-col gap-2 lg:w-64">
          {model.imageUrl ? (
            <img
              src={model.imageUrl}
              alt={model.name}
              className="h-48 w-full rounded-xl object-cover lg:h-64"
            />
          ) : (
            <div className="flex h-48 w-full items-center justify-center rounded-xl border border-dashed border-workshop-border text-xs text-slate-500 lg:h-64">
              No image yet
            </div>
          )}
          <label className="cursor-pointer">
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            <span className="block w-full rounded-lg border border-workshop-border px-3 py-2 text-center text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800/60">
              {uploadImage.isPending ? "Uploading…" : "Upload a photo of the box"}
            </span>
          </label>
        </div>
        <div className="flex-1">
          <div className="mb-4">
            <h1 className="mb-2 text-2xl font-bold text-slate-100">{model.name}</h1>
            <div className="flex flex-wrap gap-2">
              {model.scale && <Badge variant="secondary">{model.scale}</Badge>}
              {model.category && <Badge variant="secondary">{model.category}</Badge>}
              {model.difficulty && <Badge variant="secondary">{model.difficulty}</Badge>}
            </div>
          </div>

          <div className="mb-4 space-y-2 text-sm">
            <p>
              <span className="font-medium text-slate-300">Manufacturer:</span>{" "}
              <span className="text-slate-400">Manufacturer ID {model.manufacturerId}</span>
            </p>
            <p>
              <span className="font-medium text-slate-300">Kit Number:</span>{" "}
              <span className="text-slate-400">{model.kitNumber}</span>
            </p>
            {model.partCount && (
              <p>
                <span className="font-medium text-slate-300">Part Count:</span>{" "}
                <span className="text-slate-400">{model.partCount}</span>
              </p>
            )}
            {model.description && (
              <p>
                <span className="font-medium text-slate-300">Description:</span>{" "}
                <span className="text-slate-400">{model.description}</span>
              </p>
            )}
          </div>

          <div className="flex gap-3">
            {!showAddForm && (
              <>
                {!isInInventory ? (
                  <Button onClick={() => setShowAddForm(true)}>Add to my models</Button>
                ) : (
                  <div className="flex items-center text-sm font-medium text-emerald-400">✓ In your inventory</div>
                )}
                <Button variant="outlineAccent" onClick={() => navigate(`/projects/new?modelId=${model.id}`)}>
                  Create build
                </Button>
              </>
            )}

            {showAddForm && (
              <form onSubmit={handleAddToInventory} className="w-full flex flex-col gap-3">
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  placeholder="Quantity"
                />
                <Select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                >
                  <option value="">Condition (optional)</option>
                  <option value="unbuilt">Unbuilt</option>
                  <option value="built">Built</option>
                  <option value="damaged">Damaged</option>
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
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-slate-300">Paint Requirements</h2>
        {model.requiredPaints && model.requiredPaints.length > 0 ? (
          <>
            <div className="mb-4 text-xs text-slate-400">
              {model.availability.ownedCount} / {model.availability.totalRequired} owned ({model.availability.coveragePercent}%)
            </div>
            <ul className="space-y-2">
              {model.requiredPaints.map((paint) => (
                <li
                  key={paint.id}
                  className="flex items-center gap-3 rounded-lg border border-workshop-border p-2 text-sm"
                >
                  {paint.owned && <span className="text-emerald-400">✓</span>}
                  {!paint.owned && <span className="text-slate-600">○</span>}
                  <span
                    className="h-5 w-5 rounded-full border border-slate-600 flex-shrink-0"
                    style={{ backgroundColor: paint.colorHex ?? "#334155" }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-100">{paint.name}</div>
                    <div className="text-xs text-slate-500">
                      {paint.productCode} · {paint.type}
                      {paint.finish ? ` · ${paint.finish}` : ""}
                      {paint.usage ? ` · Usage: ${paint.usage}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="text-xs text-slate-500">No paint requirements recorded.</div>
        )}
      </Card>

      {model.projects && model.projects.length > 0 && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-300">Build History</h2>
          <ul className="space-y-2">
            {model.projects.map((project) => (
              <li key={project.id} className="flex items-center justify-between rounded-lg border border-workshop-border p-2 text-sm">
                <div>
                  <div className="font-medium text-slate-100">{project.name}</div>
                  <div className="text-xs text-slate-500">{project.status}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-300">{project.progressPercent}%</div>
                  <ProgressBar percent={project.progressPercent} className="mt-1 w-16" />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
