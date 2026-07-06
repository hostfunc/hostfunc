/**
 * End-to-end check for the `neon-postgres-crud` template against a deployed
 * function. Deploy the template, set its NEON_DATABASE_URL secret in the
 * dashboard, then run:
 *
 *   RUN_URL="https://<runtime-host>/run/<org>/<fn>" pnpm --filter @hostfunc/web e2e:db-template
 *
 * Exercises the full CRUD cycle (create → list → update → delete) and fails
 * loudly on any mismatch, so it proves code → bundler → worker → Neon-over-HTTP
 * works end to end.
 */

export {};

interface Note {
  id: number;
  text: string;
}

const runUrl = process.env.RUN_URL;
if (!runUrl) {
  process.stderr.write("Set RUN_URL to the deployed function's public URL.\n");
  process.exit(1);
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(runUrl as string, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`POST ${JSON.stringify(body)} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return JSON.parse(text) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const marker = `e2e-${Date.now()}`;

const created = await call<{ ok: boolean; note?: Note }>({ action: "create", text: marker });
assert(created.ok && created.note, "create returned a note");
const noteId = created.note.id;
process.stdout.write(`✓ created note ${noteId}\n`);

const listed = await call<{ ok: boolean; notes: Note[] }>({ action: "list" });
assert(
  listed.notes.some((note) => note.id === noteId && note.text === marker),
  "created note appears in list",
);
process.stdout.write(`✓ listed ${listed.notes.length} notes, found ${marker}\n`);

const updated = await call<{ ok: boolean; note?: Note }>({
  action: "update",
  id: noteId,
  text: `${marker}-updated`,
});
assert(updated.ok && updated.note?.text === `${marker}-updated`, "update persisted new text");
process.stdout.write("✓ updated note text\n");

const deleted = await call<{ ok: boolean }>({ action: "delete", id: noteId });
assert(deleted.ok, "delete reported success");
const after = await call<{ ok: boolean; notes: Note[] }>({ action: "list" });
assert(!after.notes.some((note) => note.id === noteId), "deleted note no longer appears in list");
process.stdout.write("✓ deleted note\n");

process.stdout.write("\nAll e2e checks passed — Neon CRUD works through the deployed function.\n");
