"use client";

import {
  addFunctionPackage,
  listFunctionPackages,
  refreshFunctionPackageVersion,
  removeFunctionPackage,
} from "@/app/dashboard/[fn]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_FUNCTION_SDK, type FunctionPackageRecord } from "@/lib/function-packages";
import { Loader2, PackageCheck, Plus, RefreshCcw, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface PackageSearchResult {
  name: string;
  version: string | null;
  description: string;
  keywords: string[];
  npmUrl: string | null;
}

export function PackagesClient({
  fnId,
  initialPackages,
  canManagePackages,
}: {
  fnId: string;
  initialPackages: FunctionPackageRecord[];
  canManagePackages: boolean;
}) {
  const [packages, setPackages] = useState(initialPackages);
  const [packageName, setPackageName] = useState("");
  const [pending, setPending] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<PackageSearchResult[]>([]);

  const configuredPackages = useMemo(() => new Set(packages.map((pkg) => pkg.name)), [packages]);

  const onAdd = async () => {
    const trimmed = packageName.trim();
    if (!trimmed) return;
    if (!canManagePackages) {
      toast.error("You do not have permission to add packages.");
      return;
    }
    try {
      setPending(true);
      await addFunctionPackage({ fnId, name: trimmed });
      await refreshOne(trimmed);
      setPackageName("");
      toast.success("Package added");
    } catch (error) {
      toast.error("Failed to add package");
      console.error(error);
    } finally {
      setPending(false);
    }
  };

  const refreshOne = async (name: string) => {
    await refreshFunctionPackageVersion({ fnId, name });
    const refreshed = await listFunctionPackages(fnId);
    setPackages(refreshed);
  };

  const onRemove = async (name: string) => {
    if (name === DEFAULT_FUNCTION_SDK) return;
    if (!canManagePackages) {
      toast.error("You do not have permission to remove packages.");
      return;
    }
    try {
      setPending(true);
      await removeFunctionPackage({ fnId, name });
      setPackages((prev) => prev.filter((pkg) => pkg.name !== name));
      toast.success("Package removed");
    } catch (error) {
      toast.error("Failed to remove package");
      console.error(error);
    } finally {
      setPending(false);
    }
  };

  const onRefresh = async (name: string) => {
    if (!canManagePackages) {
      toast.error("You do not have permission to refresh packages.");
      return;
    }
    try {
      setPending(true);
      await refreshOne(name);
      toast.success("Version refreshed");
    } catch (error) {
      toast.error("Failed to refresh version");
      console.error(error);
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    const query = packageName.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearchError("");
    setIsSearching(true);

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/internal/npm/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`search_status_${response.status}`);
        }
        const json = (await response.json()) as { items?: PackageSearchResult[] };
        setSearchResults(json.items ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSearchResults([]);
        setSearchError(error instanceof Error ? error.message : "Unable to search npm packages.");
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [packageName]);

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <PackageCheck className="h-4 w-4 text-primary" />
            Function Packages
          </div>
          <span className="text-xs text-[var(--color-bone-faint)]">
            {packages.length} configured
          </span>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {packages.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[var(--color-bone-muted)]">
              No packages configured yet.
            </div>
          ) : (
            packages.map((pkg) => (
              <div key={pkg.name} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <div className="font-mono text-sm">{pkg.name}</div>
                  <div className="text-xs text-[var(--color-bone-faint)]">
                    {pkg.version ? `latest: ${pkg.version}` : "version unresolved"} · source:{" "}
                    {pkg.source}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => void onRefresh(pkg.name)}
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending || pkg.name === DEFAULT_FUNCTION_SDK}
                    onClick={() => void onRemove(pkg.name)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/70 p-6 shadow-xl">
        <div className="mb-3 text-sm font-semibold text-[var(--color-bone)]">Add package</div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-bone-faint)]" />
              <Input
                value={packageName}
                onChange={(event) => setPackageName(event.target.value)}
                placeholder="Search npm packages (e.g. lodash)"
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 pl-10 font-mono text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)] focus-visible:ring-[var(--color-amber)]"
              />
              {isSearching ? (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--color-bone-faint)]" />
              ) : null}
            </div>

            {searchError ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                Failed to load npm search results.
              </div>
            ) : null}

            {searchResults.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]/60">
                <div className="max-h-80 divide-y divide-[var(--color-border)] overflow-y-auto">
                  {searchResults.map((result) => {
                    const alreadyAdded = configuredPackages.has(result.name);
                    return (
                      <button
                        key={result.name}
                        type="button"
                        disabled={pending || alreadyAdded || !canManagePackages}
                        onClick={() => {
                          if (!canManagePackages) {
                            toast.error("You do not have permission to add packages.");
                            return;
                          }
                          setPackageName(result.name);
                          void onAddFromResult(result.name);
                        }}
                        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-[var(--color-bone)]">
                              {result.name}
                            </span>
                            <span className="text-xs text-[var(--color-bone-faint)]">
                              {result.version ?? "unknown"}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-[var(--color-bone-muted)]">
                            {result.description || "No description provided."}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-[var(--color-bone-faint)]">
                          {alreadyAdded ? "Added" : "Add"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : packageName.trim().length >= 2 && !isSearching ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink)]/50 px-3 py-2 text-sm text-[var(--color-bone-muted)]">
                No npm package matches found.
              </div>
            ) : null}
          </div>
          <Button
            onClick={() => void onAdd()}
            disabled={pending || !packageName.trim()}
            className="h-11 rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
        {!canManagePackages ? (
          <p className="mt-3 text-sm text-[var(--color-bone-muted)]">
            You can search packages, but only admins and owners can change package configuration.
          </p>
        ) : null}
      </div>
    </div>
  );

  async function onAddFromResult(name: string) {
    if (!canManagePackages) {
      toast.error("You do not have permission to add packages.");
      return;
    }
    try {
      setPending(true);
      await addFunctionPackage({ fnId, name });
      await refreshOne(name);
      setPackageName("");
      setSearchResults([]);
      toast.success("Package added");
    } catch (error) {
      toast.error("Failed to add package");
      console.error(error);
    } finally {
      setPending(false);
    }
  }
}
