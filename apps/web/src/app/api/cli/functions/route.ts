import { requireCliActor } from "@/server/cli-auth";
import { createFunction, searchFunctionsForOrg } from "@/server/functions";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

const DEFAULT_STARTER = `import fn from "@hostfunc/sdk";

export async function main(input: { name?: string }) {
  const name = input.name?.trim() || "world";
  fn.log("info", "hello.invoked", { name });
  return { message: \`hello, \${name}\`, invokedAt: new Date().toISOString() };
}
`;

export async function GET(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  const query = req.nextUrl.searchParams.get("query") ?? undefined;
  const items = await searchFunctionsForOrg(actor.orgId, query);
  return Response.json({ ok: true, items });
}

/** Creates a function in the actor's org (used by `hostfunc init` and the extension). */
export async function POST(req: NextRequest) {
  const actor = await requireCliActor(req.headers.get("authorization"));
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    slug?: string;
    description?: string;
    starterCode?: string;
    visibility?: "public" | "private";
  } | null;

  const slug = body?.slug?.trim();
  if (!slug || !SLUG_RE.test(slug)) {
    return Response.json({ error: "invalid_slug" }, { status: 400 });
  }

  try {
    const fnId = await createFunction({
      orgId: actor.orgId,
      createdById: actor.userId,
      slug,
      description: body?.description ?? "",
      starterCode: body?.starterCode ?? DEFAULT_STARTER,
      ...(body?.visibility ? { visibility: body.visibility } : {}),
    });
    return Response.json({ ok: true, fnId, slug }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    // Unique-violation on (orgId, slug) surfaces as a Postgres duplicate-key error.
    if (/duplicate|unique/i.test(message)) {
      return Response.json({ error: "slug_taken" }, { status: 409 });
    }
    return Response.json({ error: message }, { status: 400 });
  }
}
