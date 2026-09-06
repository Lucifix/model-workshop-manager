import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  useModelDetail,
  useAddModelToInventory,
  useRemoveModelFromInventory,
  useUploadModelImage,
  useUploadModelInstructions,
  useAddModelPaint,
  useRemoveModelPaint,
  useUpdateModel,
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
  ProgressBar,
  FieldLabel,
  ModelThumbnail,
} from "../components/ui";
import { PaintPicker, type PickedPaint } from "../components/PaintPicker";
import { TagInput } from "../components/TagInput";
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
  const [showAddPaint, setShowAddPaint] = useState(false);
  const [selectedPaint, setSelectedPaint] = useState<PickedPaint | null>(null);
  const [paintUsage, setPaintUsage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    manufacturerId: string;
    name: string;
    scale: string;
    category: string;
    difficulty: string;
    partCount: string;
    description: string;
    sourceUrl: string;
    instructionUrl: string;
    tagNames: string[];
  } | null>(null);

  const { data: model, isLoading, isError } = useModelDetail(Number(id));
  const { data: manufacturers } = useManufacturers();
  const { mutate: addToInventory, isPending } = useAddModelToInventory();
  const removeFromInventory = useRemoveModelFromInventory();
  const uploadImage = useUploadModelImage();
  const uploadInstructions = useUploadModelInstructions();
  const addModelPaint = useAddModelPaint();
  const removeModelPaint = useRemoveModelPaint();
  const updateModel = useUpdateModel();

  if (!id || isNaN(Number(id))) {
    return <ErrorState message="Invalid model ID." />;
  }

  if (isLoading) {
    return <LoadingState />;
  }
  if (isError || !model) {
    return <ErrorState message="Could not load model." />;
  }

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
      },
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    uploadImage.mutate({ modelId: model.id, file });
    e.target.value = "";
  };

  const handleInstructionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    uploadInstructions.mutate({ modelId: model.id, file });
    e.target.value = "";
  };

  const handleAddPaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaint) {
      return;
    }
    addModelPaint.mutate(
      { modelId: model.id, data: { paintId: selectedPaint.id, usage: paintUsage || undefined } },
      {
        onSuccess: () => {
          setSelectedPaint(null);
          setPaintUsage("");
          setShowAddPaint(false);
        },
      },
    );
  };

  const handleStartEdit = () => {
    setEditForm({
      manufacturerId: String(model.manufacturerId),
      name: model.name,
      scale: model.scale ?? "",
      category: model.category ?? "",
      difficulty: model.difficulty ?? "",
      partCount: model.partCount ? String(model.partCount) : "",
      description: model.description ?? "",
      sourceUrl: model.sourceUrl ?? "",
      instructionUrl: model.instructionUrl ?? "",
      tagNames: model.tags?.map((t) => t.name) ?? [],
    });
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) {
      return;
    }
    updateModel.mutate(
      {
        id: model.id,
        data: {
          manufacturerId: Number(editForm.manufacturerId),
          kitNumber: model.kitNumber,
          name: editForm.name.trim(),
          scale: editForm.scale || undefined,
          category: editForm.category || undefined,
          difficulty: editForm.difficulty || undefined,
          partCount: editForm.partCount ? Number(editForm.partCount) : undefined,
          description: editForm.description || undefined,
          sourceUrl: editForm.sourceUrl || undefined,
          instructionUrl: editForm.instructionUrl || undefined,
          tagNames: editForm.tagNames,
        },
      },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const isInInventory = model.ownership && model.ownership.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/models")}
        className="self-start -ml-2.5"
      >
        ← Back to models
      </Button>

      <Card className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="flex shrink-0 flex-col gap-2 lg:w-64">
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
          {isEditing && editForm ? (
            <form onSubmit={handleSaveEdit} className="mb-4 flex flex-col gap-3">
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
              <div>
                <FieldLabel>Name</FieldLabel>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <FieldLabel>Scale</FieldLabel>
                  <Input
                    value={editForm.scale}
                    onChange={(e) => setEditForm({ ...editForm, scale: e.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <Input
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel>Difficulty</FieldLabel>
                  <Input
                    value={editForm.difficulty}
                    onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Part count</FieldLabel>
                <Input
                  type="number"
                  min="1"
                  value={editForm.partCount}
                  onChange={(e) => setEditForm({ ...editForm, partCount: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Tags</FieldLabel>
                <TagInput
                  value={editForm.tagNames}
                  onChange={(tagNames) => setEditForm({ ...editForm, tagNames })}
                />
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <FieldLabel>Official page</FieldLabel>
                <Input
                  value={editForm.sourceUrl}
                  onChange={(e) => setEditForm({ ...editForm, sourceUrl: e.target.value })}
                />
              </div>
              <div>
                <FieldLabel>Instructions PDF link</FieldLabel>
                <Input
                  value={editForm.instructionUrl}
                  onChange={(e) => setEditForm({ ...editForm, instructionUrl: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updateModel.isPending} className="flex-1">
                  {updateModel.isPending ? "Saving…" : "Save changes"}
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
                  <h1 className="mb-2 text-2xl font-bold text-slate-100">{model.name}</h1>
                  <div className="flex flex-wrap gap-2">
                    {model.scale && <Badge variant="secondary">{model.scale}</Badge>}
                    {model.category && <Badge variant="secondary">{model.category}</Badge>}
                    {model.difficulty && <Badge variant="secondary">{model.difficulty}</Badge>}
                    {model.tags?.map((t) => (
                      <Badge key={t.id}>{t.name}</Badge>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleStartEdit} className="shrink-0">
                  Edit
                </Button>
              </div>

              <div className="mb-4 space-y-2 text-sm">
                <p>
                  <span className="font-medium text-slate-300">Manufacturer:</span>{" "}
                  <span className="text-slate-400">{model.manufacturer?.name ?? "Unknown"}</span>
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
                {model.sourceUrl && (
                  <p>
                    <span className="font-medium text-slate-300">Official page:</span>{" "}
                    <a
                      href={model.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-workshop-accent hover:underline"
                    >
                      {model.sourceUrl}
                    </a>
                  </p>
                )}
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-300">Instructions:</span>
                  {model.instructionUrl ? (
                    <a
                      href={model.instructionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-workshop-accent hover:underline"
                    >
                      View manual
                    </a>
                  ) : (
                    <span className="text-slate-500">None attached</span>
                  )}
                  <label className="cursor-pointer text-xs text-slate-400 underline hover:text-slate-200">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleInstructionsChange}
                      className="hidden"
                    />
                    {uploadInstructions.isPending
                      ? "Uploading…"
                      : model.instructionUrl
                        ? "replace"
                        : "attach a PDF"}
                  </label>
                </p>
              </div>
            </>
          )}

          <div className="flex gap-3">
            {!showAddForm && (
              <>
                {!isInInventory ? (
                  <Button onClick={() => setShowAddForm(true)}>Add to my models</Button>
                ) : (
                  <div className="flex items-center text-sm font-medium text-emerald-400">
                    ✓ In your inventory
                  </div>
                )}
                <Button
                  variant="outlineAccent"
                  onClick={() => navigate(`/projects/new?modelId=${model.id}`)}
                >
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
          </div>
        </div>
      </Card>

      {isInInventory && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-300">Your collection</h2>
          <ul className="space-y-2">
            {model.ownership.map((entry) => (
              <li
                key={entry.id}
                className="group flex items-center justify-between rounded-lg border border-workshop-border p-2 text-sm"
              >
                <div>
                  <div className="font-medium text-slate-100">
                    {entry.quantity} cop{entry.quantity !== 1 ? "ies" : "y"}
                    {entry.condition ? ` - ${entry.condition}` : ""}
                  </div>
                  {entry.storageLocation && (
                    <div className="text-xs text-slate-500">Location: {entry.storageLocation}</div>
                  )}
                  {entry.notes && (
                    <div className="text-xs text-slate-500">Notes: {entry.notes}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    removeFromInventory.mutate(
                      { id: entry.id, modelId: model.id },
                      {
                        onSuccess: () => {
                          toast(`Removed "${model.name}" from your collection`, {
                            action: {
                              label: "Undo",
                              onClick: () =>
                                addToInventory({
                                  modelId: model.id,
                                  quantity: entry.quantity,
                                  condition: entry.condition ?? undefined,
                                  storageLocation: entry.storageLocation ?? undefined,
                                  notes: entry.notes ?? undefined,
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

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300">Paint Requirements</h2>
          {!showAddPaint && (
            <Button size="sm" variant="secondary" onClick={() => setShowAddPaint(true)}>
              + Add paint
            </Button>
          )}
        </div>

        {showAddPaint && (
          <form
            onSubmit={handleAddPaint}
            className="mb-4 flex flex-col gap-2 rounded-lg border border-workshop-border p-3"
          >
            {!selectedPaint ? (
              <PaintPicker onSelect={setSelectedPaint} />
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="h-4 w-4 rounded-full border border-workshop-border"
                  style={{ backgroundColor: selectedPaint.colorHex ?? "#334155" }}
                />
                <span className="flex-1 truncate text-slate-200">{selectedPaint.name}</span>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-300"
                  onClick={() => setSelectedPaint(null)}
                >
                  change
                </button>
              </div>
            )}
            <Input
              value={paintUsage}
              onChange={(e) => setPaintUsage(e.target.value)}
              placeholder="Usage (optional) — e.g. Hull, Deck, Weathering"
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={!selectedPaint || addModelPaint.isPending}
                className="flex-1"
              >
                {addModelPaint.isPending ? "Adding…" : "Add requirement"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setShowAddPaint(false);
                  setSelectedPaint(null);
                  setPaintUsage("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {model.requiredPaints && model.requiredPaints.length > 0 ? (
          <>
            <div className="mb-4 text-xs text-slate-400">
              {model.availability.ownedCount} / {model.availability.totalRequired} owned (
              {model.availability.coveragePercent}%)
            </div>
            <ul className="space-y-2">
              {model.requiredPaints.map((paint) => (
                <li
                  key={paint.id}
                  className="group flex items-center gap-3 rounded-lg border border-workshop-border p-2 text-sm"
                >
                  {paint.owned && <span className="text-emerald-400">✓</span>}
                  {!paint.owned && <span className="text-slate-600">○</span>}
                  <span
                    className="h-5 w-5 rounded-full border border-slate-600 shrink-0"
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
                  <button
                    type="button"
                    onClick={() =>
                      removeModelPaint.mutate(
                        { modelId: model.id, paintId: paint.id },
                        {
                          onSuccess: () => {
                            toast(`Removed "${paint.name}" from requirements`, {
                              action: {
                                label: "Undo",
                                onClick: () =>
                                  addModelPaint.mutate({
                                    modelId: model.id,
                                    data: {
                                      paintId: paint.id,
                                      usage: paint.usage ?? undefined,
                                      confidence: paint.confidence ?? undefined,
                                    },
                                  }),
                              },
                            });
                          },
                        },
                      )
                    }
                    className="text-xs text-slate-600 opacity-0 hover:text-red-400 group-hover:opacity-100"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          !showAddPaint && (
            <div className="text-xs text-slate-500">No paint requirements recorded.</div>
          )
        )}
      </Card>

      {model.projects && model.projects.length > 0 && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-300">Build History</h2>
          <ul className="space-y-2">
            {model.projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg border border-workshop-border p-2 text-left text-sm transition-colors hover:border-workshop-accent hover:bg-slate-800/60"
                >
                  <ModelThumbnail imageUrl={project.coverPhotoUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-slate-100">{project.name}</div>
                    <div className="text-xs text-slate-500">{project.status}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-medium text-slate-300">
                      {project.progressPercent}%
                    </div>
                    <ProgressBar percent={project.progressPercent} className="mt-1 w-16" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
