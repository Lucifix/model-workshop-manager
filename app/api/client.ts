import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";

function toastError(err: unknown) {
  toast.error(err instanceof Error ? err.message : "Something went wrong");
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (res.status === 401 && path !== "/auth/me") {
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

// --- Auth ------------------------------------------------------------------

export interface AuthStatus {
  authenticated: boolean;
  username?: string;
}

export function useAuthStatus() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch<AuthStatus>("/auth/me"),
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Invalid username or password." : "Login failed.");
      }
      return res.json() as Promise<AuthStatus>;
    },
    onSuccess: (data) => queryClient.setQueryData(["auth", "me"], data),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["auth", "me"], { authenticated: false });
      queryClient.clear();
    },
  });
}

export interface DashboardData {
  totalModelKits: number;
  inProgressCount: number;
  completedCount: number;
  plannedCount: number;
  totalPaints: number;
  lowStockCount: number;
  totalSupplies: number;
  lowStockSuppliesCount: number;
  totalStashValue: number;
  recentActivity: { projectName?: string; title: string; createdAt: string }[];
  recentlyAddedModels: { id: number; name: string; kitNumber: string; imageUrl?: string }[];
  recentlyCompletedBuilds: { id: number; name: string; completedAt?: string }[];
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/dashboard"),
  });
}

export interface Tag {
  id: number;
  name: string;
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
  ownership: {
    id: number;
    modelId: number;
    quantity: number;
    condition?: string;
    storageLocation?: string;
  }[];
  tags: Tag[];
}

export function useTags() {
  return useQuery({ queryKey: ["tags"], queryFn: () => apiFetch<Tag[]>("/tags") });
}

export interface Manufacturer {
  id: number;
  name: string;
  slug: string;
  website?: string;
  logoUrl?: string;
  paintCount?: number;
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
      if (!res.ok) {
        throw new Error("Failed to create manufacturer");
      }
      return res.json() as Promise<Manufacturer>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      toast.success(`Added manufacturer "${data.name}"`);
    },
    onError: toastError,
  });
}

export function useModels(search?: string, tag?: string) {
  return useQuery({
    queryKey: ["models", search, tag],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) {
        params.set("q", search);
      }
      if (tag) {
        params.set("tag", tag);
      }
      const qs = params.toString();
      return apiFetch<ModelListRow[]>(`/models${qs ? `?${qs}` : ""}`);
    },
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
  inventory: {
    id: number;
    paintId: number;
    quantity: number;
    fillLevel: string;
    status: string;
    storageLocation?: string;
  }[];
}

interface PaintListPage {
  rows: PaintListRow[];
  hasMore: boolean;
}

export type PaintStatusFilter = "all" | "owned" | "not_owned";

const PAINTS_PAGE_SIZE = 60;

/** requireFilter: when true, the query only runs once search, manufacturerId, or status
 * is set — the paints catalog is large (10k+ rows across 34 manufacturers), so the page
 * shouldn't fetch/render everything on load. Results are paginated server-side
 * (PAINTS_PAGE_SIZE per page) and filtered/searched in SQL, not in the browser. */
