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
import { PackageCheck, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function PackagesClient({
  fnId,
  initialPackages,
}: {
  fnId: string;
  initialPackages: FunctionPackageRecord[];
}) {
  const [packages, setPackages] = useState(initialPackages);
  const [packageName, setPackageName] = useState("");
  const [pending, setPending] = useState(false);

  const onAdd = async () => {
    const trimmed = packageName.trim();
    if (!trimmed) return;
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

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <PackageCheck className="h-4 w-4 text-primary" />
            Function Packages
          </div>
          <span className="text-xs text-[var(--color-bone-faint)]">{packages.length} configured</span>
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
                    {pkg.version ? `latest: ${pkg.version}` : "version unresolved"} · source: {pkg.source}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => void onRefresh(pkg.name)}>
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

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)]/65 p-4">
        <div className="mb-3 text-sm font-medium">Add package</div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input
            value={packageName}
            onChange={(event) => setPackageName(event.target.value)}
            placeholder="package name (e.g. lodash)"
            className="font-mono"
          />
          <Button onClick={() => void onAdd()} disabled={pending || !packageName.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
