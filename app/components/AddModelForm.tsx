import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  CatalogSearchError,
  useAddModelToInventory,
  useCatalogProviders,
  useCatalogSearch,
  useCreateManufacturer,
  useCreateModel,
  useManufacturers,
  useModelFieldOptions,
  useUploadModelImage,
  type CatalogSearchResult,
  type ModelListRow,
} from "../api/client";
import { decodeBarcodeFromImage } from "../lib/barcodeScan";
import { formatCurrency } from "../lib/currency";
import {
  CATEGORY_PRESETS,
  DIFFICULTY_PRESETS,
  SCALE_PRESETS,
  isBarcode,
  mergeOptions,
  normalizeScale,
} from "../lib/modelFields";
import {
  DETAIL_FIELDS,
  EMPTY_MODEL_FORM,
  applyPrefill,
  prefillFromCatalogResult,
  type ModelFormField,
  type ModelFormValues,
  type ModelPrefill,
} from "../lib/modelPrefill";
import { Combobox } from "./Combobox";
import { CameraIcon, ChevronDownIcon, CloseIcon, ScanBarcodeIcon, SearchIcon } from "./icons";
import { PhotoPicker } from "./PhotoPicker";
import { TagInput } from "./TagInput";
import { Button, Card, FieldLabel, Input, Textarea } from "./ui";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const LAST_MANUFACTURER_KEY = "mwm:add-model:last-manufacturer";

