import { requireActiveOrg } from "@/lib/session";
import { listSecrets } from "@/app/dashboard/[fn]/actions";
import { KeyRound } from "lucide-react";
import { SecretsClient } from "./secrets-client";

export default async function SecretsFunctionSettingsPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { fn } = await params;
  await requireActiveOrg();
  const secrets = await listSecrets(fn);

  return (
    <div className="animate-in space-y-10 fade-in duration-500 pb-10">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--color-border)] pb-6 md:flex-row md:items-center">
        <div>
          <h3 className="flex items-center gap-2 font-display text-4xl tracking-tight text-[var(--color-bone)]">
            Environment Variables <KeyRound className="h-6 w-6 text-[var(--color-amber)]" />
          </h3>
          <p className="mt-2 max-w-xl leading-relaxed text-[var(--color-bone-muted)]">
            Secrets are encrypted at rest and injected only for this function at execution time.
          </p>
        </div>
      </div>
      <SecretsClient fnId={fn} initialSecrets={secrets} />
    </div>
  );
}
