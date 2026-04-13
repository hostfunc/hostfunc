import { FunctionEditor } from "@/components/editor/function-editor";
import { Button } from "@/components/ui/button";
import { requireActiveOrg } from "@/lib/session";
import { getDraft, getFunctionForOrg } from "@/server/functions";
import { Settings } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function FunctionEditorPage({
  params,
}: {
  params: Promise<{ fn: string }>;
}) {
  const { session, orgId } = await requireActiveOrg();
  const { fn: fnId } = await params;

  const fn = await getFunctionForOrg(orgId, fnId);
  if (!fn) notFound();

  const draft = await getDraft(fnId, session.user.id);

  return (
    <div className="-mt-4 flex h-[calc(100dvh-7rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-semibold">{fn.slug}</h1>
          <p className="text-xs text-muted-foreground">{fn.description || "No description"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/${fnId}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border border-border">
        <FunctionEditor fnId={fnId} initialCode={draft?.code ?? ""} />
      </div>
    </div>
  );
}
