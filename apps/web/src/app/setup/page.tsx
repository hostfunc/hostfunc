import { getSetupState } from "@/server/setup-state";
import Link from "next/link";

export default async function SetupPage() {
  const state = getSetupState();
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Hostfunc setup</h1>
      <p className="text-sm text-muted-foreground">
        Complete environment bootstrap before using dashboard routes.
      </p>

      <section className="rounded-lg border border-border p-4 space-y-2">
        <h2 className="font-medium">Required environment</h2>
        {state.missing.length === 0 ? (
          <p className="text-sm text-emerald-600">All required environment variables are present.</p>
        ) : (
          <ul className="list-disc ml-5 text-sm space-y-1">
            {state.missing.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        )}
      </section>

      {state.warnings.length > 0 ? (
        <section className="rounded-lg border border-amber-500/40 p-4 space-y-2">
          <h2 className="font-medium">Warnings</h2>
          <ul className="list-disc ml-5 text-sm space-y-1">
            {state.warnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex gap-3">
        <Link href="/dashboard" className="text-sm underline">
          Retry dashboard
        </Link>
      </div>
    </main>
  );
}
