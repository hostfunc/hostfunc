import { requireActiveOrg } from "@/lib/session";
import { listFunctionAssets } from "@/server/fn-assets";
import { buildRunUrl, getFnRunTarget } from "@/server/fn-run-url";
import { getFunctionForOrg } from "@/server/functions";
import { notFound } from "next/navigation";
import { HostingSettingsClient } from "./hosting-client";

export default async function WebHostingSettingsPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { orgId } = await requireActiveOrg();
  const { fn } = await params;

  const [functionRecord, target, assets] = await Promise.all([
    getFunctionForOrg(orgId, fn),
    getFnRunTarget({ fnId: fn, orgId }),
    listFunctionAssets(fn),
  ]);
  if (!functionRecord || !target) notFound();

  const runUrl = buildRunUrl(target.orgSlug, target.fnSlug);
  const hasIndexHtml = assets.some((a) => a.path === "index.html");
  const faviconPath = assets.find((a) => /^favicon\.(ico|png|svg)$/.test(a.path))?.path ?? null;
  const isDeployed = Boolean(functionRecord.currentVersionId);

  return (
    <HostingSettingsClient
      fnId={fn}
      runUrl={runUrl}
      hasIndexHtml={hasIndexHtml}
      faviconPath={faviconPath}
      isDeployed={isDeployed}
    />
  );
}
