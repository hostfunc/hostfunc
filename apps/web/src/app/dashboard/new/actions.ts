"use server";

import { requireOrgPermission } from "@/lib/session";
import { createFunction } from "@/server/functions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { TEMPLATES, TEMPLATE_IDS } from "@/lib/templates";

const createSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens"),
  description: z.string().max(280).optional().default(""),
  templateId: z
    .string()
    .default("hello-world")
    .refine((templateId) => TEMPLATE_IDS.includes(templateId), "Unknown template"),
});

// biome-ignore lint/suspicious/noExplicitAny: Standard internal state type
export async function createFunctionAction(_prevState: any, formData: FormData) {
  const { session, orgId } = await requireOrgPermission("create_function");

  const parsed = createSchema.safeParse({
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    templateId: formData.get("templateId") ?? "hello-world",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const code = (TEMPLATES[parsed.data.templateId] || TEMPLATES["hello-world"]) ?? "";

  const fnId = await createFunction({
    orgId,
    createdById: session.user.id,
    slug: parsed.data.slug,
    description: parsed.data.description,
    starterCode: code,
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/${fnId}`);
}