export function usePaints(
  search?: string,
  manufacturerId?: number,
  requireFilter = false,
  status: PaintStatusFilter = "all",
) {
  return useInfiniteQuery({
    queryKey: ["paints", search, manufacturerId, status],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (search) {
        params.set("q", search);
      }
      if (manufacturerId) {
        params.set("manufacturerId", String(manufacturerId));
      }
      if (status !== "all") {
        params.set("status", status);
      }
      params.set("limit", String(PAINTS_PAGE_SIZE));
      params.set("offset", String(pageParam));
      return apiFetch<PaintListPage>(`/paints?${params.toString()}`);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * PAINTS_PAGE_SIZE : undefined,
    enabled: !requireFilter || !!search?.trim() || !!manufacturerId || status !== "all",
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
  coverPhotoUrl?: string;
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<ProjectListRow[]>("/projects"),
  });
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
      if (!res.ok) {
        throw new Error("Failed to update item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
      toast.success("Marked as purchased");
    },
    onError: toastError,
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
  tags: Tag[];
  requiredPaints: ModelDetailPaint[];
  availability: {
    totalRequired: number;
    ownedCount: number;
    missingCount: number;
    coveragePercent: number;
  };
  ownership: {
    id: number;
    modelId: number;
    owned: boolean;
    quantity: number;
    condition?: string;
    storageLocation?: string;
    notes?: string;
  }[];
  projects: {
    id: number;
    modelId: number;
    name: string;
    status: string;
    progressPercent: number;
    coverPhotoUrl?: string;
  }[];
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
  inventory: {
    id: number;
    paintId: number;
    quantity: number;
    fillLevel: string;
    storageLocation?: string;
    purchasePrice?: number;
    notes?: string;
  }[];
}

export function usePaintDetail(id: number) {
  return useQuery({
    queryKey: ["paint", id],
    queryFn: () => apiFetch<PaintDetail>(`/paints/${id}`),
  });
}

export interface PaintCreateInput {
  manufacturerId: number;
  productCode: string;
  name: string;
  type: string;
  finish?: string;
  sizeMl?: number;
  colorHex?: string;
  colorFamily?: string;
  notes?: string;
}

export function useCreatePaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: PaintCreateInput) => {
      const res = await fetch("/api/paints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to create paint");
      }
      return res.json() as Promise<{ id: number; name: string; productCode: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["paints"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Added "${data.name}" to catalog`);
    },
    onError: toastError,
  });
}

export interface PaintUpdateInput {
  manufacturerId?: number;
  productCode?: string;
  name?: string;
  type?: string;
  finish?: string;
  sizeMl?: number;
  colorHex?: string;
  colorFamily?: string;
  notes?: string;
}

export function useUpdatePaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PaintUpdateInput }) => {
      const res = await fetch(`/api/paints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to update paint");
      }
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["paint", id] });
      queryClient.invalidateQueries({ queryKey: ["paints"] });
      toast.success("Paint updated");
    },
    onError: toastError,
  });
}

export function useDeletePaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/paints/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Failed to delete paint");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paints"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Paint deleted from catalog");
    },
    // No toastError here — PaintDetail already shows delete failures inline.
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
  tagNames?: string[];
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
      if (!res.ok) {
        throw new Error("Failed to create model");
      }
      return res.json() as Promise<{ id: number; name: string; kitNumber: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success(`Added "${data.name}" to catalog`);
    },
    onError: toastError,
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
      if (!res.ok) {
        throw new Error("Failed to update model");
      }
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["model", id] });
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      toast.success("Model updated");
    },
    onError: toastError,
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
      if (!res.ok) {
        throw new Error("Failed to upload model image");
      }
      return res.json();
    },
    onSuccess: (_, { modelId }) => {
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
      queryClient.invalidateQueries({ queryKey: ["models"] });
      toast.success("Photo uploaded");
    },
    onError: toastError,
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
      if (!res.ok) {
        throw new Error("Failed to upload instructions");
      }
      return res.json();
    },
    onSuccess: (_, { modelId }) => {
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
      toast.success("Instructions uploaded");
    },
    onError: toastError,
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
      if (!res.ok) {
        throw new Error("Failed to add required paint");
      }
      return res.json() as Promise<ModelPaint>;
    },
    onSuccess: (_, { modelId }) => {
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
      toast.success("Added required paint");
    },
    onError: toastError,
  });
}

export function useRemoveModelPaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ modelId, paintId }: { modelId: number; paintId: number }) => {
      const res = await fetch(`/api/models/${modelId}/paints/${paintId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to remove required paint");
      }
    },
    onSuccess: (_, { modelId }) => {
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
    },
    onError: toastError,
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

export interface CatalogProviderInfo {
  id: string;
  label: string;
}

/** Which optional catalog providers (e.g. barcode lookup) are actually enabled server-side. */
export function useCatalogProviders() {
  return useQuery({
    queryKey: ["catalog", "providers"],
    queryFn: () => apiFetch<CatalogProviderInfo[]>("/catalog/providers"),
    staleTime: Infinity,
  });
}

/** Optional barcode-lookup convenience — never the primary path. */
export function useCatalogSearch() {
  return useMutation({
    mutationFn: async (query: string) => {
      const res = await fetch(
        `/api/catalog/search?provider=upcitemdb&q=${encodeURIComponent(query)}`,
      );
      if (!res.ok) {
        throw new Error("Lookup failed");
      }
      const data = (await res.json()) as { results: CatalogSearchResult[] };
      return data.results;
    },
    onError: toastError,
  });
}

export function useAddModelToInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      modelId: number;
      quantity?: number;
      condition?: string;
      storageLocation?: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/inventory/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to add model to inventory");
      }
      return res.json();
    },
    onSuccess: (_, { modelId }) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
      toast.success("Added to your collection");
    },
    onError: toastError,
  });
}

export function useRemoveModelFromInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number; modelId: number }) => {
      const res = await fetch(`/api/inventory/models/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to remove model from inventory");
      }
    },
    onSuccess: (_, { modelId }) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["model", modelId] });
    },
    onError: toastError,
  });
}

