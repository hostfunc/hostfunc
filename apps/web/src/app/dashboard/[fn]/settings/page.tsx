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
import { use } from "react";

export default function GeneralFunctionSettingsPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { fn } = use(params);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--color-bone)]">General</h3>
        <p className="text-sm text-[var(--color-bone-muted)]">
          Update the general details and visibility of your function.
        </p>
      </div>

      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Function Name</SettingsCardTitle>
          <SettingsCardDescription>
            The human-readable name of your function.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent>
          <div className="grid max-w-sm gap-2">
            <Label htmlFor="fnName" className="sr-only">
              Name
            </Label>
            <Input id="fnName" defaultValue={fn} />
          </div>
        </SettingsCardContent>
        <SettingsCardFooter className="justify-end">
          <Button>Save Name</Button>
        </SettingsCardFooter>
      </SettingsCard>

      <SettingsCard>
        <SettingsCardHeader>
          <SettingsCardTitle>Description</SettingsCardTitle>
          <SettingsCardDescription>
            Provide a short summary of what this function does.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardContent>
          <div className="grid max-w-lg gap-2">
            <Label htmlFor="fnDesc" className="sr-only">
              Description
            </Label>
            <Input id="fnDesc" defaultValue="Handles webhook events from Stripe." />
          </div>
        </SettingsCardContent>
        <SettingsCardFooter className="justify-end">
          <Button>Save Description</Button>
        </SettingsCardFooter>
      </SettingsCard>

      <SettingsCard className="border-red-500/25 bg-red-500/10">
        <SettingsCardHeader>
          <SettingsCardTitle className="text-red-300">
            Danger Zone
          </SettingsCardTitle>
          <SettingsCardDescription className="text-red-300/85">
            Permanently delete this function and all its executions. This cannot be undone.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardFooter className="justify-end border-red-500/30 bg-red-500/15">
          <Button variant="destructive">Delete Function</Button>
        </SettingsCardFooter>
      </SettingsCard>
    </div>
  );
}
