import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json() as Promise<T>;
}

export interface DashboardData {
  totalModelKits: number;
  inProgressCount: number;
  completedCount: number;
  plannedCount: number;
  totalPaints: number;
  lowStockCount: number;
  recentActivity: { projectName?: string; title: string; createdAt: string }[];
  recentlyAddedModels: { id: number; name: string; kitNumber: string; imageUrl?: string }[];
  recentlyCompletedBuilds: { id: number; name: string; completedAt?: string }[];
}

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => apiFetch<DashboardData>("/dashboard") });
}

export interface ModelListRow {
  model: {
    id: number;
    name: string;
    kitNumber: string;
    scale?: string;
    category?: string;
    imageUrl?: string;
  };
  manufacturer: { id: number; name: string } | null;
}

export interface Manufacturer {
  id: number;
  name: string;
  slug: string;
  website?: string;
  logoUrl?: string;
}

export function useManufacturers() {
  return useQuery({
    queryKey: ["manufacturers"],
    queryFn: () => apiFetch<Manufacturer[]>("/manufacturers"),
  });
}

export function useCreateManufacturer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; slug: string; website?: string }) => {
      const res = await fetch("/api/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create manufacturer");
      return res.json() as Promise<Manufacturer>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manufacturers"] }),
  });
}

export function useModels(search?: string) {
  return useQuery({
    queryKey: ["models", search],
    queryFn: () => apiFetch<ModelListRow[]>(`/models${search ? `?q=${encodeURIComponent(search)}` : ""}`),
  });
}

export interface PaintListRow {
  paint: {
    id: number;
    name: string;
    productCode: string;
    type: string;
    finish?: string;
    colorHex?: string;
  };
  manufacturer: { id: number; name: string } | null;
}

/** requireFilter: when true, the query only runs once search or manufacturerId is set — the
 * paints catalog is large (10k+ rows across 34 manufacturers), so the page shouldn't
 * fetch/render everything on load. */
export function usePaints(search?: string, manufacturerId?: number, requireFilter = false) {
  return useQuery({
    queryKey: ["paints", search, manufacturerId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (manufacturerId) params.set("manufacturerId", String(manufacturerId));
      const qs = params.toString();
      return apiFetch<PaintListRow[]>(`/paints${qs ? `?${qs}` : ""}`);
    },
    enabled: !requireFilter || !!search?.trim() || !!manufacturerId,
  });
}

export interface ProjectListRow {
  project: {
    id: number;
    name: string;
    status: string;
    progressPercent: number;
    startedAt?: string;
  };
  model: { id: number; name: string; kitNumber: string; imageUrl?: string } | null;
}

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: () => apiFetch<ProjectListRow[]>("/projects") });
}

export interface ShoppingListRow {
  item: {
    id: number;
    description: string;
    quantity: number;
    priority: string;
    purchased: boolean;
  };
  paint: { id: number; name: string; colorHex?: string } | null;
}

export function useShoppingList() {
  return useQuery({
    queryKey: ["shopping-list"],
    queryFn: () => apiFetch<ShoppingListRow[]>("/shopping-list"),
  });
}

export function useMarkPurchased() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/shopping-list/${id}/purchased`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to update item");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopping-list"] }),
  });
}

// --- Model Details -------------------------------------------------------

export interface ModelDetailPaint {
  id: number;
  name: string;
  productCode: string;
  type: string;
  finish?: string;
  colorHex?: string;
  usage?: string;
  confidence?: string;
  owned: boolean;
}

export interface ModelDetail {
  id: number;
  manufacturerId: number;
  kitNumber: string;
  name: string;
  scale?: string;
  category?: string;
  difficulty?: string;
  partCount?: number;
  description?: string;
  imageUrl?: string;
  instructionUrl?: string;
  source: string;
  sourceUrl?: string;
  manufacturer: Manufacturer | null;
  requiredPaints: ModelDetailPaint[];
  availability: { totalRequired: number; ownedCount: number; missingCount: number; coveragePercent: number };
  ownership: { id: number; modelId: number; owned: boolean; quantity: number; condition?: string }[];
  projects: { id: number; modelId: number; name: string; status: string; progressPercent: number }[];
}

export function useModelDetail(id: number) {
  return useQuery({
    queryKey: ["model", id],
    queryFn: () => apiFetch<ModelDetail>(`/models/${id}`),
    enabled: Number.isFinite(id),
  });
}

export interface PaintDetail {
  id: number;
  manufacturerId: number;
  productCode: string;
  name: string;
  type: string;
  finish?: string;
  sizeMl?: number;
  colorHex?: string;
  colorFamily?: string;
  notes?: string;
  source: string;
  sourceUrl?: string;
  manufacturer: Manufacturer | null;
  inventory: { id: number; paintId: number; quantity: number; fillLevel: string; storageLocation?: string; notes?: string }[];
}

export function usePaintDetail(id: number) {
  return useQuery({
    queryKey: ["paint", id],
    queryFn: () => apiFetch<PaintDetail>(`/paints/${id}`),
  });
}

// --- Mutations -----------------------------------------------------------

export interface ModelCreateInput {
  manufacturerId: number;
  kitNumber: string;
  name: string;
  scale?: string;
  category?: string;
  difficulty?: string;
  partCount?: number;
  description?: string;
  imageUrl?: string;
  instructionUrl?: string;
  sourceUrl?: string;
}

export function useCreateModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ModelCreateInput) => {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create model");
      return res.json() as Promise<{ id: number; name: string; kitNumber: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ModelCreateInput> }) => {
      const res = await fetch(`/api/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update model");
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["model", id] });
      queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}

