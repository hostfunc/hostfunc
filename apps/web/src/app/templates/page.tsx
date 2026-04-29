import { redirect } from "next/navigation";

export default async function TemplatesRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") search.set(key, value);
    else if (Array.isArray(value)) for (const v of value) search.append(key, v);
  }
  const query = search.toString();
  redirect(query ? `/marketplace?${query}` : "/marketplace");
}
