import { requireOrgPermission } from "@/lib/session";
import { deleteLogoObject, logoErrorResponse, uploadFunctionLogo } from "@/server/logo-storage";
import { db, schema } from "@hostfunc/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

/** Loads the function's current logo, asserting the active org owns it. */
async function getOwnedFunctionLogo(orgId: string, fnId: string): Promise<string | null> {
  const fn = await db.query.fn.findFirst({
    where: and(eq(schema.fn.id, fnId), eq(schema.fn.orgId, orgId)),
    columns: { logo: true },
  });
  if (!fn) throw new Error("not_found");
  return fn.logo;
}

function revalidateFunctionSurfaces(fnId: string): void {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/functions");
  revalidatePath(`/dashboard/${fnId}`);
  revalidatePath(`/dashboard/${fnId}/settings`);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ fn: string }> },
): Promise<Response> {
  try {
    const { fn: fnId } = await ctx.params;
    const { orgId } = await requireOrgPermission("edit_draft");
    const currentLogo = await getOwnedFunctionLogo(orgId, fnId);

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      return Response.json({ error: "multipart_required" }, { status: 400 });
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return Response.json({ error: "invalid_multipart" }, { status: 400 });
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "file_required" }, { status: 400 });
    }

    const publicUrl = await uploadFunctionLogo({ orgId, fnId, file });

    await db
      .update(schema.fn)
      .set({ logo: publicUrl })
      .where(and(eq(schema.fn.id, fnId), eq(schema.fn.orgId, orgId)));

    // Best-effort cleanup after the DB write.
    if (currentLogo) {
      await deleteLogoObject(currentLogo).catch(() => {});
    }

    revalidateFunctionSurfaces(fnId);
    return Response.json({ ok: true, logo: publicUrl });
  } catch (error) {
    return logoErrorResponse(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ fn: string }> },
): Promise<Response> {
  try {
    const { fn: fnId } = await ctx.params;
    const { orgId } = await requireOrgPermission("edit_draft");
    const currentLogo = await getOwnedFunctionLogo(orgId, fnId);

    await db
      .update(schema.fn)
      .set({ logo: null })
      .where(and(eq(schema.fn.id, fnId), eq(schema.fn.orgId, orgId)));

    if (currentLogo) {
      await deleteLogoObject(currentLogo).catch(() => {});
    }

    revalidateFunctionSurfaces(fnId);
    return Response.json({ ok: true });
  } catch (error) {
    return logoErrorResponse(error);
  }
}