export function useUploadModelImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ modelId, file }: { modelId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/models/${modelId}/image`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload model image");
      return res.json();
    },
    onSuccess: (_, { modelId }) => {
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
      queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });
}

export function useUploadModelInstructions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ modelId, file }: { modelId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/models/${modelId}/instructions`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload instructions");
      return res.json();
    },
    onSuccess: (_, { modelId }) => {
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
    },
  });
}

export interface ModelPaint {
  modelId: number;
  paintId: number;
  usage?: string;
  instructionRef?: string;
  confidence?: string;
}

export function useAddModelPaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      modelId,
      data,
    }: {
      modelId: number;
      data: { paintId: number; usage?: string; confidence?: string };
    }) => {
      const res = await fetch(`/api/models/${modelId}/paints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add required paint");
      return res.json() as Promise<ModelPaint>;
    },
    onSuccess: (_, { modelId }) => {
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
    },
  });
}

export function useRemoveModelPaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ modelId, paintId }: { modelId: number; paintId: number }) => {
      const res = await fetch(`/api/models/${modelId}/paints/${paintId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove required paint");
    },
    onSuccess: (_, { modelId }) => {
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
    },
  });
}

export interface CatalogSearchResult {
  externalId: string;
  manufacturerName: string;
  kitNumber: string;
  name: string;
  scale?: string;
  imageUrl?: string;
  sourceUrl?: string;
}

/** Optional barcode-lookup convenience (docs/PLAN.md §35.5, method 3) — never the primary path. */
export function useCatalogSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const res = await fetch(`/api/catalog/search?provider=upcitemdb&q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Lookup failed");
      const data = (await res.json()) as { results: CatalogSearchResult[] };
      return data.results;
    },
  });
}

export function useAddModelToInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { modelId: number; quantity?: number; condition?: string; storageLocation?: string; notes?: string }) => {
      const res = await fetch("/api/inventory/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add model to inventory");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useAddPaintToInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { paintId: number; quantity?: number; fillLevel?: string; storageLocation?: string; notes?: string }) => {
      const res = await fetch("/api/inventory/paints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add paint to inventory");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// --- Projects -------------------------------------------------------

export interface ProjectDetail {
  id: number;
  modelId: number;
  name: string;
  status: string;
  progressPercent: number;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  model: { id: number; name: string; kitNumber: string; imageUrl?: string } | null;
  log: { id: number; projectId: number; title: string; description?: string; createdAt: string }[];
  photos: { id: number; projectId: number; filename: string; originalFilename?: string; caption?: string; takenAt?: string; createdAt: string }[];
  usedPaints: { projectPaint: { projectId: number; paintId: number; purpose: string; notes?: string }; paint: any }[];
}

export function useProjectDetail(id: number) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json() as Promise<ProjectDetail>;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { modelId: number; name: string; status?: string; notes?: string }) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create project");
      return res.json() as Promise<{ id: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { progressPercent?: number; status?: string; notes?: string } }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update project");
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useAddBuildLogEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: { title: string; description?: string } }) => {
      const res = await fetch(`/api/projects/${projectId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add build log entry");
      return res.json();
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useUploadProjectPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, file }: { projectId: number; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/photos`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload photo");
      return res.json();
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useDeleteProjectPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, photoId }: { projectId: number; photoId: number }) => {
      const res = await fetch(`/api/projects/${projectId}/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete photo");
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useAddProjectPaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      data,
    }: {
      projectId: number;
      data: { paintId: number; purpose?: "required" | "optional" | "weathering" | "already_substituted"; notes?: string };
    }) => {
      const res = await fetch(`/api/projects/${projectId}/paints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add paint to build");
      return res.json();
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

export function useRemoveProjectPaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, paintId }: { projectId: number; paintId: number }) => {
      const res = await fetch(`/api/projects/${projectId}/paints/${paintId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove paint from build");
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

// --- Shopping List -------------------------------------------------------

export function useAddShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { paintId?: number; description: string; quantity?: number; priority?: "low" | "normal" | "high" }) => {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add shopping list item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
    },
  });
}

// --- Import/Export -------------------------------------------------------

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export function useImportManufacturers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/manufacturers", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to import manufacturers");
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
    },
  });
}

export function useImportPaints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/paints", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to import paints");
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paints"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useImportModels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import/models", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to import models");
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: async (dataType: "paints" | "models" | "manufacturers" | "all") => {
      const res = await fetch(`/api/export/${dataType}`);
      if (!res.ok) throw new Error("Failed to export data");
      return res.json();
    },
  });
}