export function useAddPaintToInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      paintId: number;
      quantity?: number;
      fillLevel?: string;
      storageLocation?: string;
      purchasePrice?: number;
      notes?: string;
    }) => {
      const res = await fetch("/api/inventory/paints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to add paint to inventory");
      }
      return res.json();
    },
    onSuccess: (_, { paintId }) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["paints"] });
      queryClient.invalidateQueries({ queryKey: ["paint", paintId] });
      toast.success("Added to inventory");
    },
    onError: toastError,
  });
}

export function useRemovePaintFromInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number; paintId: number }) => {
      const res = await fetch(`/api/inventory/paints/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to remove paint from inventory");
      }
    },
    onSuccess: (_, { paintId }) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["paints"] });
      queryClient.invalidateQueries({ queryKey: ["paint", paintId] });
    },
    onError: toastError,
  });
}

// --- Projects -------------------------------------------------------

export interface ProjectPhoto {
  id: number;
  projectId: number;
  filename: string;
  originalFilename?: string;
  caption?: string;
  takenAt?: string;
  createdAt: string;
}

export interface ProjectDetail {
  id: number;
  modelId: number;
  name: string;
  status: string;
  progressPercent: number;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  coverPhotoId?: number | null;
  model: { id: number; name: string; kitNumber: string; imageUrl?: string } | null;
  log: { id: number; projectId: number; title: string; description?: string; createdAt: string }[];
  photos: ProjectPhoto[];
  usedPaints: {
    projectPaint: { projectId: number; paintId: number; purpose: string; notes?: string };
    paint: any;
  }[];
}

export function useProjectDetail(id: number) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch project");
      }
      return res.json() as Promise<ProjectDetail>;
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      modelId: number;
      name: string;
      status?: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to create project");
      }
      return res.json() as Promise<{ id: number }>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Started build "${variables.name}"`);
    },
    onError: toastError,
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: {
        progressPercent?: number;
        status?: string;
        notes?: string;
        coverPhotoId?: number | null;
      };
    }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to update project");
      }
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Build updated");
    },
    onError: toastError,
  });
}

export function useAddBuildLogEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      data,
    }: {
      projectId: number;
      data: { title: string; description?: string };
    }) => {
      const res = await fetch(`/api/projects/${projectId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to add build log entry");
      }
      return res.json();
    },
    onSuccess: (_, { projectId, data }) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success(`Logged "${data.title}"`);
    },
    onError: toastError,
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
      if (!res.ok) {
        throw new Error("Failed to upload photo");
      }
      return res.json();
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Photo added");
    },
    onError: toastError,
  });
}

export function useDeleteProjectPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, photoId }: { projectId: number; photoId: number }) => {
      const res = await fetch(`/api/projects/${projectId}/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete photo");
      }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Photo deleted");
    },
    onError: toastError,
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
      data: {
        paintId: number;
        purpose?: "required" | "optional" | "weathering" | "already_substituted";
        notes?: string;
      };
    }) => {
      const res = await fetch(`/api/projects/${projectId}/paints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to add paint to build");
      }
      return res.json();
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Added paint to build");
    },
    onError: toastError,
  });
}

export function useRemoveProjectPaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, paintId }: { projectId: number; paintId: number }) => {
      const res = await fetch(`/api/projects/${projectId}/paints/${paintId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to remove paint from build");
      }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: toastError,
  });
}

// --- Shopping List -------------------------------------------------------

export function useAddShoppingListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      paintId?: number;
      description: string;
      quantity?: number;
      priority?: "low" | "normal" | "high";
    }) => {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to add shopping list item");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
      toast.success(`Added "${variables.description}" to shopping list`);
    },
    onError: toastError,
  });
}

// --- Wishlist ---------------------------------------------------------

export interface WishlistRow {
  item: {
    id: number;
    description: string;
    priority: string;
    targetPrice?: number;
    notes?: string;
  };
  paint: { id: number; name: string; colorHex?: string } | null;
}

