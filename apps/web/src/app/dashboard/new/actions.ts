"use server";

import { requireOrgPermission } from "@/lib/session";
import { upsertFunctionAsset } from "@/server/fn-assets";
import { createFunction } from "@/server/functions";
import { saveFunctionGithubBinding } from "@/server/github-integrations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { FUNCTION_TEMPLATES, TEMPLATES, TEMPLATE_IDS } from "@/lib/templates";

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
  githubRepoId: z.coerce.number().int().positive().optional(),
  githubBranch: z.string().trim().max(200).optional().default(""),
  githubPathPrefix: z.string().trim().max(500).optional().default(""),
});

// biome-ignore lint/suspicious/noExplicitAny: Standard internal state type
export async function createFunctionAction(_prevState: any, formData: FormData) {
  const { session, orgId } = await requireOrgPermission("create_function");

  const parsed = createSchema.safeParse({
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    templateId: formData.get("templateId") ?? "hello-world",
    githubRepoId: formData.get("githubRepoId") || undefined,
    githubBranch: formData.get("githubBranch") ?? "",
    githubPathPrefix: formData.get("githubPathPrefix") ?? "",
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

  // Attach any files the chosen template ships with (e.g. a served index.html).
  const template = FUNCTION_TEMPLATES.find((entry) => entry.id === parsed.data.templateId);
  for (const asset of template?.assets ?? []) {
    await upsertFunctionAsset({
      fnId,
      path: asset.path,
      mime: asset.mime,
      content: Buffer.from(asset.content, "utf8"),
    });
  }

  if (parsed.data.githubRepoId && parsed.data.githubBranch) {
    await saveFunctionGithubBinding({
      orgId,
      fnId,
      userId: session.user.id,
      repoId: parsed.data.githubRepoId,
      branch: parsed.data.githubBranch,
      pathPrefix: parsed.data.githubPathPrefix || null,
    });
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/${fnId}`);
}
