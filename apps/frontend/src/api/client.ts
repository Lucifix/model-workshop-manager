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
  recentlyAddedModels: { id: number; name: string; kitNumber: string }[];
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

export function usePaints(search?: string) {
  return useQuery({
    queryKey: ["paints", search],
    queryFn: () => apiFetch<PaintListRow[]>(`/paints${search ? `?q=${encodeURIComponent(search)}` : ""}`),
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
  model: { id: number; name: string; kitNumber: string } | null;
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
  paint: { id: number; name: string } | null;
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
  requiredPaints: ModelDetailPaint[];
  availability: { totalRequired: number; ownedCount: number; missingCount: number; coveragePercent: number };
  ownership: { id: number; modelId: number; owned: boolean; quantity: number; condition?: string }[];
  projects: { id: number; modelId: number; name: string; status: string; progressPercent: number }[];
}

export function useModelDetail(id: number) {
  return useQuery({
    queryKey: ["model", id],
    queryFn: () => apiFetch<ModelDetail>(`/models/${id}`),
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
  inventory: { id: number; paintId: number; quantity: number; fillLevel: string; storageLocation?: string; notes?: string }[];
}

export function usePaintDetail(id: number) {
  return useQuery({
    queryKey: ["paint", id],
    queryFn: () => apiFetch<PaintDetail>(`/paints/${id}`),
  });
}

// --- Mutations -----------------------------------------------------------

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
