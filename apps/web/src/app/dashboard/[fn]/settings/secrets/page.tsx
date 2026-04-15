import { requireActiveOrg } from "@/lib/session";
import { listSecrets } from "@/app/dashboard/[fn]/actions";
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-[var(--color-bone)]">Environment Variables</h3>
        <p className="text-sm text-[var(--color-bone-muted)]">
          Secrets are encrypted at rest and injected only for this function at execution time.
        </p>
      </div>
      <SecretsClient fnId={fn} initialSecrets={secrets} />
    </div>
  );
}
