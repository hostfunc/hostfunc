import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardHeader,
  SettingsCardTitle,
} from "@/components/settings/settings-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireActiveOrg } from "@/lib/session";
import {
  MARKETPLACE_CATEGORIES,
  getFunctionForOrg,
  getFunctionMarketplaceProfileForOrg,
} from "@/server/functions";
import { getEffectivePlan } from "@/server/plans";
import { FileCode2, Globe, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketplaceReadmeEditor } from "./marketplace-readme-editor";
import {
  updateFunctionDescriptionAction,
  updateFunctionSlugAction,
  updateFunctionMarketplaceProfileAction,
  updateFunctionVisibilityAction,
} from "../actions";

export default async function GeneralFunctionSettingsPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { orgId } = await requireActiveOrg();
  const { fn: fnId } = await params;
  const fn = await getFunctionForOrg(orgId, fnId);
  if (!fn) notFound();
  const [plan, profile] = await Promise.all([
    getEffectivePlan(orgId),
    getFunctionMarketplaceProfileForOrg(orgId, fnId),
  ]);
  const canUsePrivateFunctions = plan.planSlug !== "free";
  const privateLocked = fn.visibility !== "private" && !canUsePrivateFunctions;

  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Function Settings <ShieldCheck className="h-6 w-6 text-[var(--color-amber)]" />
          </h3>
          <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-bone-muted)]">
            Manage name, description, and safety controls for this function.
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/70 shadow-xl">
          <SettingsCardHeader>
            <SettingsCardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[var(--color-amber)]" />
              Function Visibility
            </SettingsCardTitle>
            <SettingsCardDescription>
              Public functions appear in the marketplace by default. Private functions are available
              on Pro and Team plans.
            </SettingsCardDescription>
          </SettingsCardHeader>
          <form action={updateFunctionVisibilityAction}>
            <SettingsCardContent>
              <input type="hidden" name="fnId" value={fn.id} />
              <input type="hidden" name="visibility" value={fn.visibility} />
              <div className="flex flex-wrap gap-3">
                {(["private", "public"] as const).map((visibility) => {
                  const active = fn.visibility === visibility;
                  const disabled = visibility === "private" && privateLocked;
                  return (
                    <button
                      key={visibility}
                      type="submit"
                      name="visibility"
                      value={visibility}
                      disabled={disabled || active}
                      className={`min-w-[140px] rounded-xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-[var(--color-amber)]/50 bg-[var(--color-amber)]/10 text-[var(--color-bone)]"
                          : "border-[var(--color-border)] bg-[var(--color-ink)]/60 text-[var(--color-bone-muted)] hover:border-[var(--color-amber)]/35"
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      <div className="text-sm font-semibold capitalize">{visibility}</div>
                      <div className="mt-1 text-xs text-[var(--color-bone-faint)]">
                        {visibility === "public"
                          ? "Discoverable in marketplace"
                          : disabled
                            ? "Requires Pro or Team"
                            : "Workspace-only listing"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </SettingsCardContent>
            <SettingsCardFooter className="justify-between gap-3">
              <p className="text-sm text-[var(--color-bone-muted)]">
                {fn.visibility === "private"
                  ? "This grandfathered private function remains private."
                  : "This function is public and can be listed in the marketplace."}
              </p>
              {privateLocked ? (
                <Button
                  asChild
                  variant="glass"
                  className="rounded-full px-5"
                >
                  <Link href="/dashboard/settings/billing">Upgrade for private</Link>
                </Button>
              ) : null}
            </SettingsCardFooter>
          </form>
        </SettingsCard>

        <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/70 shadow-xl">
          <SettingsCardHeader>
            <SettingsCardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--color-amber)]" />
              Marketplace Profile
            </SettingsCardTitle>
            <SettingsCardDescription>
              Add discovery metadata for public listings. Private functions keep this saved until
              they are published.
            </SettingsCardDescription>
          </SettingsCardHeader>
          <form action={updateFunctionMarketplaceProfileAction}>
            <SettingsCardContent className="space-y-4">
              <input type="hidden" name="fnId" value={fn.id} />
              <div className="grid gap-2">
                <Label htmlFor="marketplaceCategory">Category</Label>
                <select
                  id="marketplaceCategory"
                  name="category"
                  defaultValue={profile?.category ?? "utilities"}
                  className="h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-ink)]/70 px-3 text-sm text-[var(--color-bone)] outline-none focus:border-[var(--color-amber)]/50"
                >
                  {MARKETPLACE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category
                        .split("-")
                        .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
                        .join(" ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="marketplaceShortDescription">Short description</Label>
                <Input
                  id="marketplaceShortDescription"
                  name="shortDescription"
                  defaultValue={profile?.shortDescription || fn.description || ""}
                  maxLength={280}
                  placeholder="Explain the function in one marketplace-friendly sentence"
                  className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)] focus-visible:ring-[var(--color-amber)]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="marketplaceUseCases">Use cases</Label>
                <Input
                  id="marketplaceUseCases"
                  name="useCases"
                  defaultValue={(profile?.useCases ?? []).join(", ")}
                  placeholder="webhook, ai, crm, monitoring"
                  className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)] focus-visible:ring-[var(--color-amber)]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="marketplaceReadme">README</Label>
                <MarketplaceReadmeEditor
                  name="readme"
                  initialValue={profile?.readme ?? ""}
                />
              </div>
            </SettingsCardContent>
            <SettingsCardFooter className="justify-end">
              <Button
                type="submit"
                variant="glass"
                className="rounded-full px-5"
              >
                Save Marketplace Profile
              </Button>
            </SettingsCardFooter>
          </form>
        </SettingsCard>

        <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/70 shadow-xl">
          <SettingsCardHeader>
            <SettingsCardTitle className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-[var(--color-amber)]" />
              Function Name
            </SettingsCardTitle>
            <SettingsCardDescription>
              The human-readable name of your function.
            </SettingsCardDescription>
          </SettingsCardHeader>
          <form action={updateFunctionSlugAction}>
            <SettingsCardContent>
              <input type="hidden" name="fnId" value={fn.id} />
              <div className="grid max-w-sm gap-2">
                <Label htmlFor="fnName" className="sr-only">
                  Name
                </Label>
                <Input
                  id="fnName"
                  name="slug"
                  defaultValue={fn.slug}
                  placeholder="my-function-name"
                  className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)] focus-visible:ring-[var(--color-amber)]"
                />
              </div>
            </SettingsCardContent>
            <SettingsCardFooter className="justify-end">
              <Button
                type="submit"
                variant="glass"
                className="rounded-full px-5"
              >
                Save Name
              </Button>
            </SettingsCardFooter>
          </form>
        </SettingsCard>

        <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/70 shadow-xl">
          <SettingsCardHeader>
            <SettingsCardTitle>Description</SettingsCardTitle>
            <SettingsCardDescription>
              Provide a short summary of what this function does.
            </SettingsCardDescription>
          </SettingsCardHeader>
          <form action={updateFunctionDescriptionAction}>
            <SettingsCardContent>
              <input type="hidden" name="fnId" value={fn.id} />
              <div className="grid max-w-lg gap-2">
                <Label htmlFor="fnDesc" className="sr-only">
                  Description
                </Label>
                <Input
                  id="fnDesc"
                  name="description"
                  defaultValue={fn.description ?? ""}
                  placeholder="Add a short function description"
                  className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)] focus-visible:ring-[var(--color-amber)]"
                />
              </div>
            </SettingsCardContent>
            <SettingsCardFooter className="justify-end">
              <Button
                type="submit"
                variant="glass"
                className="rounded-full px-5"
              >
                Save Description
              </Button>
            </SettingsCardFooter>
          </form>
        </SettingsCard>

        <SettingsCard className="rounded-2xl border-red-500/25 bg-red-500/10 shadow-xl">
          <SettingsCardHeader>
            <SettingsCardTitle className="text-red-300">Danger Zone</SettingsCardTitle>
            <SettingsCardDescription className="text-red-300/85">
              Permanently delete this function and all its executions. This cannot be undone.
            </SettingsCardDescription>
          </SettingsCardHeader>
          <SettingsCardFooter className="justify-end border-red-500/30 bg-red-500/15">
            <Button variant="destructive">Delete Function</Button>
          </SettingsCardFooter>
        </SettingsCard>
      </section>
    </div>
  );
}
