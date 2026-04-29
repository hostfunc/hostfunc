import { redirect } from "next/navigation";

export default async function TemplateRedirectPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { fn } = await params;
  redirect(`/marketplace/${fn}`);
}
