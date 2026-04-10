"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsCardTitle,
  SettingsCardDescription,
  SettingsCardContent,
  SettingsCardFooter,
} from "@/components/settings/settings-card";
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
        <h3 className="text-lg font-medium">General</h3>
        <p className="text-sm text-muted-foreground">
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
          <div className="grid gap-2 max-w-sm">
            <Label htmlFor="fnName" className="sr-only">Name</Label>
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
          <div className="grid gap-2 max-w-lg">
            <Label htmlFor="fnDesc" className="sr-only">Description</Label>
            <Input id="fnDesc" defaultValue="Handles webhook events from Stripe." />
          </div>
        </SettingsCardContent>
        <SettingsCardFooter className="justify-end">
          <Button>Save Description</Button>
        </SettingsCardFooter>
      </SettingsCard>

      <SettingsCard className="border-red-500/20 bg-red-500/5 dark:bg-red-500/10 dark:border-red-500/30">
        <SettingsCardHeader>
          <SettingsCardTitle className="text-red-600 dark:text-red-500">Danger Zone</SettingsCardTitle>
          <SettingsCardDescription className="text-red-600/80 dark:text-red-400">
            Permanently delete this function and all its executions. This cannot be undone.
          </SettingsCardDescription>
        </SettingsCardHeader>
        <SettingsCardFooter className="bg-red-500/10 border-red-500/20 justify-end">
          <Button variant="destructive">Delete Function</Button>
        </SettingsCardFooter>
      </SettingsCard>
    </div>
  );
}
