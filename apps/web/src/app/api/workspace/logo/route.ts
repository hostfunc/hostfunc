import { requireOrgPermission } from "@/lib/session";
import { deleteLogoObject, logoErrorResponse, uploadWorkspaceLogo } from "@/server/logo-storage";
import { db, schema } from "@hostfunc/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

function revalidateLogoSurfaces(): void {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { orgId } = await requireOrgPermission("manage_workspace_settings");

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

    // Capture the existing logo before overwriting so its object can be cleaned up.
    const current = await db.query.organization.findFirst({
      where: eq(schema.organization.id, orgId),
      columns: { logo: true },
    });

    const publicUrl = await uploadWorkspaceLogo({ orgId, file });

    await db
      .update(schema.organization)
      .set({ logo: publicUrl })
      .where(eq(schema.organization.id, orgId));

    // Best-effort cleanup after the DB write — an orphaned object is acceptable,
    // losing the new logo over a failed delete is not.
    if (current?.logo) {
      await deleteLogoObject(current.logo).catch(() => {});
    }

    revalidateLogoSurfaces();
    return Response.json({ ok: true, logo: publicUrl });
  } catch (error) {
    return logoErrorResponse(error);
  }
}

export async function DELETE(): Promise<Response> {
  try {
    const { orgId } = await requireOrgPermission("manage_workspace_settings");

    const current = await db.query.organization.findFirst({
      where: eq(schema.organization.id, orgId),
      columns: { logo: true },
    });

    await db
      .update(schema.organization)
      .set({ logo: null })
      .where(eq(schema.organization.id, orgId));

    if (current?.logo) {
      await deleteLogoObject(current.logo).catch(() => {});
    }

    revalidateLogoSurfaces();
    return Response.json({ ok: true });
  } catch (error) {
    return logoErrorResponse(error);
  }
}
