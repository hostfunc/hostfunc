"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters").max(64),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  logo: z.string().optional(),
});

// biome-ignore lint/suspicious/noExplicitAny: Standard internal state type
export async function createWorkspaceAction(_prevState: any, formData: FormData) {
  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    logo: formData.get("logo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  // DUMMY IMPLEMENTATION:
  // Normally we would:
  // 1. Check if slug exists in DB
  // 2. Insert new Organization into DB
  // 3. Insert new Member bridging Org and current User
  // 4. Update session activeOrganizationId

  // Simulate network pipeline delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Redirect to dashboard imitating a successful setup
  redirect("/dashboard");
}