// localStorage throws outright in some private-browsing modes and when site
// data is blocked — remembering the manufacturer is a convenience, never a
// reason for the form to break.
function readLastManufacturer(): string {
  try {
    return window.localStorage.getItem(LAST_MANUFACTURER_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeLastManufacturer(name: string) {
  try {
    window.localStorage.setItem(LAST_MANUFACTURER_KEY, name);
  } catch {
    // see readLastManufacturer
  }
}

function scaleSortKey(scale: string): number {
  const match = /^1:(\d+)$/.exec(scale);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

interface CreatedModel {
  id: number;
  name: string;
  kitNumber: string;
}

type Notice = { tone: "info" | "warn" | "error"; text: ReactNode };

const noticeStyles: Record<Notice["tone"], string> = {
  info: "border-workshop-border bg-workshop-panelmuted text-slate-300",
  warn: "border-amber-900 bg-amber-950/30 text-amber-300",
  error: "border-red-900 bg-red-950/30 text-red-300",
};

function lookupErrorText(err: unknown): string {
  const code = err instanceof CatalogSearchError ? err.code : "unavailable";
  if (code === "daily_limit") {
    // 100/day on UPCitemdb's free tier; already-looked-up barcodes still work (cached).
    return "Daily lookup limit reached — try again tomorrow.";
  }
  if (code === "too_fast") {
    return "Too many lookups — wait a few seconds.";
  }
  return "Lookup unavailable right now.";
}

// Fields a lookup filled get this ring until edited: "check these" without
// a paragraph of text saying so.
const PREFILLED_RING = "ring-1 ring-workshop-accent/50";

export function AddModelForm({
  onCreated,
  onCancel,
  ownershipToggle = true,
  addAnother = true,
  bare = false,
}: {
  onCreated: (model: CreatedModel) => void;
  onCancel?: () => void;
  /** Off when the host flow records ownership itself (New Build has its own
   * "I own this" box) — both on would add the kit to the collection twice. */
  ownershipToggle?: boolean;
  /** Off when the host flow needs exactly one model back. */
  addAnother?: boolean;
  /** Rendered inside a Sheet: no outer card/heading, sticky action bar. */
  bare?: boolean;
}) {
  const { data: manufacturers } = useManufacturers();
  const { data: fieldOptions } = useModelFieldOptions();
  const { data: catalogProviders } = useCatalogProviders();
  const lookupEnabled = catalogProviders?.some((p) => p.id === "upcitemdb") ?? false;
  const createManufacturer = useCreateManufacturer();
  const createModel = useCreateModel();
  const catalogSearch = useCatalogSearch();
  const uploadImage = useUploadModelImage({ silent: true });
  const addToInventory = useAddModelToInventory({ silent: true });

  const [values, setValuesState] = useState<ModelFormValues>(EMPTY_MODEL_FORM);
  // Refs, not just state, because lookups are async: by the time a response
  // arrives the user may have typed more, and the prefill must see that.
  // `touched` never affects rendering, so it lives only in a ref.
  const valuesRef = useRef(values);
  const touchedRef = useRef<ReadonlySet<ModelFormField>>(new Set());
  const setValues = (next: ModelFormValues) => {
    valuesRef.current = next;
    setValuesState(next);
  };
  const markTouched = (field: ModelFormField) => {
    if (!touchedRef.current.has(field)) {
      touchedRef.current = new Set(touchedRef.current).add(field);
    }
  };
  const [prefilled, setPrefilled] = useState<ReadonlySet<ModelFormField>>(new Set());
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [owned, setOwned] = useState(true);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [imageBroken, setImageBroken] = useState(false);

  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [searchResults, setSearchResults] = useState<CatalogSearchResult[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nextOffset, setNextOffset] = useState<number | undefined>();
  const [applied, setApplied] = useState<CatalogSearchResult | null>(null);
  // Every image any lookup offered: on save, a chosen one of these is copied
  // to local storage, while a hand-pasted URL is left as a plain link.
  const [lookupImages, setLookupImages] = useState<ReadonlySet<string>>(new Set());
  const [quotaRemaining, setQuotaRemaining] = useState<number | null>(null);
  // Retail CDNs rot or block hotlinking; dead thumbnails are hidden rather
  // than offered as a choice.
  const [brokenImages, setBrokenImages] = useState<ReadonlySet<string>>(new Set());
  const markBroken = (url: string) => setBrokenImages((prev) => new Set(prev).add(url));

  const [duplicate, setDuplicate] = useState<CreatedModel | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<"manufacturer" | "kitNumber" | "name", string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const queryInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const last = readLastManufacturer();
    if (last && !valuesRef.current.manufacturer) {
      setValues({ ...valuesRef.current, manufacturer: last });
    }
  }, []);

  useEffect(() => {
    // Ready to type or paste a barcode straight away — but only with a mouse
    // and keyboard; on a phone that would cover half the sheet with the
    // keyboard before the user has chosen between typing, scanning and a photo.
    if (bare && window.matchMedia("(pointer: fine)").matches) {
      queryInputRef.current?.focus();
    }
  }, [bare]);

  useEffect(() => {
    if (!justAdded) {
      return;
    }
    const timer = window.setTimeout(() => setJustAdded(null), 4000);
    return () => window.clearTimeout(timer);
  }, [justAdded]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const matchedManufacturer = useMemo(() => {
    const needle = values.manufacturer.trim().toLowerCase();
    return needle ? manufacturers?.find((m) => m.name.toLowerCase() === needle) : undefined;
  }, [manufacturers, values.manufacturer]);

  // Live duplicate check, debounced so it doesn't fire on every keystroke.
  // Only meaningful for an existing manufacturer — a new one can't have kits yet.
  const kitNumberTrimmed = values.kitNumber.trim();
  useEffect(() => {
    setDuplicate(null);
    if (!matchedManufacturer || !kitNumberTrimmed) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: kitNumberTrimmed,
          manufacturerId: String(matchedManufacturer.id),
        });
        const res = await fetch(`/api/models?${params}`, { signal: controller.signal });
        if (!res.ok) {
          return;
        }
        const rows = (await res.json()) as ModelListRow[];
        const hit = rows.find(
          (r) => r.model.kitNumber.toLowerCase() === kitNumberTrimmed.toLowerCase(),
        );
        setDuplicate(hit ? hit.model : null);
      } catch {
        // aborted or offline — the submit-time check still guards the save
      }
    }, 400);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [matchedManufacturer, kitNumberTrimmed]);

  const scaleOptions = useMemo(
    () =>
      mergeOptions(fieldOptions?.scales ?? [], SCALE_PRESETS).toSorted(
        (a, b) => scaleSortKey(a) - scaleSortKey(b),
      ),
    [fieldOptions],
  );
  const categoryOptions = useMemo(
    () => mergeOptions(CATEGORY_PRESETS, fieldOptions?.categories ?? []),
    [fieldOptions],
  );
  const difficultyOptions = useMemo(
    () => mergeOptions(DIFFICULTY_PRESETS, fieldOptions?.difficulties ?? []),
    [fieldOptions],
  );
  const manufacturerOptions = useMemo(
    () => (manufacturers ?? []).map((m) => m.name).toSorted((a, b) => a.localeCompare(b)),
    [manufacturers],
  );

  const setField = <K extends ModelFormField>(field: K, value: ModelFormValues[K]) => {
    setValues({ ...valuesRef.current, [field]: value });
    markTouched(field);
    setPrefilled((p) => {
      if (!p.has(field)) {
        return p;
      }
      const next = new Set(p);
      next.delete(field);
      return next;
    });
    if (field === "manufacturer" || field === "kitNumber" || field === "name") {
      setErrors((e) => ({ ...e, [field]: undefined }));
    }
  };

  /** The single entry point for automatic fills (lookup, search pick, and
   * later AI box-photo recognition): never touches a field the user typed. */
  const prefill = (data: ModelPrefill): ModelFormField[] => {
    const result = applyPrefill(valuesRef.current, touchedRef.current, data);
    setValues(result.values);
    setPrefilled((p) => new Set([...p, ...result.applied]));
    if (result.applied.some((f) => DETAIL_FIELDS.includes(f))) {
      setShowDetails(true);
    }
    return result.applied;
  };

  const applyResult = (result: CatalogSearchResult) => {
    // A text-search pick carries one reseller's barcode; don't let it replace
    // the one actually scanned off this box.
    const data = prefillFromCatalogResult(result);
    if (valuesRef.current.barcode) {
      delete data.barcode;
    }
    const filled = prefill(data);
    setApplied(result);
    setImageBroken(false);
    setLookupImages((prev) => new Set([...prev, ...(result.imageUrls ?? [])]));
    setSearchResults(null);
    setNotice(filled.length > 0 ? null : { tone: "info", text: "Nothing new to fill in." });
  };

  const runSearch = async (q: string, offset = 0) => {
    try {
      const page = await catalogSearch.mutateAsync({ query: q, offset });
      setQuotaRemaining(page.quota?.remaining ?? null);
      return page;
    } catch (err) {
      setNotice({ tone: "error", text: lookupErrorText(err) });
      return null;
    }
  };

  const find = async (raw: string) => {
    const q = raw.trim();
    if (!q) {
      return;
    }
    setNotice(null);
    setSearchResults(null);

    if (isBarcode(q)) {
      // The local catalog first: re-scanning a kit you already have should
      // say so instantly, without spending one of the 100 daily lookups.
      try {
        const res = await fetch(`/api/models?barcode=${encodeURIComponent(q)}`);
        const rows = res.ok ? ((await res.json()) as ModelListRow[]) : [];
        const existing = rows[0];
        if (existing) {
          setNotice({
            tone: "warn",
            text: (
              <>
                Already in your catalog: <strong>{existing.model.name}</strong>.{" "}
                <Link to={`/models/${existing.model.id}`} className="underline">
                  Open
                </Link>
              </>
            ),
          });
          return;
        }
      } catch {
        // fall through to the online lookup
      }

      // No message when the lookup is off: the barcode chip appearing is
      // the feedback.
      setField("barcode", q);
      if (!lookupEnabled) {
        return;
      }
      const page = await runSearch(q);
      if (!page) {
        return;
      }
      const hit = page.results[0];
      if (!hit) {
        setNotice({
          tone: "info",
          // The data is US retail listings, so European/import kits often miss.
          text: (
            <>
              No match. Try the kit name, e.g. <em>revell 05239</em>.
            </>
          ),
        });
        return;
      }
      applyResult({ ...hit, barcode: q });
      return;
    }

    if (!lookupEnabled) {
      setNotice({
        tone: "info",
        text: (
          <>
            Name search needs auto-fill —{" "}
            <Link to="/settings" className="underline">
              turn it on in Settings
            </Link>
            .
          </>
        ),
      });
      return;
    }
    const page = await runSearch(q);
    if (!page) {
      return;
    }
    setSearchQuery(q);
    setSearchResults(page.results);
    setNextOffset(page.nextOffset);
    if (page.results.length === 0) {
      setNotice({ tone: "info", text: `No listings for “${q}”.` });
    }
  };

  const loadMore = async () => {
    if (nextOffset === undefined) {
      return;
    }
    const page = await runSearch(searchQuery, nextOffset);
    if (page) {
      setSearchResults((prev) => [...(prev ?? []), ...page.results]);
      setNextOffset(page.nextOffset);
    }
  };

  const handleScan = async (file: File) => {
    setScanning(true);
    setNotice(null);
    try {
      const code = await decodeBarcodeFromImage(file);
      if (!code) {
        setNotice({
          tone: "warn",
          text: "No barcode found — try closer and in focus.",
        });
        return;
      }
      setQuery(code);
      await find(code);
    } catch {
      setNotice({
        tone: "warn",
        text: "Couldn't open that photo.",
      });
    } finally {
      setScanning(false);
    }
  };

  const resetForAnother = () => {
    setValues({
      ...EMPTY_MODEL_FORM,
      manufacturer: values.manufacturer.trim(),
      scale: values.scale,
    });
    touchedRef.current = new Set();
    setPrefilled(new Set());
    setShowDetails(false);
    setPhoto(null);
    setImageBroken(false);
    setQuery("");
    setNotice(null);
    setSearchResults(null);
    setApplied(null);
    setLookupImages(new Set());
    setDuplicate(null);
    setErrors({});
    setFormError(null);
    queryInputRef.current?.focus();
  };

  const save = async (mode: "open" | "another") => {
    setFormError(null);
    const manufacturerName = values.manufacturer.trim();
    const kitNumber = values.kitNumber.trim();
    const name = values.name.trim();
    const nextErrors = {
      manufacturer: manufacturerName ? undefined : "Choose or add a manufacturer.",
      kitNumber: kitNumber ? undefined : "Kit number is required.",
      name: name ? undefined : "Name is required.",
    };
    setErrors(nextErrors);
    if (nextErrors.manufacturer || nextErrors.kitNumber || nextErrors.name) {
      return;
    }
    if (duplicate) {
      return;
    }

    setSaving(true);
    try {
      let manufacturerId = matchedManufacturer?.id;
      if (manufacturerId === undefined) {
        const created = await createManufacturer.mutateAsync({
          name: manufacturerName,
          slug: slugify(manufacturerName),
        });
        manufacturerId = created.id;
      } else {
        // Re-checked at submit time: the debounced live check may not have
        // finished if the user saved straight after typing.
        const params = new URLSearchParams({
          q: kitNumber,
          manufacturerId: String(manufacturerId),
        });
        const res = await fetch(`/api/models?${params}`);
        if (res.ok) {
          const rows = (await res.json()) as ModelListRow[];
          const hit = rows.find((r) => r.model.kitNumber.toLowerCase() === kitNumber.toLowerCase());
          if (hit) {
            setDuplicate(hit.model);
            return;
          }
        }
      }

      const imageUrl = values.imageUrl.trim();
      const created = await createModel.mutateAsync({
        manufacturerId,
        kitNumber,
        name,
        barcode: values.barcode || undefined,
        scale: values.scale.trim() ? normalizeScale(values.scale) : undefined,
        category: values.category.trim() || undefined,
        difficulty: values.difficulty.trim() || undefined,
        partCount: values.partCount ? Number(values.partCount) : undefined,
        description: values.description.trim() || undefined,
        imageUrl: imageUrl || undefined,
        sourceUrl: values.sourceUrl.trim() || undefined,
        instructionUrl: values.instructionUrl.trim() || undefined,
        tagNames: values.tagNames.length > 0 ? values.tagNames : undefined,
      });
      writeLastManufacturer(manufacturerName);

      // The model exists from here on, so a failure below is reported but
      // doesn't undo the save — the photo or ownership can be added from the
      // kit's page.
      if (photo) {
        await uploadImage
          .mutateAsync({ modelId: created.id, file: photo })
          .catch(() =>
            toast.error("Saved, but the box photo didn't upload — add it from the kit's page."),
          );
      } else if (imageUrl && lookupImages.has(imageUrl)) {
        // Best effort: if the CDN refuses, the hotlinked URL saved above stays.
        await uploadImage.mutateAsync({ modelId: created.id, url: imageUrl }).catch(() => {});
      }
      if (ownershipToggle && owned) {
        await addToInventory
          .mutateAsync({ modelId: created.id, quantity: 1 })
          .catch(() =>
            toast.error("Saved, but couldn't mark it as owned — do that from the kit's page."),
          );
      }

      if (mode === "open") {
        onCreated(created);
      } else {
        resetForAnother();
        setJustAdded(created.name);
      }
    } catch {
      setFormError("Could not save this model. Check the fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || catalogSearch.isPending || scanning;
  const imageChoices = (applied?.imageUrls ?? []).filter((url) => !brokenImages.has(url));

  const ring = (field: ModelFormField) => (prefilled.has(field) ? PREFILLED_RING : "");
  const isNewManufacturer = Boolean(
    manufacturers && values.manufacturer.trim() && !matchedManufacturer,
  );
  const photoLabel = photo || (values.imageUrl && !imageBroken) ? "Change photo" : "Add box photo";
  const photoSrc = photoPreview ?? (values.imageUrl && !imageBroken ? values.imageUrl : null);

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save("open");
      }}
      // min-h-full + the action bar's mt-auto keep Save at the bottom of the
      // full-height phone sheet even when the form is short.
      className={`flex flex-col gap-5 ${bare ? "min-h-full px-4 pt-4 sm:px-5 sm:pt-5" : ""}`}
      noValidate
    >
      {justAdded && (
        <p
          aria-live="polite"
          className="rounded-lg border border-emerald-900 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300"
        >
          ✓ Added <strong>{justAdded}</strong> — ready for the next kit.
        </p>
      )}

      {/* Quick fill: barcode scan / lookup / text search */}
      <section>
        <div className="mb-1.5 flex min-h-6 items-center justify-between gap-2">
          <label htmlFor="add-model-find" className="text-sm font-medium text-slate-300">
            Barcode or kit search
          </label>
          {values.barcode && (
            <span
              title="Saved with this kit"
              className="inline-flex items-center gap-1 rounded-full border border-workshop-border bg-workshop-panelmuted py-0.5 pr-1 pl-2 text-xs text-slate-300"
            >
              <ScanBarcodeIcon className="size-3.5 text-slate-500" />
              {values.barcode}
              <button
                type="button"
                aria-label="Remove barcode"
                onClick={() => setField("barcode", "")}
                className="rounded-full p-0.5 text-slate-500 hover:text-slate-200"
              >
                <CloseIcon className="size-3" />
              </button>
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="add-model-find"
              ref={queryInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter here means "look it up", not "save the half-empty form".
                if (e.key === "Enter") {
                  e.preventDefault();
                  void find(query);
                }
              }}
              inputMode="search"
              enterKeyHint="search"
              placeholder={lookupEnabled ? "Barcode or kit name" : "Barcode on the box"}
              className="pr-11 pl-9"
            />
            <button
              type="button"
              onClick={() => scanInputRef.current?.click()}
              disabled={busy}
              aria-label="Scan barcode from photo"
              title="Scan barcode from a photo"
              className="absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-workshop-accent disabled:opacity-50"
            >
              <ScanBarcodeIcon className={`size-5 ${scanning ? "animate-pulse" : ""}`} />
            </button>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void find(query)}
            disabled={busy || !query.trim()}
          >
            {catalogSearch.isPending ? "Looking…" : "Find"}
          </Button>
        </div>
        <input
          ref={scanInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          data-testid="barcode-scan-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) {
              void handleScan(file);
            }
          }}
        />
        {!lookupEnabled && catalogProviders && (
          <p className="mt-1.5 text-xs text-slate-500">
            Auto-fill is off ·{" "}
            <Link to="/settings" className="text-workshop-accent hover:underline">
              Turn on in Settings
            </Link>
          </p>
        )}
        {lookupEnabled && quotaRemaining !== null && quotaRemaining <= 20 && (
          <p className="mt-1.5 text-xs text-slate-500">
            {quotaRemaining} lookup{quotaRemaining === 1 ? "" : "s"} left today
          </p>
        )}
        {notice && (
          <div
            role="status"
            className={`mt-2 rounded-lg border px-3 py-2 text-sm ${noticeStyles[notice.tone]}`}
          >
            {notice.text}
          </div>
        )}

        {searchResults && searchResults.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-lg border border-workshop-border">
            <p className="border-b border-workshop-border bg-workshop-panelmuted px-3 py-1.5 text-xs text-slate-400">
              Pick a kit
            </p>
            <ul className="max-h-72 divide-y divide-workshop-border overflow-y-auto">
              {searchResults.map((r) => (
                <li key={`${r.manufacturerName}|${r.kitNumber}|${r.externalId}`}>
                  <button
                    type="button"
                    onClick={() => applyResult(r)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-workshop-panelmuted"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-workshop-border bg-workshop-panelmuted">
                      {r.imageUrl && !brokenImages.has(r.imageUrl) && (
                        <img
                          onError={() => markBroken(r.imageUrl!)}
                          src={r.imageUrl}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="size-full object-cover"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-100">
                        {r.name}
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        {[r.manufacturerName, r.kitNumber, r.scale].filter(Boolean).join(" · ")}
                        {(r.listingCount ?? 1) > 1 && ` · ${r.listingCount} listings`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {nextOffset !== undefined && (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={busy}
                className="w-full border-t border-workshop-border px-3 py-2 text-sm text-workshop-accent hover:bg-workshop-panelmuted disabled:opacity-50"
              >
                {catalogSearch.isPending ? "Loading…" : "More results"}
              </button>
            )}
          </div>
        )}

        {applied && (imageChoices.length > 1 || applied.priceRange) && (
          <div className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            {imageChoices.length > 1 && (
              <div>
                <p className="mb-1.5 text-xs text-slate-400">Box image</p>
                <div className="flex flex-wrap gap-2">
                  {imageChoices.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      aria-label={`Use image ${i + 1}`}
                      aria-pressed={values.imageUrl === url}
                      onClick={() => {
                        setField("imageUrl", url);
                        setImageBroken(false);
                      }}
                      className={`size-14 overflow-hidden rounded-md border-2 ${
                        values.imageUrl === url
                          ? "border-workshop-accent"
                          : "border-workshop-border"
                      }`}
                    >
                      <img
                        src={url}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={() => markBroken(url)}
                        className="size-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {applied.priceRange && (
              <p className="text-xs text-slate-500">
                US retail {formatCurrency(applied.priceRange.low, "USD")}–
                {formatCurrency(applied.priceRange.high, "USD")}
              </p>
            )}
          </div>
        )}
      </section>

      {/* Identity: photo + the three required fields */}
      <section className="grid grid-cols-1 gap-3 border-t border-workshop-border pt-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
        <PhotoPicker onSelect={setPhoto} disabled={saving}>
          {(open) => (
            <button
              type="button"
              onClick={open}
              aria-label={photo ? "Change box photo" : "Add box photo"}
              className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-dashed border-workshop-border bg-workshop-panelmuted p-2 text-left text-sm text-slate-400 transition-colors hover:border-workshop-accent sm:flex-col sm:justify-center sm:p-0"
            >
              {/* Phone: compact row. sm+: fills the grid cell, which the
                  grid stretches to exactly the height of the fields. */}
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-workshop-panel sm:absolute sm:inset-0 sm:size-auto sm:rounded-none sm:bg-transparent">
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={photo ? "Box photo" : "Box"}
                    referrerPolicy="no-referrer"
                    onError={() => !photo && setImageBroken(true)}
                    className="size-full object-cover"
                  />
                ) : (
                  <CameraIcon className="size-5 sm:size-6" />
                )}
              </span>
              <span
                className={
                  photoSrc
                    ? "sm:absolute sm:inset-x-0 sm:bottom-0 sm:bg-black/60 sm:py-1 sm:text-center sm:text-xs sm:text-slate-200 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                    : "sm:relative sm:mt-9 sm:text-xs"
                }
              >
                {photoLabel}
              </span>
            </button>
          )}
        </PhotoPicker>

        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <FieldLabel htmlFor="add-model-manufacturer">Manufacturer</FieldLabel>
            <Combobox
              id="add-model-manufacturer"
              value={values.manufacturer}
              onChange={(v) => setField("manufacturer", v)}
              options={manufacturerOptions}
              placeholder="Search or add…"
              createLabel={(q) => `+ Add "${q}"`}
              inputClassName={ring("manufacturer")}
              adornment={
                isNewManufacturer && (
                  <span
                    title="Added when you save"
                    className="rounded-sm bg-workshop-accent/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-workshop-accent uppercase"
                  >
                    New
                  </span>
                )
              }
            />
            {errors.manufacturer && (
              <p className="mt-1 text-xs text-red-400">{errors.manufacturer}</p>
            )}
          </div>
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,5fr)] gap-3">
            <div>
              <FieldLabel htmlFor="add-model-kit-number">Kit number</FieldLabel>
              <Input
                id="add-model-kit-number"
                value={values.kitNumber}
                onChange={(e) => setField("kitNumber", e.target.value)}
                placeholder="05239"
                autoComplete="off"
                className={ring("kitNumber")}
              />
              {errors.kitNumber && <p className="mt-1 text-xs text-red-400">{errors.kitNumber}</p>}
            </div>
            <div>
              <FieldLabel htmlFor="add-model-name">Name</FieldLabel>
              <Input
                id="add-model-name"
                value={values.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Smit Houston"
                autoComplete="off"
                className={ring("name")}
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>
          </div>
        </div>
      </section>

      {duplicate && (
        <div
          role="alert"
          className="rounded-lg border border-amber-900 bg-amber-950/30 px-3 py-2 text-sm text-amber-300"
        >
          "{duplicate.name}" ({duplicate.kitNumber}) is already in your catalog.{" "}
          <button type="button" className="underline" onClick={() => onCreated(duplicate)}>
            Open it
          </button>
        </div>
      )}

      {/* Everything else */}
      <div className="rounded-xl border border-workshop-border">
        <button
          type="button"
          aria-expanded={showDetails}
          aria-controls="add-model-details"
          onClick={() => setShowDetails((s) => !s)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-300"
        >
          More details
          <span className="flex items-center gap-2 text-xs font-normal text-slate-500">
            {!showDetails && [values.scale, values.category].filter((v) => v.trim()).join(" · ")}
            <ChevronDownIcon
              className={`size-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
            />
          </span>
        </button>
        {showDetails && (
          <div
            id="add-model-details"
            className="flex flex-col gap-3 border-t border-workshop-border p-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="add-model-scale">Scale</FieldLabel>
                <Combobox
                  id="add-model-scale"
                  value={values.scale}
                  onChange={(v) => setField("scale", v)}
                  options={scaleOptions}
                  normalize={normalizeScale}
                  placeholder="1:48"
                  inputClassName={ring("scale")}
                />
              </div>
              <div>
                <FieldLabel htmlFor="add-model-category">Category</FieldLabel>
                <Combobox
                  id="add-model-category"
                  value={values.category}
                  onChange={(v) => setField("category", v)}
                  options={categoryOptions}
                  placeholder="Aircraft"
                  inputClassName={ring("category")}
                />
              </div>
              <div>
                <FieldLabel htmlFor="add-model-difficulty">Difficulty</FieldLabel>
                <Combobox
                  id="add-model-difficulty"
                  value={values.difficulty}
                  onChange={(v) => setField("difficulty", v)}
                  options={difficultyOptions}
                  placeholder="Intermediate"
                  inputClassName={ring("difficulty")}
                />
              </div>
              <div>
                <FieldLabel htmlFor="add-model-part-count">Part count</FieldLabel>
                <Input
                  id="add-model-part-count"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={values.partCount}
                  onChange={(e) => setField("partCount", e.target.value)}
                  placeholder="200"
                  className={ring("partCount")}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Tags</FieldLabel>
              <TagInput value={values.tagNames} onChange={(t) => setField("tagNames", t)} />
            </div>

            <div>
              <FieldLabel htmlFor="add-model-description">Description</FieldLabel>
              <Textarea
                id="add-model-description"
                value={values.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={2}
                className={ring("description")}
              />
            </div>

            <div>
              <FieldLabel htmlFor="add-model-image-url">Image URL</FieldLabel>
              <Input
                id="add-model-image-url"
                value={values.imageUrl}
                onChange={(e) => {
                  setField("imageUrl", e.target.value);
                  setImageBroken(false);
                }}
                placeholder="https://…"
                className={ring("imageUrl")}
              />
              {(photo || imageBroken || lookupImages.has(values.imageUrl)) && (
                <p className={`mt-1 text-xs ${imageBroken ? "text-amber-400" : "text-slate-500"}`}>
                  {photo
                    ? "Your box photo is used instead."
                    : imageBroken
                      ? "Couldn't load that image."
                      : "Saved as a local copy."}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="add-model-source-url">Official page</FieldLabel>
                <Input
                  id="add-model-source-url"
                  value={values.sourceUrl}
                  onChange={(e) => setField("sourceUrl", e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div>
                <FieldLabel htmlFor="add-model-instruction-url">Instructions link</FieldLabel>
                <Input
                  id="add-model-instruction-url"
                  value={values.instructionUrl}
                  onChange={(e) => setField("instructionUrl", e.target.value)}
                  placeholder="https://… (or attach a PDF later)"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {ownershipToggle && (
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={owned}
            onChange={(e) => setOwned(e.target.checked)}
            className="size-4 rounded-sm border-workshop-border accent-workshop-accent"
          />
          I own this kit
        </label>
      )}

      {formError && <p className="text-sm text-red-400">{formError}</p>}

      <div
        className={
          bare
            ? // Pinned to the bottom of the sheet's scroll area so Save is
              // always reachable, even with "More details" open on a phone.
              "sticky bottom-0 -mx-4 mt-auto grid grid-cols-2 gap-2 border-t border-workshop-border bg-workshop-panel px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-5 sm:px-5"
            : "flex flex-col gap-2 sm:flex-row"
        }
      >
        <Button type="submit" disabled={saving} className={bare ? "" : "sm:flex-1"}>
          {saving ? "Saving…" : "Save model"}
        </Button>
        {addAnother && (
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            className={bare ? "" : "sm:flex-1"}
            onClick={() => void save("another")}
          >
            Save &amp; add another
          </Button>
        )}
        {onCancel && !bare && (
          <Button type="button" variant="ghost" className="sm:w-auto" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );

  if (bare) {
    return form;
  }
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-slate-300">Add a new model</h2>
      {form}
    </Card>
  );
}
