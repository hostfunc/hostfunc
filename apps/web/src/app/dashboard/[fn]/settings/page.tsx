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
import { getFunctionForOrg } from "@/server/functions";
import { FileCode2, Globe, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { updateFunctionDescriptionAction } from "../actions";

export default async function GeneralFunctionSettingsPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { orgId } = await requireActiveOrg();
  const { fn: fnId } = await params;
  const fn = await getFunctionForOrg(orgId, fnId);
  if (!fn) notFound();

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
              Public HTTP access controls are coming soon. Your current visibility setting is shown
              below.
            </SettingsCardDescription>
          </SettingsCardHeader>
          <SettingsCardContent>
            <div className="flex flex-wrap gap-3">
              {(["private", "public"] as const).map((visibility) => {
                const active = fn.visibility === visibility;
                return (
                  <button
                    key={visibility}
                    type="button"
                    disabled
                    className={`min-w-[140px] rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-[var(--color-amber)]/50 bg-[var(--color-amber)]/10 text-[var(--color-bone)]"
                        : "border-[var(--color-border)] bg-[var(--color-ink)]/60 text-[var(--color-bone-faint)]"
                    } disabled:cursor-not-allowed disabled:opacity-100`}
                  >
                    <div className="text-sm font-semibold capitalize">{visibility}</div>
                    <div className="mt-1 text-xs text-[var(--color-bone-faint)]">
                      {visibility === "public"
                        ? "Expose endpoint publicly"
                        : "Restrict to private usage"}
                    </div>
                  </button>
                );
              })}
            </div>
          </SettingsCardContent>
          <SettingsCardFooter className="justify-between gap-3">
            <p className="text-sm text-[var(--color-bone-muted)]">
              Public function access is coming soon.
            </p>
            <Button
              type="button"
              disabled
              title="Visibility controls are coming soon"
              className="rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            >
              Save Visibility
            </Button>
          </SettingsCardFooter>
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
          <SettingsCardContent>
            <div className="grid max-w-sm gap-2">
              <Label htmlFor="fnName" className="sr-only">
                Name
              </Label>
              <Input
                id="fnName"
                value={fn.slug}
                readOnly
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)]"
              />
            </div>
          </SettingsCardContent>
          <SettingsCardFooter className="justify-end">
            <Button
              disabled
              title="Slug updates are not yet available"
              className="rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            >
              Save Name
            </Button>
          </SettingsCardFooter>
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
                className="rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
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