export function useWishlist() {
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: () => apiFetch<WishlistRow[]>("/wishlist"),
  });
}

export function useAddWishlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      paintId?: number;
      description: string;
      priority?: "low" | "normal" | "high";
      targetPrice?: number;
    }) => {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to add wishlist item");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success(`Added "${variables.description}" to wishlist`);
    },
    onError: toastError,
  });
}

export function useDeleteWishlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/wishlist/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to remove wishlist item");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
    onError: toastError,
  });
}

export function useMoveWishlistItemToShoppingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/wishlist/${id}/move-to-shopping-list`, { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to move item to shopping list");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["shopping-list"] });
      toast.success("Moved to shopping list");
    },
    onError: toastError,
  });
}

// --- Supplies -------------------------------------------------------------

export interface Supply {
  id: number;
  name: string;
  category?: string;
  quantity: number;
  condition?: string;
  storageLocation?: string;
  purchasePrice?: number;
  notes?: string;
}

export interface SupplyInput {
  name: string;
  category?: string;
  quantity?: number;
  condition?: string;
  storageLocation?: string;
  purchasePrice?: number;
  notes?: string;
}

export function useSupplies(search?: string, category?: string) {
  return useQuery({
    queryKey: ["supplies", search, category],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) {
        params.set("q", search);
      }
      if (category) {
        params.set("category", category);
      }
      const qs = params.toString();
      return apiFetch<Supply[]>(`/supplies${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useSupply(id: number) {
  return useQuery({
    queryKey: ["supply", id],
    queryFn: () => apiFetch<Supply>(`/supplies/${id}`),
    enabled: Number.isFinite(id),
  });
}

export function useCreateSupply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SupplyInput) => {
      const res = await fetch("/api/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to create supply");
      }
      return res.json() as Promise<Supply>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Added "${data.name}"`);
    },
    onError: toastError,
  });
}

export function useUpdateSupply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SupplyInput> }) => {
      const res = await fetch(`/api/supplies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to update supply");
      }
      return res.json() as Promise<Supply>;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["supply", id] });
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    // No success toast — this also backs the quantity +/- stepper, which
    // would spam a toast per click. Errors still surface.
    onError: toastError,
  });
}

export function useDeleteSupply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/supplies/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete supply");
      }
    },
    onError: toastError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
      if (!res.ok) {
        throw new Error("Failed to import manufacturers");
      }
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
      if (!res.ok) {
        throw new Error("Failed to import paints");
      }
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paints"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export interface SeedCommunityPaintsResult {
  manufacturersCreated: number;
  paintsImported: number;
  paintsSkipped: number;
  errors: string[];
}

export function useSeedCommunityPaints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/catalog/seed-community-paints", { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to import starter catalog");
      }
      return res.json() as Promise<SeedCommunityPaintsResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paints"] });
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: toastError,
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
      if (!res.ok) {
        throw new Error("Failed to import models");
      }
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
      if (!res.ok) {
        throw new Error("Failed to export data");
      }
      return res.json();
    },
  });
}

// --- Settings --------------------------------------------------------------

export interface AppSettings {
  id: number;
  currency: string;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<AppSettings>("/settings"),
    staleTime: Infinity,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { currency: string }) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to update settings");
      }
      return res.json() as Promise<AppSettings>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data);
      toast.success("Settings updated");
    },
    onError: toastError,
  });
}

// --- Backups -----------------------------------------------------------

export interface BackupFile {
  filename: string;
  sizeBytes: number;
  createdAt: string;
}

export function useBackups() {
  return useQuery({ queryKey: ["backups"], queryFn: () => apiFetch<BackupFile[]>("/backup") });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/backup", { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to create backup");
      }
      return res.json() as Promise<BackupFile>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
  });
}

export function useDeleteBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (filename: string) => {
      const res = await fetch(`/api/backup/${encodeURIComponent(filename)}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete backup");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
  });
}

export function useRestoreBackup() {
  return useMutation({
    mutationFn: async (filename: string) => {
      const res = await fetch(`/api/backup/${encodeURIComponent(filename)}/restore`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Failed to restore backup");
      }
    },
  });
}

export function useUploadBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/backup/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? "Failed to upload backup");
      }
      return res.json() as Promise<BackupFile>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
    },
  });
}
