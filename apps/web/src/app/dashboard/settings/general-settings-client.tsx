"use client";

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
import { Building2, Globe, Loader2 } from "lucide-react";
import { useActionState } from "react";
import { updateWorkspaceNameAction, updateWorkspaceSlugAction } from "./actions";

type Props = {
  initialName: string;
  initialSlug: string;
};

const initialState = null;

export function GeneralSettingsClient({ initialName, initialSlug }: Props) {
  const [nameState, nameAction, namePending] = useActionState(updateWorkspaceNameAction, initialState);
  const [slugState, slugAction, slugPending] = useActionState(updateWorkspaceSlugAction, initialState);

  return (
    <>
      <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/70 shadow-xl">
        <form action={nameAction}>
          <SettingsCardHeader>
            <SettingsCardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--color-amber)]" />
              Organization Name
            </SettingsCardTitle>
            <SettingsCardDescription>
              This is your organization's displayed name across the platform.
            </SettingsCardDescription>
          </SettingsCardHeader>
          <SettingsCardContent>
            <div className="grid max-w-6xl gap-2">
              <Label htmlFor="orgName" className="sr-only">
                Name
              </Label>
              <Input
                id="orgName"
                name="name"
                defaultValue={initialName}
                className="h-11 border-[var(--color-border)] bg-[var(--color-ink)]/70 text-[var(--color-bone)] placeholder:text-[var(--color-bone-faint)] focus-visible:ring-[var(--color-amber)]"
                required
              />
              {nameState?.error?.name?.[0] ? (
                <p className="text-sm text-red-300">{nameState.error.name[0]}</p>
              ) : null}
              {nameState?.error?.form?.[0] ? (
                <p className="text-sm text-red-300">{nameState.error.form[0]}</p>
              ) : null}
              {nameState?.ok && nameState.message ? (
                <p className="text-sm text-emerald-300">{nameState.message}</p>
              ) : null}
            </div>
          </SettingsCardContent>
          <SettingsCardFooter className="justify-end">
            <Button
              type="submit"
              disabled={namePending}
              className="rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
            >
              {namePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Name"
              )}
            </Button>
          </SettingsCardFooter>
        </form>
      </SettingsCard>

      <SettingsCard className="rounded-2xl bg-[var(--color-ink-elevated)]/70 shadow-xl">
        <form action={slugAction}>
          <SettingsCardHeader>
            <SettingsCardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[var(--color-amber)]" />
              Organization Slug
            </SettingsCardTitle>
            <SettingsCardDescription>
              Used in URLs to identify your organization. Once changed, old links will break.
            </SettingsCardDescription>
          </SettingsCardHeader>
          <SettingsCardContent>
            <div className="grid max-w-6xl gap-2">
              <Label htmlFor="orgSlug" className="sr-only">
                Slug
              </Label>
              <div className="flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-ink)]/70 shadow-sm focus-within:ring-1 focus-within:ring-[var(--color-amber)]">
                <span className="rounded-l-md border-r border-[var(--color-border)] bg-white/[0.04] px-3 py-2 text-sm text-[var(--color-bone-faint)]">
                  hostfunc.com/
                </span>
                <Input
                  id="orgSlug"
                  name="slug"
                  defaultValue={initialSlug}
                  className="rounded-l-none border-0 bg-transparent text-[var(--color-bone)] shadow-none focus-visible:ring-0"
                  required
                />
              </div>
              {slugState?.error?.slug?.[0] ? (
                <p className="text-sm text-red-300">{slugState.error.slug[0]}</p>
              ) : null}
              {slugState?.error?.form?.[0] ? (
                <p className="text-sm text-red-300">{slugState.error.form[0]}</p>
              ) : null}
              {slugState?.ok && slugState.message ? (
                <p className="text-sm text-emerald-300">{slugState.message}</p>
              ) : null}
            </div>
          </SettingsCardContent>
          <SettingsCardFooter className="justify-end">
            <Button
              type="submit"
              disabled={slugPending}
              variant="outline"
              className="rounded-full border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200"
            >
              {slugPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Slug"
              )}
            </Button>
          </SettingsCardFooter>
        </form>
      </SettingsCard>
    </>
  );
}
